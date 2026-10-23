@governance/CLAUDE.md

# RTL Toggle (Chrome extension): notes for coding agents

The line above imports the shared governance (git workflow, reviews, user-facing text, screens, security, how rules change). Everything below is specific to this project and must not relax it.

## What this repo is

إضافة Chrome تصلح اتجاه ومحاذاة النصوص العربية في الصفحات التي تعرضها من اليسار إلى اليمين، بنقرة واحدة ودون تحديث الصفحة.

## Stack and deployment

- Chrome extension, Manifest V3, plain JavaScript, no build step and no dependencies.
- `background.js` (service worker): toolbar action and context menu, pinned sites in `chrome.storage`, PDF export through the `debugger` and `downloads` permissions.
- `content.js` + `content.css`: detect Arabic text and apply the RTL fixes on the page.
- `dictate.js`: dictation inside the page (writes into the focused field, shows the recording bar in the top frame).
- `offscreen.html/js` + `recorder-worklet.js`: offscreen document that records the microphone and sends the recording to Gemini (`streamGenerateContent`), ported from the Android keyboard (`muhammedalradi-hue/keyboard`, `Dictation.kt`, `AiClient.kt`, `Recorder.kt`). Keep the prompts identical to the keyboard's.
- `options.html/js/css`: settings (dictation key, language, microphone, shortcut) and pinned sites.
- Deployment: load unpacked from `chrome://extensions` (developer mode) or publish to the Chrome Web Store; bump `version` in `manifest.json` with every release.

## Sources of truth, in priority order

1. `manifest.json`: permissions, entry points and version.
2. `README.md`: features as the user sees them.

## Product rules

- One click fixes Arabic text direction and alignment on the current page without reloading it.
- A pinned site gets the fix automatically on every visit.
- PDF export saves the page as one page matching the viewport width and the full page height, keeping its styles (dark mode included).
- Dictation: the `dictate` command (`Ctrl+Shift+Space` by default) or «إملاء» on an editable field starts recording; the same again stops it, and the text streams into the field. One recording, one request; text only moves forward; a recording with no voice is never sent. Where the field refuses input, the text is copied instead.
- No data collection: everything stays in `chrome.storage.local`; host access is optional and requested only when needed. The one exception is dictation, which sends the recording straight to Google Gemini with the user's own key.
