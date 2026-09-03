// أيقونة الإضافة تشغّل إصلاح RTL أو توقفه في التبويب الحالي فقط.
// وقائمة الزر الأيمن على أيقونة الإضافة تتيح تثبيت الإصلاح دائمًا
// على الموقع النشط، فيعمل تلقائيًا في كل مرة تُفتح فيها صفحاته.

const ICONS = {
  on: {
    16: "icons/on-16.png",
    32: "icons/on-32.png",
    48: "icons/on-48.png",
    128: "icons/on-128.png",
  },
  off: {
    16: "icons/off-16.png",
    32: "icons/off-32.png",
    48: "icons/off-48.png",
    128: "icons/off-128.png",
  },
};

const STORAGE_KEY = "alwaysOnSites";
const MENU_ALWAYS = "crtl-always-on-site";
const MENU_MANAGE = "crtl-manage-sites";
const SCRIPT_ID = "crtl-always-on";

// ===== المواقع الدائمة =====

// من عنوان الصفحة إلى نمط مطابقة: https://example.com/*
function patternFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname) return null;
    return `${u.protocol}//${u.hostname}/*`;
  } catch (_) {
    return null;
  }
}

async function getSites() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const list = data?.[STORAGE_KEY];
  return Array.isArray(list) ? list.filter((p) => typeof p === "string") : [];
}

async function setSites(list) {
  await chrome.storage.local.set({ [STORAGE_KEY]: [...new Set(list)] });
}

async function isAlwaysOn(url) {
  const pattern = patternFromUrl(url);
  if (!pattern) return false;
  const sites = await getSites();
  return sites.includes(pattern);
}

// نسجّل سكربت محتوى ديناميكيًا للمواقع الدائمة، فيُحقن مع كل تحميل صفحة
// دون انتظار ضغط المستخدم. نتجاهل أي موقع لم يُمنح إذنه بعد.
async function syncRegistration() {
  let registered = [];
  try {
    registered = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  } catch (_) {}

  const sites = await getSites();
  const allowed = [];
  for (const pattern of sites) {
    try {
      if (await chrome.permissions.contains({ origins: [pattern] })) allowed.push(pattern);
    } catch (_) {}
  }

  if (!allowed.length) {
    if (registered.length) {
      try {
        await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
      } catch (_) {}
    }
    return;
  }

  const script = {
    id: SCRIPT_ID,
    matches: allowed,
    js: ["content.js"],
    css: ["content.css"],
    runAt: "document_idle",
    allFrames: false,
    persistAcrossSessions: true,
  };

  try {
    if (registered.length) await chrome.scripting.updateContentScripts([script]);
    else await chrome.scripting.registerContentScripts([script]);
  } catch (_) {
    // إعادة المحاولة بتسجيل نظيف إن فشل التحديث
    try {
      await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
      await chrome.scripting.registerContentScripts([script]);
    } catch (_) {}
  }
}

// ===== حالة الأيقونة =====

async function updateAction(enabled, tabId) {
  const target = tabId == null ? {} : { tabId };
  try {
    await chrome.action.setIcon({
      ...target,
      path: enabled ? ICONS.on : ICONS.off,
    });
    await chrome.action.setTitle({
      ...target,
      title: enabled ? "إيقاف إصلاح RTL" : "تشغيل إصلاح RTL",
    });
    await chrome.action.setBadgeText({
      ...target,
      text: enabled ? "✓" : "×",
    });
    await chrome.action.setBadgeBackgroundColor({
      ...target,
      color: enabled ? "#16835B" : "#6B7280",
    });
  } catch (_) {
    // التبويب أُغلق أثناء التحديث
  }
}

// ===== التواصل مع الصفحة =====

async function sendToggle(tabId) {
  return chrome.tabs.sendMessage(tabId, { type: "crtl-toggle" });
}

async function injectIntoTab(tabId) {
  await chrome.scripting.insertCSS({
    target: { tabId },
    files: ["content.css"],
  });
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
  });
}

// يفرض حالة محددة (تشغيل/إيقاف) بدل التبديل
async function applyToTab(tabId, on) {
  if (tabId == null) return;
  try {
    const res = await chrome.tabs.sendMessage(tabId, { type: "crtl-set", enabled: on });
    if (typeof res?.enabled !== "boolean") throw new Error("لا استجابة");
    await updateAction(res.enabled, tabId);
    return;
  } catch (_) {}

  if (!on) {
    await updateAction(false, tabId);
    return;
  }

  try {
    await injectIntoTab(tabId);
    const res = await chrome.tabs.sendMessage(tabId, { type: "crtl-set", enabled: true });
    await updateAction(res?.enabled === true, tabId);
  } catch (_) {
    await updateAction(false, tabId);
  }
}

// عنوان التبويب: قد لا يرسله Chrome في كائن tab قبل منح الإذن،
// لذلك نجرّب أكثر من طريق قبل الاستسلام.
async function resolveTabUrl(tab) {
  if (tab?.url) return tab.url;
  if (tab?.id == null) return null;
  try {
    const fresh = await chrome.tabs.get(tab.id);
    if (fresh?.url) return fresh.url;
  } catch (_) {}
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => location.href,
    });
    if (res?.result) return res.result;
  } catch (_) {}
  return null;
}

