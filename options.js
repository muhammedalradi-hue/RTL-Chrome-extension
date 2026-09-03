// إدارة المواقع التي يعمل عليها إصلاح RTL دائمًا.

const STORAGE_KEY = "alwaysOnSites";

const listEl = document.getElementById("sites");
const emptyEl = document.getElementById("empty");
const grantBox = document.getElementById("grant-box");
const grantText = document.getElementById("grant-text");
const grantBtn = document.getElementById("grant-btn");

function hostFromPattern(pattern) {
  return String(pattern).replace(/^https?:\/\//, "").replace(/\/\*$/, "");
}

async function getSites() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const list = data?.[STORAGE_KEY];
  return Array.isArray(list) ? list.filter((p) => typeof p === "string") : [];
}

async function setSites(list) {
  await chrome.storage.local.set({ [STORAGE_KEY]: [...new Set(list)] });
}

async function removeSite(pattern) {
  const sites = (await getSites()).filter((p) => p !== pattern);
  await setSites(sites);
  try {
    await chrome.permissions.remove({ origins: [pattern] });
  } catch (_) {}
  await render();
}

async function render() {
  const sites = await getSites();
  listEl.textContent = "";
  emptyEl.hidden = sites.length > 0;

  for (const pattern of sites) {
    let granted = false;
    try {
      granted = await chrome.permissions.contains({ origins: [pattern] });
    } catch (_) {}

    const li = document.createElement("li");

    const name = document.createElement("span");
    name.className = "site-name";
    name.textContent = hostFromPattern(pattern);
    if (!granted) {
      const warn = document.createElement("span");
      warn.className = "warn";
      warn.textContent = "الإذن غير ممنوح على هذا الجهاز — أعد تثبيت الموقع من قائمة الأيقونة.";
      name.appendChild(warn);
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove";
    btn.textContent = "إزالة";
    btn.addEventListener("click", () => removeSite(pattern));

    li.append(name, btn);
    listEl.appendChild(li);
  }
}

// إن وصلنا من قائمة الأيقونة بطلب إذن لم يُمنح بعد، نعرض زر المنح.
async function setupGrant() {
  const pattern = new URLSearchParams(location.search).get("grant");
  if (!pattern) return;

  let granted = false;
  try {
    granted = await chrome.permissions.contains({ origins: [pattern] });
  } catch (_) {
    return;
  }
  if (granted) return;

  grantText.textContent = `لتشغيل الإصلاح دائمًا على ${hostFromPattern(pattern)} يحتاج المتصفح إلى إذنك بالوصول لهذا الموقع.`;
  grantBox.hidden = false;
  grantBtn.addEventListener("click", async () => {
    let ok = false;
    try {
      ok = await chrome.permissions.request({ origins: [pattern] });
    } catch (_) {}
    if (!ok) return;
    const sites = await getSites();
    sites.push(pattern);
    await setSites(sites);
    grantBox.hidden = true;
    await render();
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORAGE_KEY]) render();
});

setupGrant();
render();
