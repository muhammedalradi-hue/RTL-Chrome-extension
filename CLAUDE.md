@governance/CLAUDE.md

# RTL Toggle (Chrome extension): notes for coding agents

The line above imports the shared governance (git workflow, reviews, user-facing text, screens, security, how rules change). Everything below is specific to this project and must not relax it.

## What this repo is

إضافة Chrome تصلح اتجاه ومحاذاة النصوص العربية في الصفحات التي تعرضها من اليسار إلى اليمين، بنقرة واحدة ودون تحديث الصفحة.

## Stack and deployment

- Chrome extension, Manifest V3, plain JavaScript, no build step and no dependencies.
- `background.js` (service worker): toolbar action and context menu, pinned sites in `chrome.storage`, PDF export through the `debugger` and `downloads` permissions.
- `content.js` + `content.css`: detect Arabic text and apply the RTL fixes on the page.
- `options.html/js/css`: manage pinned sites.
- Deployment: load unpacked from `chrome://extensions` (developer mode) or publish to the Chrome Web Store; bump `version` in `manifest.json` with every release.

## Sources of truth, in priority order

1. `manifest.json`: permissions, entry points and version.
2. `README.md`: features as the user sees them.

## Product rules

- One click fixes Arabic text direction and alignment on the current page without reloading it.
- A pinned site gets the fix automatically on every visit.
- PDF export saves the page as one page matching the viewport width and the full page height, keeping its styles (dark mode included).
- No data collection: everything stays in `chrome.storage.local`; host access is optional and requested only when needed.
