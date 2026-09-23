// أيقونة الإضافة تشغّل إصلاح RTL أو توقفه في التبويب الحالي فقط.
// وقائمة الزر الأيمن على أيقونة الإضافة تتيح تثبيت الإصلاح دائمًا
// على الموقع النشط، فيعمل تلقائيًا في كل مرة تُفتح فيها صفحاته.
// كما تتيح حفظ الصفحة الحالية كما تظهر للمستخدم في ملف PDF بحجم الصفحة.

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
const MENU_PDF = "crtl-save-pdf";
const MENU_PDF_PAGE = "crtl-save-pdf-page";
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

async function hasOriginPermission(pattern) {
  try {
    return await chrome.permissions.contains({ origins: [pattern] });
  } catch (_) {
    return false;
  }
}

// نسجّل سكربت محتوى ديناميكيًا للمواقع الدائمة، فيُحقن مع كل تحميل صفحة
// دون انتظار ضغط المستخدم. نتجاهل أي موقع لم يُمنح إذنه بعد.
// الاستدعاءات تُنفَّذ بالتسلسل: استدعاءان متزامنان (من storage.onChanged
// ومن enableSite مثلًا) كانا يتسابقان على التسجيل ويلغي أحدهما الآخر.
let registrationQueue = Promise.resolve();

function syncRegistration() {
  registrationQueue = registrationQueue.then(doSyncRegistration, doSyncRegistration);
  return registrationQueue;
}

