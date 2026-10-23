// الإملاء داخل الصفحة: يحفظ الحقل الذي كان فيه المؤشر عند البدء ويكتب فيه
// النص وهو يصل، ويعرض في الإطار العلوي شريطًا صغيرًا بالوقت ومستوى الصوت.
// يُحقن في كل الإطارات؛ عامل الخدمة يختار الإطار الذي فيه الحقل.

(() => {
  "use strict";

  if (globalThis.__crtlDictLoaded) return;
  globalThis.__crtlDictLoaded = true;

  const TEXT_INPUTS = new Set(["", "text", "search", "url", "email", "tel"]);

  function deepActive() {
    let el = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    return el;
  }

  function isEditable(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    if (el.tagName === "TEXTAREA") return !el.readOnly && !el.disabled;
    if (el.tagName === "INPUT") {
      return TEXT_INPUTS.has((el.getAttribute("type") || "").toLowerCase()) && !el.readOnly && !el.disabled;
    }
    return false;
  }

  globalThis.__crtlDictProbe = () => ({ focused: document.hasFocus(), editable: isEditable(deepActive()) });

  // ===== الكتابة في الحقل =====

  let target = null;
  let isTarget = false;
  // ما لم يُكتب في الحقل (لا حقل، أو رفض الحقل الإدخال) يُنسخ في النهاية.
  let pending = "";

  function insert(piece) {
    const el = target;
    if (!el || !el.isConnected || pending) {
      pending += piece;
      return;
    }
    if (deepActive() !== el) el.focus({ preventScroll: true });
    let ok = false;
    try {
      // execCommand يمر عبر محرر الصفحة نفسه، فيبقى التراجع (Ctrl+Z) يعمل
      // وتعرف تطبيقات مثل Gmail وواتساب ويب أن النص تغيّر.
      ok = document.execCommand("insertText", false, piece);
    } catch (_) {}
    if (!ok && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) {
      try {
        const s = el.selectionStart ?? el.value.length;
        const e = el.selectionEnd ?? s;
        el.setRangeText(piece, s, e, "end");
        el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: piece }));
        ok = true;
      } catch (_) {}
    }
    if (!ok) pending += piece;
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {}
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;inset-block-start:-1000px;opacity:0";
    document.documentElement.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (_) {}
    ta.remove();
    target?.focus?.({ preventScroll: true });
    return ok;
  }

  // ===== الشريط =====

  let ui = null;
  let hideTimer = 0;

  const STYLE = `
    :host { all: initial; }
    .bar {
      position: fixed;
      inset-block-end: 24px;
      inset-inline-start: 50%;
      transform: translateX(50%);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 40px;
      box-sizing: border-box;
      padding-block: 4px;
      padding-inline: 16px 4px;
      border-radius: 8px;
      background: #111827;
      color: #f9fafb;
      font: 14px/1.7 system-ui, "Segoe UI", Tahoma, sans-serif;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
      animation: in 240ms ease-out;
    }
    .bar.notice { padding-inline-end: 16px; }
    @keyframes in { from { opacity: 0; } to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .bar { animation: none; } .fill { transition: none; } }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; flex: none; }
    .bar.busy .dot { background: #9ca3af; }
    .time { font-variant-numeric: tabular-nums; min-width: 4ch; }
    .meter { width: 48px; height: 4px; border-radius: 2px; background: #374151; overflow: hidden; }
    .fill { display: block; height: 100%; background: #f9fafb; transform-origin: right; transform: scaleX(0); transition: transform 100ms linear; }
    button {
      all: unset;
      box-sizing: border-box;
      width: 32px; height: 32px;
      display: grid; place-items: center;
      border-radius: 4px;
      color: #d1d5db;
      cursor: pointer;
      transition: background-color 200ms;
    }
    button:hover { background: #1f2937; color: #f9fafb; }
    button:focus-visible { outline: 2px solid #f9fafb; outline-offset: -2px; }
    svg { width: 18px; height: 18px; }
    [hidden] { display: none !important; }
  `;

  const ICON_STOP =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg>';
  const ICON_CLOSE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function buildUi() {
    const host = document.createElement("crtl-dictation");
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `
      <style>${STYLE}</style>
      <div class="bar" dir="rtl" role="status" aria-live="polite">
        <span class="dot"></span>
        <bdi class="time" dir="ltr">0:00</bdi>
        <span class="meter"><span class="fill"></span></span>
        <span class="msg" hidden></span>
        <button class="stop" type="button" aria-label="إيقاف" title="إيقاف">${ICON_STOP}</button>
        <button class="cancel" type="button" aria-label="إلغاء" title="إلغاء">${ICON_CLOSE}</button>
      </div>`;
    const $ = (s) => root.querySelector(s);
    const parts = {
      host,
      bar: $(".bar"),
      dot: $(".dot"),
      time: $(".time"),
      meter: $(".meter"),
      fill: $(".fill"),
      msg: $(".msg"),
      stop: $(".stop"),
      cancel: $(".cancel"),
    };
    // الضغط على الشريط لا يأخذ المؤشر من الحقل.
    parts.bar.addEventListener("mousedown", (e) => e.preventDefault());
    parts.stop.addEventListener("click", () => chrome.runtime.sendMessage({ type: "crtl-dict-stop" }).catch(() => {}));
    parts.cancel.addEventListener("click", () => {
      if (parts.bar.classList.contains("notice")) hideUi();
      else chrome.runtime.sendMessage({ type: "crtl-dict-cancel" }).catch(() => {});
    });
    return parts;
  }

  function showUi(state, text) {
    clearTimeout(hideTimer);
    if (!ui) ui = buildUi();
    if (!ui.host.isConnected) document.documentElement.appendChild(ui.host);
    const recording = state === "recording";
    const busy = state === "busy";
    const notice = state === "notice";
    ui.bar.classList.toggle("busy", busy);
    ui.bar.classList.toggle("notice", notice);
    ui.dot.hidden = notice;
    ui.time.hidden = !recording;
    ui.meter.hidden = !recording;
    ui.stop.hidden = !recording;
    ui.cancel.hidden = notice;
    ui.msg.hidden = recording;
    ui.msg.textContent = text || "";
    if (recording) {
      ui.time.textContent = "0:00";
      ui.fill.style.transform = "scaleX(0)";
    }
    if (notice) hideTimer = setTimeout(hideUi, 4000);
  }

  function hideUi() {
    clearTimeout(hideTimer);
    ui?.host.remove();
  }

  function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  // Esc أثناء الإملاء يلغيه، ولا يصل إلى الصفحة فيغلق نافذة فيها الحقل.
  let active = false;
  window.addEventListener(
    "keydown",
    (e) => {
      if (!active || e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      chrome.runtime.sendMessage({ type: "crtl-dict-cancel" }).catch(() => {});
    },
    true
  );

  // ===== الرسائل من عامل الخدمة =====

  chrome.runtime.onMessage.addListener((m, _sender, sendResponse) => {
    if (m?.type !== "crtl-dict") return;
    switch (m.op) {
      case "begin":
        active = true;
        if (m.target) {
          isTarget = true;
          const el = deepActive();
          target = isEditable(el) ? el : null;
          pending = "";
        }
        if (m.ui) showUi("recording");
        break;
      case "level":
        if (ui?.host.isConnected && !ui.time.hidden) {
          ui.time.textContent = formatTime(m.elapsed || 0);
          ui.fill.style.transform = `scaleX(${Math.max(0, Math.min(1, m.level || 0))})`;
        }
        break;
      case "busy":
        showUi("busy", "جارٍ الكتابة");
        break;
      case "text":
        if (isTarget) insert(m.piece || "");
        break;
      case "end": {
        active = false;
        // دور الحقل: ما لم يُكتب يُنسخ، والجواب يقول لعامل الخدمة ماذا حدث.
        if (m.target && isTarget) {
          const left = pending;
          isTarget = false;
          target = null;
          pending = "";
          if (!left || m.cancelled) {
            sendResponse({ copied: null });
          } else {
            copy(left).then((ok) => sendResponse({ copied: ok }));
            return true;
          }
          break;
        }
        if (m.ui) {
          if (m.message) showUi("notice", m.message);
          else hideUi();
        }
        break;
      }
    }
  });
})();
