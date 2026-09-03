// RTL Toggle — content.js
// المنطق: لا افتراضات عن بنية صفحة Claude إطلاقًا.
// نمشي على عقد النص نفسها: أي عقدة نص فيها حرف عربي واحد => نجبر أقرب
// حاوية مناسبة لها على RTL كامل، بغض النظر عن الكلمة الأولى أو نسبة الإنجليزي.
// يعمل على claude.ai و Claude Code على الويب (نفس الأسلوب لأنه عام).

(() => {
  "use strict";

  // يمنع إنشاء أكثر من مراقب عند حقن الملف في الصفحة المفتوحة يدويًا.
  if (globalThis.__crtlLoaded) return;
  globalThis.__crtlLoaded = true;

  // نطاقات يونيكود العربية (شاملة الأشكال الممتدة والتشكيل)
  const AR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  const MARK = "crtl-rtl"; // حاوية كتلية
  const MARK_INLINE = "crtl-rtl-inline"; // عنصر داخل flex/grid
  const OWN_DIR = "data-crtl-owned-dir";

  // وسوم سطرية نتخطاها صعودًا للوصول للحاوية الكتلية
  const INLINE_TAGS = new Set([
    "SPAN", "A", "STRONG", "EM", "B", "I", "U", "S", "SMALL",
    "MARK", "ABBR", "TIME", "SUP", "SUB", "BDI", "BDO", "WBR",
  ]);

  // لا نلمس هذه أبدًا
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "PRE", "CODE", "KBD", "SAMP", "TEXTAREA", "SVG"]);

  function insideSkipped(el) {
    for (let e = el; e; e = e.parentElement) {
      if (SKIP_TAGS.has(e.tagName)) return true;
    }
    return false;
  }

  // من عقدة نص عربية: اصعد فوق الوسوم السطرية لأقرب حاوية كتلية وعلّمها
  function markFromTextNode(tn) {
    const parent = tn.parentElement;
    if (!parent || insideSkipped(parent)) return;
    // مربع الكتابة يُعالج من جذره في fixComposer وليس هنا
    if (parent.closest('[contenteditable="true"]')) return;

    let el = parent;
    let lastInline = null;
    while (el && INLINE_TAGS.has(el.tagName)) {
      lastInline = el;
      el = el.parentElement;
    }
    if (!el || el === document.body || el === document.documentElement) {
      el = lastInline || parent;
    }

    if (el.classList.contains(MARK) || el.classList.contains(MARK_INLINE)) return;

    // إذا كانت الحاوية flex/grid فقلبها يكسر ترتيب عناصر الواجهة
    // (أزرار الخيارات مثلًا) — نعلّم العنصر الأقرب للنص بدلًا منها
    let disp = "";
    try {
      disp = getComputedStyle(el).display || "";
    } catch (_) {}

    if (disp.includes("flex") || disp.includes("grid")) {
      const target = lastInline || parent;
      if (target && target !== el) {
        target.classList.add(MARK_INLINE);
        if (!target.hasAttribute("dir")) target.setAttribute(OWN_DIR, "");
        target.setAttribute("dir", "rtl");
      } else {
        // العنصر نفسه هو flex ويحمل النص مباشرة: نكتفي بالاتجاه دون قلب المحاور
        el.classList.add(MARK_INLINE);
        if (!el.hasAttribute("dir")) el.setAttribute(OWN_DIR, "");
        el.setAttribute("dir", "rtl");
      }
    } else {
      el.classList.add(MARK);
      if (!el.hasAttribute("dir")) el.setAttribute(OWN_DIR, "");
      el.setAttribute("dir", "rtl");
    }
  }

  // امشِ على كل عقد النص داخل الجذر
  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      if (AR_RE.test(root.nodeValue)) markFromTextNode(root);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.nodeType === 1 && insideSkipped(root)) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        AR_RE.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    let n;
    while ((n = walker.nextNode())) markFromTextNode(n);

    fixListContainers(root);
  }

  // القوائم: إذا صار فيها عنصر RTL نقلب مسافة القائمة نفسها لليمين
  function fixListContainers(root) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll("ul, ol").forEach((list) => {
      if (list.querySelector(":scope > li." + MARK)) {
        list.classList.add(MARK);
        if (!list.hasAttribute("dir")) list.setAttribute(OWN_DIR, "");
        list.setAttribute("dir", "rtl");
      }
    });

    // لا نقلب اتجاه الجدول نفسه لأن ذلك يعكس ترتيب الأعمدة.
    // نعالج النص العربي داخل th/td فقط عبر المسح العام لعقد النص.
    root.querySelectorAll("table." + MARK).forEach((table) => {
      table.classList.remove(MARK, MARK_INLINE);
      if (table.hasAttribute(OWN_DIR)) {
        table.removeAttribute("dir");
        table.removeAttribute(OWN_DIR);
      }
    });
  }

  // النص تغيّر (بث حرفًا بحرف أو تعديل): أزل العلامة إن لم يبقَ عربي
  function recheckMarked(el) {
    const marked = el.closest("." + MARK + ", ." + MARK_INLINE);
    if (marked && !AR_RE.test(marked.textContent)) {
      marked.classList.remove(MARK, MARK_INLINE);
      if (marked.hasAttribute(OWN_DIR)) {
        marked.removeAttribute("dir");
        marked.removeAttribute(OWN_DIR);
      }
    }
  }

  // ===== مربع الكتابة =====
  // ProseMirror يعيد بناء الفقرات الداخلية باستمرار ويمسح أي dir نضيفه
  // عليها، لذلك نضبط الاتجاه على جذر المحرر نفسه — الموقع لا يعيد إنشاءه.
  function fixComposer() {
    document.querySelectorAll('[contenteditable="true"]').forEach((editor) => {
      const hasAr = AR_RE.test(editor.textContent);
      if (hasAr) {
        if (editor.getAttribute("dir") !== "rtl") {
          if (!editor.hasAttribute("dir")) editor.setAttribute(OWN_DIR, "");
          editor.setAttribute("dir", "rtl");
        }
      } else if (editor.getAttribute("dir") === "rtl" && editor.hasAttribute(OWN_DIR)) {
        editor.removeAttribute("dir");
        editor.removeAttribute(OWN_DIR);
      }
    });

    document.querySelectorAll("textarea").forEach((ta) => {
      if (AR_RE.test(ta.value)) {
        ta.classList.add(MARK);
        if (!ta.hasAttribute("dir")) ta.setAttribute(OWN_DIR, "");
        ta.setAttribute("dir", "rtl");
      } else if (ta.classList.contains(MARK)) {
        ta.classList.remove(MARK);
        if (ta.hasAttribute(OWN_DIR)) {
          ta.removeAttribute("dir");
          ta.removeAttribute(OWN_DIR);
        }
      }
    });
  }

  // ===== المراقبة مع تجميع الدفعات =====
  let scheduled = false;
  const pendingScan = new Set();
  const pendingRecheck = new Set();

  function flush() {
    if (!enabled) return;
    scheduled = false;
    const scans = [...pendingScan];
    const rechecks = [...pendingRecheck];
    pendingScan.clear();
    pendingRecheck.clear();
    rechecks.forEach(recheckMarked);
    scans.forEach(scan);
    fixComposer();
  }

  function schedule() {
    if (enabled && !scheduled) {
      scheduled = true;
      requestAnimationFrame(flush);
    }
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "characterData") {
        const p = m.target.parentElement;
        if (p) {
          pendingScan.add(p);
          pendingRecheck.add(p);
        }
      } else if (m.type === "childList") {
        m.addedNodes.forEach((n) => pendingScan.add(n));
      }
    }
    schedule();
  });

  let enabled = false;
  let started = false;

  function handleInput() {
    pendingScan.add(document.body);
    schedule();
  }

  function start() {
    if (!document.body || started) return;
    enabled = true;
    started = true;
    scan(document.body);
    fixComposer();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    document.addEventListener("input", handleInput, true);
  }

  function stop() {
    enabled = false;
    if (started) {
      observer.disconnect();
      document.removeEventListener("input", handleInput, true);
      started = false;
    }
    scheduled = false;
    pendingScan.clear();
    pendingRecheck.clear();

    document
      .querySelectorAll("." + MARK + ", ." + MARK_INLINE + ", [" + OWN_DIR + "]")
      .forEach((el) => {
        el.classList.remove(MARK, MARK_INLINE);
        if (el.hasAttribute(OWN_DIR)) {
          el.removeAttribute("dir");
          el.removeAttribute(OWN_DIR);
        }
      });
  }

  // لا يعمل الإصلاح تلقائيًا؛ لا يبدأ إلا عند ضغط المستخدم على الأيقونة.
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "crtl-toggle") return;
    if (enabled) stop();
    else start();
    sendResponse({ enabled });
  });

  // يبقى متوقفًا عند حقنه للمرة الأولى، ثم تشغّله رسالة crtl-toggle.
})();
