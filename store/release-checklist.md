# قائمة نشر إصدار جديد على Chrome Web Store

تُتَّبع مع كل تحديث. النصوص الجاهزة للّصق في `store-listing-ar.md`
و`permission-justifications.md`.

## 1. قبل الرفع

- [ ] ارفع رقم `version` في `manifest.json` (المتجر يرفض رقمًا مساويًا أو أقل من المنشور).
- [ ] ادمج التغييرات في `main` وادفعها.
- [ ] ابنِ الحزمة: `./scripts/package.sh` → `release/rtl-toggle-<الإصدار>.zip`.
- [ ] جرّب الحزمة يدويًا: فك الضغط، `chrome://extensions` → تحميل غير مضغوط.

## 2. في لوحة المطوّر (https://chrome.google.com/webstore/devconsole)

1. افتح العنصر → **Package** → **Upload new package** → اختر ملف Zip.
2. **Store listing** → حقل Description: الصق نص `store-listing-ar.md` كاملًا
   (إن تغيّرت المزايا). أضف لقطة شاشة جديدة إن ظهرت واجهة جديدة (مثل قائمة PDF).
3. **Privacy practices**: لكل صلاحية جديدة في `manifest.json` حقل تبرير
   إلزامي؛ النصوص في `permission-justifications.md`. عند إضافة صلاحية جديدة
   يعود حقل **Single purpose** والإقرارات (Data usage) للمراجعة، فأعد تعبئتها.
4. **Submit for review**. أبقِ خيار النشر التلقائي بعد المراجعة مفعّلًا
   إن أردت النشر فور القبول.

## 3. ما يجب توقّعه

- إضافة صلاحية جديدة (كما في 1.5.0: `debugger` و`downloads`) تجعل المراجعة
  أطول من تحديث عادي (عادةً بضعة أيام)، وتُعطَّل الإضافة عند المستخدمين
  الحاليين حتى يوافقوا على الصلاحيات الجديدة من `chrome://extensions`.
- تحذير المستخدم الذي سيظهر لصلاحية `debugger`: «Access the page debugger
  backend»، ولصلاحية `downloads`: «Manage your downloads». هذا متوقع
  ومذكور في التبريرات.
- بعد القبول، أضف وسم Git للإصدار: `git tag v<الإصدار> && git push origin v<الإصدار>`.