async function doSyncRegistration() {
  let registered = [];
  try {
    registered = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  } catch (_) {}

  const sites = await getSites();
  const allowed = [];
  for (const pattern of sites) {
    if (await hasOriginPermission(pattern)) allowed.push(pattern);
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
    } catch (_) {}
    try {
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

// هل الإصلاح مشغّل في هذا التبويب الآن؟ (false إن لم يكن السكربت محقونًا)
async function getTabState(tabId) {
  try {
    const res = await chrome.tabs.sendMessage(tabId, { type: "crtl-state" });
    return res?.enabled === true;
  } catch (_) {
    return false;
  }
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

// المسار الاحتياطي للمواقع الدائمة: إن لم يُحقن السكربت المسجّل لأي سبب
// (تسجيل ضاع بعد تحديث الإضافة، أو صفحة كانت مفتوحة قبل التثبيت) نحقنه
// نحن مباشرة ما دام إذن الموقع ممنوحًا. إن كان يعمل أصلًا فلا يتغير شيء.
async function ensureAutoOn(tabId, url) {
  if (tabId == null || !url) return false;
  const pattern = patternFromUrl(url);
  if (!pattern) return false;
  const sites = await getSites();
  if (!sites.includes(pattern)) return false;
  if (!(await hasOriginPermission(pattern))) return false;
  await applyToTab(tabId, true);
  return true;
}

// عند تثبيت الإضافة أو تحديثها أو تشغيل المتصفح: شغّل الإصلاح في
// التبويبات المفتوحة فعلًا على مواقع دائمة دون انتظار إعادة تحميلها.
async function applyToOpenTabs() {
  let tabs = [];
  try {
    tabs = await chrome.tabs.query({});
  } catch (_) {
    return;
  }
  for (const tab of tabs) {
    // tab.url لا يصلنا إلا للمواقع التي مُنح إذنها، وهي المطلوبة هنا
    if (!tab?.id || !tab.url) continue;
    try {
      await ensureAutoOn(tab.id, tab.url);
    } catch (_) {}
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

// ===== حفظ الصفحة كملف PDF =====

// نستخدم بروتوكول DevTools عبر chrome.debugger لأنه الطريقة الوحيدة في
// الإضافات لإنتاج PDF متجهي (نص قابل للتحديد) بأبعاد مخصصة. نطبع بوسائط
// "screen" لا "print" حتى تخرج الصفحة كما يراها المستخدم (بما فيها الوضع
// الداكن والخلفيات)، ونجعل حجم الورقة مساويًا لعرض نافذة العرض وطول
// الصفحة الكامل، فتخرج الصفحة كلها في ورقة واحدة بلا هوامش ولا تقسيم.

const PX_PER_INCH = 96;
// أقصى بُعد تقبله معظم قارئات PDF (200 بوصة = 14400 نقطة)
const MAX_PAPER_INCHES = 200;

function cdp(target, method, params = {}) {
  return chrome.debugger.sendCommand(target, method, params);
}

function pdfFilename(title, url, asciiOnly = false) {
  let base = String(title || "").trim();
  if (!base) {
    try {
      base = new URL(url).hostname;
    } catch (_) {}
  }
  if (!base) base = "page";
  if (asciiOnly) base = base.replace(/[^\x20-\x7e]/g, "");
  base = base
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
    .replace(/[. ]+$/, "");
  if (!base) base = "page";
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `${base} ${stamp}.pdf`;
}

async function notifyTab(tabId, text) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (t) => window.alert(t),
      args: [text],
    });
  } catch (_) {
    // صفحة محمية: لا يمكن عرض الرسالة
  }
}

async function renderPdf(tabId) {
  const target = { tabId };
  await chrome.debugger.attach(target, "1.3");
  try {
    await cdp(target, "Emulation.setEmulatedMedia", { media: "screen" });

    const m = await cdp(target, "Page.getLayoutMetrics");
    const content = m.cssContentSize || m.contentSize || {};
    const viewport = m.cssLayoutViewport || m.layoutViewport || {};

    // العرض = عرض نافذة العرض (حتى يبقى التخطيط كما يراه المستخدم)،
    // والطول = طول الصفحة كاملة بما فيه ما يُرى بالتمرير.
    const widthPx = Math.max(1, Math.round(viewport.clientWidth || content.width || 800));
    const heightPx = Math.max(1, Math.round(Math.max(content.height || 0, viewport.clientHeight || 0)));

    // هامش صغير لطول الورقة حتى لا يخرج سطر أخير في ورقة ثانية فارغة
    // بسبب فرق تقريب بين تخطيط الشاشة وتخطيط الطباعة.
    const paperWidth = Math.min(widthPx / PX_PER_INCH, MAX_PAPER_INCHES);
    const paperHeight = Math.min((heightPx + 2) / PX_PER_INCH, MAX_PAPER_INCHES);

    const res = await cdp(target, "Page.printToPDF", {
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: false,
      landscape: false,
      scale: 1,
      paperWidth,
      paperHeight,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
      transferMode: "ReturnAsBase64",
    });
    if (!res?.data) throw new Error("لم يُعِد المتصفح أي بيانات PDF");
    return res.data;
  } finally {
    try {
      await cdp(target, "Emulation.setEmulatedMedia", { media: "" });
    } catch (_) {}
    try {
      await chrome.debugger.detach(target);
    } catch (_) {}
  }
}

const pdfInProgress = new Set();

async function savePageAsPdf(tab) {
  if (!tab?.id) return;
  const tabId = tab.id;
  if (pdfInProgress.has(tabId)) return;
  pdfInProgress.add(tabId);

  const wasOn = await getTabState(tabId);
  try {
    await chrome.action.setBadgeText({ tabId, text: "PDF" });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#2563EB" });
    await chrome.action.setTitle({ tabId, title: "جارٍ إنشاء ملف PDF…" });
  } catch (_) {}

  try {
    const data = await renderPdf(tabId);
    const url = (await resolveTabUrl(tab)) || tab.url || "";
    const dataUrl = "data:application/pdf;base64," + data;
    try {
      await chrome.downloads.download({
        url: dataUrl,
        filename: pdfFilename(tab.title, url),
        conflictAction: "uniquify",
      });
    } catch (err) {
      // بعض الأنظمة ترفض أسماء الملفات غير اللاتينية؛ نعيد المحاولة باسم بسيط
      if (!/filename/i.test(String(err?.message || err))) throw err;
      await chrome.downloads.download({
        url: dataUrl,
        filename: pdfFilename(null, url, true),
        conflictAction: "uniquify",
      });
    }
  } catch (err) {
    const reason = String(err?.message || err || "");
    let msg = "تعذر حفظ الصفحة كملف PDF.";
    if (/chrome:|extension|devtools|Cannot access|Cannot attach/i.test(reason)) {
      msg += "\nهذه الصفحة محمية أو مفتوحة فيها أدوات المطوّر؛ أغلق أدوات المطوّر أو جرّب صفحة أخرى.";
    } else if (reason) {
      msg += "\n" + reason;
    }
    await notifyTab(tabId, msg);
  } finally {
    pdfInProgress.delete(tabId);
    await updateAction(wasOn, tabId);
  }
}

// ===== قائمة الزر الأيمن =====

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
      id: MENU_PDF,
      title: "حفظ الصفحة كملف PDF",
      contexts: ["action"],
    });
    chrome.contextMenus.create({
      id: MENU_MANAGE,
      title: "إدارة المواقع الدائمة…",
      contexts: ["action"],
    });
    // نفس أداة PDF من قائمة الزر الأيمن داخل الصفحة نفسها
    chrome.contextMenus.create({
      id: MENU_PDF_PAGE,
      title: "حفظ الصفحة كملف PDF (بحجم الصفحة)",
      contexts: ["page"],
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
    granted = await hasOriginPermission(pattern);
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
  if (info.menuItemId === MENU_PDF || info.menuItemId === MENU_PDF_PAGE) {
    await savePageAsPdf(tab);
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
  const url = changeInfo.url || tab?.url || null;

  if (changeInfo.status === "loading") {
    const on = url ? await isAlwaysOn(url) : false;
    await updateAction(on, tabId);
    if (tab?.active) await refreshMenuForTab({ ...tab, url });
    return;
  }

  // اكتمل التحميل: تأكد أن الإصلاح يعمل فعلًا على المواقع الدائمة،
  // حتى لو لم يُحقن السكربت المسجّل لأي سبب.
  if (changeInfo.status === "complete") {
    try {
      await ensureAutoOn(tabId, url);
    } catch (_) {}
  }
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

// إن مُنح إذن موقع من صفحة الإعدادات نحدّث التسجيل فورًا
chrome.permissions.onAdded.addListener(async () => {
  await syncRegistration();
  await applyToOpenTabs();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[STORAGE_KEY]) return;
  syncRegistration().then(applyToOpenTabs);
  refreshMenuForActiveTab();
});

chrome.runtime.onInstalled.addListener(() => {
  createMenus();
  updateAction(false);
  syncRegistration().then(applyToOpenTabs);
});

chrome.runtime.onStartup.addListener(() => {
  createMenus();
  updateAction(false);
  syncRegistration().then(applyToOpenTabs);
});