// ===== قائمة الزر الأيمن على أيقونة الإضافة =====

function createMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ALWAYS,
      title: "تشغيل دائمًا على هذا الموقع",
      type: "checkbox",
      checked: false,
      contexts: ["action"],
    });
    chrome.contextMenus.create({
      id: MENU_MANAGE,
      title: "إدارة المواقع الدائمة…",
      contexts: ["action"],
    });
  });
}

async function refreshMenuForTab(tab) {
  let checked = false;
  if (tab?.url) checked = await isAlwaysOn(tab.url);
  try {
    await chrome.contextMenus.update(MENU_ALWAYS, { checked });
  } catch (_) {}
}

async function refreshMenuForActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    await refreshMenuForTab(tab);
  } catch (_) {}
}

function openGrantPage(pattern) {
  const url = chrome.runtime.getURL(`options.html?grant=${encodeURIComponent(pattern)}`);
  chrome.tabs.create({ url });
}

async function enableSite(pattern, tab) {
  let granted = false;
  try {
    granted = await chrome.permissions.request({ origins: [pattern] });
  } catch (_) {
    // بعض إصدارات Chrome لا تسمح بطلب الإذن من عامل الخدمة مباشرة
    try {
      granted = await chrome.permissions.contains({ origins: [pattern] });
    } catch (_) {}
  }

  if (!granted) {
    try {
      await chrome.contextMenus.update(MENU_ALWAYS, { checked: false });
    } catch (_) {}
    openGrantPage(pattern);
    return;
  }

  const sites = await getSites();
  sites.push(pattern);
  await setSites(sites);
  await syncRegistration();
  await applyToTab(tab?.id, true);
}

async function disableSite(pattern, tab) {
  const sites = (await getSites()).filter((p) => p !== pattern);
  await setSites(sites);
  await syncRegistration();
  try {
    await chrome.permissions.remove({ origins: [pattern] });
  } catch (_) {}
  await applyToTab(tab?.id, false);
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU_MANAGE) {
    chrome.runtime.openOptionsPage();
    return;
  }
  if (info.menuItemId !== MENU_ALWAYS) return;

  const url = info.pageUrl || (await resolveTabUrl(tab));
  const pattern = patternFromUrl(url);
  if (!pattern) {
    // صفحات محمية مثل chrome:// أو متجر الإضافات
    try {
      await chrome.contextMenus.update(MENU_ALWAYS, { checked: false });
    } catch (_) {}
    return;
  }

  if (info.checked) await enableSite(pattern, tab);
  else await disableSite(pattern, tab);
});

// ===== الضغط على الأيقونة =====

chrome.action.onClicked.addListener(async (tab) => {
  // لا نعتمد على tab.url؛ قد لا يرسله Chrome قبل منح activeTab بالكامل.
  // نحاول الحقن مباشرة، وسترفضه فقط الصفحات المحمية مثل chrome:// والمتجر.
  if (!tab?.id) return;

  let result;
  try {
    result = await sendToggle(tab.id);
    if (typeof result?.enabled !== "boolean") {
      throw new Error("لم تصل استجابة صالحة من الصفحة");
    }
  } catch (_) {
    try {
      await injectIntoTab(tab.id);
      result = await sendToggle(tab.id);
      if (typeof result?.enabled !== "boolean") {
        throw new Error("تعذر تشغيل الإضافة في الصفحة");
      }
    } catch (_) {
      await updateAction(false, tab.id);
      return;
    }
  }

  await updateAction(result?.enabled === true, tab.id);
});

// ===== رسائل سكربت المحتوى =====

// يسأل سكربت المحتوى عند تحميله: هل هذا الموقع من المواقع الدائمة؟
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "crtl-hello") return;
  (async () => {
    const url = sender?.tab?.url || message.url || null;
    const auto = url ? await isAlwaysOn(url) : false;
    if (auto && sender?.tab?.id != null) await updateAction(true, sender.tab.id);
    sendResponse({ autoStart: auto });
  })();
  return true; // الاستجابة غير متزامنة
});

// ===== متابعة حالة التبويبات =====

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "loading") return;
  const url = changeInfo.url || tab?.url || null;
  const on = url ? await isAlwaysOn(url) : false;
  await updateAction(on, tabId);
  if (tab?.active) await refreshMenuForTab({ ...tab, url });
});

chrome.tabs.onActivated.addListener(() => refreshMenuForActiveTab());
chrome.windows?.onFocusChanged?.addListener(() => refreshMenuForActiveTab());

// إن سحب المستخدم الإذن من إعدادات Chrome نُسقط الموقع من القائمة
chrome.permissions.onRemoved.addListener(async (permissions) => {
  const removed = permissions?.origins || [];
  if (!removed.length) return;
  const sites = await getSites();
  const kept = sites.filter((p) => !removed.includes(p));
  if (kept.length !== sites.length) await setSites(kept);
  await syncRegistration();
  await refreshMenuForActiveTab();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[STORAGE_KEY]) return;
  syncRegistration();
  refreshMenuForActiveTab();
});

chrome.runtime.onInstalled.addListener(() => {
  createMenus();
  syncRegistration();
  updateAction(false);
});

chrome.runtime.onStartup.addListener(() => {
  createMenus();
  syncRegistration();
  updateAction(false);
});
