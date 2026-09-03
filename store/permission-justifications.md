# Privacy practices — تبريرات الصلاحيات

نصوص جاهزة للّصق في تبويب **Privacy practices** بلوحة تحكم Chrome Web Store.
مكتوبة بالإنجليزية لأن المراجعة تتم بالإنجليزية. كل عنوان هنا يقابل حقلًا هناك.

---

## Single purpose description

RTL Toggle fixes the direction and alignment of Arabic text on web pages that
render it left-to-right, so the text displays correctly right-to-left. This is
the extension's only function.

## Permission: activeTab

Used to apply the RTL fix to the page the user is currently viewing, at the
moment they click the extension's toolbar icon or use its right-click menu. The
extension never touches a tab the user has not explicitly invoked it on, and it
does not read or transmit page content.

## Permission: scripting

The RTL fix is a content script plus a stylesheet that must run inside the page
in order to change text direction and alignment. `scripting` is used to inject
them into the current tab when the user clicks the icon, and to register the
same content script (`registerContentScripts`) for the specific sites the user
has chosen to always enable. Nothing is injected into any other site.

## Permission: contextMenus

Adds a right-click menu on the extension's own toolbar icon, containing two
items: "Always run on this site" — a checkbox that pins the RTL fix to the site
the user is currently on — and "Manage pinned sites", which opens the
extension's options page. This menu is the only interface for the pinned-sites
feature. It is registered on the action icon only and adds nothing to web page
context menus.

## Permission: storage

Stores one thing in `chrome.storage.local`: the list of site match patterns the
user has explicitly pinned (for example `https://example.com/*`). This is needed
so the extension knows which sites to enable automatically after the browser is
restarted, and so the options page can list them for removal. No browsing
history, page content, credentials, or personal data is stored, and nothing is
transmitted off the device.

## Host permissions (optional_host_permissions: `*://*/*`)

The extension requests no host permission at install time. Host access is
optional and requested one site at a time: when the user pins a site via the
right-click menu, the extension calls `chrome.permissions.request()` for that
single origin only, so it can inject the RTL fix automatically on later visits
to that site. Removing the site from the options page revokes that permission
again. The broad `*://*/*` pattern appears only as the optional pool that these
per-site requests are drawn from — it is never granted as a whole.

## Are you using remote code?

**No, I am not using remote code.** All JavaScript and CSS executed by the
extension is included in the uploaded package. Nothing is fetched or evaluated
from a remote source.

## Data usage

The extension does not collect or transmit any user data. Certify all three
statements:

- I do not sell or transfer user data to third parties, outside of the approved
  use cases.
- I do not use or transfer user data for purposes that are unrelated to my
  item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for
  lending purposes.

Source code available for review: https://github.com/muhammedalradi-hue/RTL-Chrome-extension
