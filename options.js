// إعدادات الإضافة: الإملاء، والمواقع التي يعمل عليها إصلاح RTL دائمًا.

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

// ===== الإملاء =====

const DICT_KEY = "dictKey";
const DICT_LANG = "dictLang";

const keyInput = document.getElementById("dict-key");
const eyeBtn = document.getElementById("dict-key-eye");
const langSelect = document.getElementById("dict-lang");
const micState = document.getElementById("mic-state");
const micBtn = document.getElementById("mic-btn");
const micDenied = document.getElementById("mic-denied");
const shortcutEl = document.getElementById("shortcut");
const shortcutBtn = document.getElementById("shortcut-btn");

async function setupDictation() {
  const data = await chrome.storage.local.get([DICT_KEY, DICT_LANG]);
  keyInput.value = data[DICT_KEY] || "";
  langSelect.value = data[DICT_LANG] === "en" ? "en" : "ar";
  if (!keyInput.value && location.hash === "#dictation") keyInput.focus();
}

let keyTimer = 0;
keyInput.addEventListener("input", () => {
  clearTimeout(keyTimer);
  keyTimer = setTimeout(() => chrome.storage.local.set({ [DICT_KEY]: keyInput.value.trim() }), 300);
});

// زر العين لا يأخذ المؤشر من الحقل ولا يغيّر ما كُتب فيه.
eyeBtn.addEventListener("mousedown", (e) => e.preventDefault());
eyeBtn.addEventListener("click", () => {
  const show = keyInput.type === "password";
  keyInput.type = show ? "text" : "password";
  const label = show ? "إخفاء المفتاح" : "إظهار المفتاح";
  eyeBtn.setAttribute("aria-label", label);
  eyeBtn.title = label;
  eyeBtn.querySelector(".eye-show").hidden = show;
  eyeBtn.querySelector(".eye-hide").hidden = !show;
});

langSelect.addEventListener("change", () => chrome.storage.local.set({ [DICT_LANG]: langSelect.value }));

// إذن الميكروفون يُمنح لأصل الإضافة كله، ولا يظهر طلبه إلا في صفحة ظاهرة
// كهذه؛ المستند الخفي الذي يسجّل يستعمله بعد ذلك.
function showMic(state) {
  micState.textContent = state === "granted" ? "مسموح" : state === "denied" ? "محظور" : "";
  micBtn.hidden = state !== "prompt";
  micDenied.hidden = state !== "denied";
}

async function setupMic() {
  try {
    const status = await navigator.permissions.query({ name: "microphone" });
    showMic(status.state);
    status.onchange = () => showMic(status.state);
  } catch (_) {
    showMic("prompt");
  }
}

micBtn.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const t of stream.getTracks()) t.stop();
    showMic("granted");
  } catch (_) {
    setupMic();
  }
});

async function setupShortcut() {
  let shortcut = "";
  try {
    const commands = await chrome.commands.getAll();
    shortcut = commands.find((c) => c.name === "dictate")?.shortcut || "";
  } catch (_) {}
  shortcutEl.textContent = shortcut || "غير محدد";
}

shortcutBtn.addEventListener("click", () => chrome.tabs.create({ url: "chrome://extensions/shortcuts" }));
// يعود المستخدم من صفحة الاختصارات إلى هذه الصفحة.
window.addEventListener("focus", setupShortcut);

setupDictation();
setupMic();
setupShortcut();
