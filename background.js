// أيقونة الإضافة تشغّل إصلاح RTL أو توقفه في التبويب الحالي فقط.

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

async function updateAction(enabled, tabId) {
  const target = tabId == null ? {} : { tabId };
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
}

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

// عند الانتقال إلى صفحة جديدة يعود التبويب إلى حالة الإيقاف.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    updateAction(false, tabId);
  }
});

chrome.runtime.onInstalled.addListener(() => updateAction(false));
chrome.runtime.onStartup.addListener(() => updateAction(false));
