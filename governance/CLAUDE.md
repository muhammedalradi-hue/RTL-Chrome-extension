<!-- master-governance v2.13.4 · managed copy, do not edit here. Change it in github.com/muhammedalradi-hue/master-governance and run scripts/sync.sh (see "Changing a rule" below). -->

# Governance for coding agents

These rules apply to every project connected to `master-governance`. The project's own `CLAUDE.md` adds what is specific to it (stack, conventions, product rules) and wins on those; it never relaxes a rule here.

## Who is who

- **Claude Code** is the primary development agent: it designs, implements, tests and opens the pull request.
- **No review bot.** Gemini Code Assist and Codex were both retired by the owner (2026-10-05). The agent reviews its own diff before merging (see the git workflow), and the owner may comment on any pull request.
- **The owner** (the person you talk to) decides product questions, runs database migrations and approves new rules.

## Git workflow

Every change to a project goes through a pull request, without being asked. `master-governance` is the exception: it holds instructions, not development, so its changes are committed straight to its `main` with no pull request and no review.

1. Work on a branch (the session's designated branch when there is one), push it and open a pull request into `main` (or the branch the project's `CLAUDE.md` names as playing that role, with the owner's dated exception). Never push to that branch directly, and do not keep separate working branches (`demo`, `staging`) unless the owner asks for one in the project's `CLAUDE.md`. The one exception is the first commit of an empty repository.
2. There is no review bot to wait for. Before merging, re-read your own diff as a reviewer would: what would break, what a user would see, whether the text and layout follow the rules below (a text or layout problem is as real as a logic one). Fix what you find first.
3. If the owner or anyone else comments on the pull request, handle every comment before merging: fix it and push, or reply explaining why not, then resolve the thread.
4. Merge with **rebase** (keeps history linear) when the checks are green, every thread is resolved and there is no conflict; when the history holds merge commits that cannot be rebased, use a merge commit. When the project deploys on merge (its `CLAUDE.md` says so), merging is a release: do not merge what you have not run.
5. A change that needs a database migration waits: the owner runs the migration first and confirms, then you merge. Never edit a migration that has been applied; add a new one. A project whose `CLAUDE.md` defines another mechanism (migrations applied automatically on merge, or one cumulative idempotent setup file that is re-run in full) follows that mechanism instead, and the pull request says which migration it carries.

## User-facing text

Most of what the owner complained about in past work was text, not logic. Rules:

- Write the way a careful native speaker writes, in whichever language the product uses. Arabic must read like Arabic written by a person, not translated from English: natural word order, common words, no filler ("يرجى العلم أنه", "قم بـ…" where a plain verb does).
- Short. A label is one to three words. A button says the action ("حفظ", "إرسال الطلب"). A message says what happened or what to do, in one sentence. A hint exists only when the field is genuinely ambiguous, and then it is one short line.
- The interface explains itself. Do not add paragraphs that explain how a screen works. If a screen needs explaining, change the screen.
- **No explanatory or descriptive text in the interface, ever, unless the owner asks for that exact text** (owner, on Wakeb, after a subtitle appeared under a section banner: «طلبت منك أكثر من مرّة لا تضيف نصوص شرح نهائياً لأنها إزعاج»). This covers subtitles and taglines under a title, a sentence describing what a page or section is for, a line under a field repeating its label, a counter repeating what the list shows, and tips. A screen shows only three kinds of text: the **name** of a thing (a title, a label, a button), a **state** read at a glance ("مطلوب", "مكتمل", "متأخرة"), and a **message that changes a decision now** (an error, a refusal, a failure). Before delivering a screen, read every string on it and ask which of the three it is; delete what is none of them, however short or pleasant it looks.
- Same term for the same thing everywhere (one word for "employee", one for "request", one for "balance").
- Every string exists in every supported locale, with the same meaning and the same tone.
- Documents written for the owner (summaries, reports, messages in chat) follow the same rules: plain language, short, the point first.

## Screens

After any change to a screen, before opening the pull request:

- Open it at phone width (~390px), tablet width (~900px) and desktop, in every supported locale and text direction. Take screenshots when you can.
- Nothing cut off: dialogs, drawers, menus and dropdowns fit the viewport; no horizontal scrolling of the page; text is not truncated where it must be read.
- Check the empty state, the loading state and the error state, not only the happy path.
- Forms keep what the user typed when something fails.
- Every password field has an eye button that shows or hides the password: inside the field at the end of the text, hidden by default, a plain button (it never submits the form) named in every locale, and pressing it keeps the focus and what was typed. This covers sign-in, sign-up, reset and change-password forms.
- Look at the screenshots, not the code, and run the design check below.

## Design

A screen that looks generated (the average of every template a model has seen) is a defect, judged like a wrong one, and most of all in a commercial product, where it costs the buyer's trust (owner, 2026-10-22, adopting the rules of `taste-skill`, kept in the master under `skills/design-taste-frontend/`: «القواعد اللي تقول تبين أنها غير مولدة بالذكاء الاصطناعي… مهم طبعا، خصوصا للمنتجات التجارية»). The rules below hold for every screen; the skill holds the details and the measurements. Where the skill and this file differ (text, Arabic, an owner-approved exception), this file wins.

**Never, on any screen:**

- Gradients on grounds, buttons, cards, text or figures; glows; glass and backdrop blur. Use flat colour and opaque surfaces one tone step from the ground.
- An icon in a coloured circle or tinted square on every card or figure. Emoji in labels, menus, greetings or empty states.
- A greeting banner ("مرحباً بعودتك 👋"), an illustrated welcome, a hero header inside an app. An app screen opens with its name as the title.
- A small label or a pill badge ("جديد") above a heading, decorative numbering (01 / 02 / 03), tiny letter-spaced captions.
- A soft shadow under every card. A border or a shadow, never both; real shadows only on what floats (menus, popovers, dialogs).
- More than four hues on a screen, a hue per bar, a sparkline on every figure, a "+12%" pill on every figure.
- A dark or saturated sidebar on a light screen; the brand colour on every button, tab and link.
- Placeholder data on what the owner sees (فلان, "User 1", round vanity numbers, totals that do not add up).
- The default AI palette (violet-indigo gradients, cream with terracotta) when it is not the product's brand. A brand that owns one of these colours keeps it, noted in the project's `CLAUDE.md`.
- Every section in the same layout, everything centred, three of everything (three features, three figures, three steps) when the content has another number.

Removing these is half the work. A screen stripped of them and given nothing in their place is an empty template, which reads as generated too. What fills it is the product: its own data at its real size, its own pictures, an idea taken from what it is and does.

**Type and colour**

- One typeface that covers Arabic and Latin, a second only with one job (figures, code, or the wordmark). Four to six sizes on a screen, far apart (if two look almost the same, make them the same), one size clearly dominant, at most three weights, and not everything bold. In an app the title is 20–32px and no figure reaches 48px.
- Arabic body text at 14px or more with a line height of about 1.7, no Arabic under 12px anywhere; never letter-spacing on Arabic. Headings break where meant (`text-wrap: balance`), never leaving one word alone on the last line.
- One accent colour, under 5% of the screen: on the data and at most one control, not on headings, icons or borders. The ground takes most of the screen. One filled primary button per screen.
- Every text colour, placeholders included, reaches 4.5:1 against its background, in light and dark.
- A status is a pale tint with dark text of the same hue. Red marks only the late or failing thing, once per item; one status mark per row.

**Numbers and tables**

- Tabular figures on every number in a table, a figure or anything that updates; aligned on their right edge in both directions so the digits line up; fixed decimals per measure (money 2, counts 0); one digit style per product (Western or Arabic-Indic), never mixed.
- A real zero is printed ("0", "0.00"); a missing value is a grey dash.
- Table headers in grey at normal weight; no zebra rows, no header band; rules between rows faint or none.
- A short overview list has no paging: a few rows, the total, and «عرض الكل». A full list shows its total and its range.
- Below about 640px a table becomes a list of two-line rows (the name and the main number first); fields move to the second line, never dropped.

**Controls**

- The label above the field, never a placeholder in its place. The controls in one row share one height.
- A disabled control stays readable. A destructive action comes last, in the negative colour, and its confirmation names the thing being deleted.
- One radius family chosen once (tight 4–8px or soft 16–24px), smaller inside than outside. One outline icon set, 16–20px, grey.
- Spacing on a 4px grid; the gap between sections clearly larger than any gap inside one.

**States**

- Loading: the final layout with each value replaced by a flat grey bar at its real size, no shimmer, no shift when the data lands. A refresh keeps the old values on screen.
- Empty: the block keeps its frame and title and says the state in a few words; the first action sits where the data will appear. An empty chart draws its zero line, not a picture.
- Error: inside the block that failed, one sentence and «إعادة المحاولة», never a full-screen banner.

**Text that reads as generated**

The text rules above («User-facing text») hold; these are the habits that give a model away, in Arabic as in English:

- Hollow genre words: «ثوري»، «سلس»، «بكل سهولة»، «حلول متكاملة»، «الجيل القادم»، «ارتقِ بـ…»، «أطلق العنان»، «كل ما تحتاجه في مكان واحد»، "seamless", "unlock", "supercharge". Say the specific thing: the real number, the real noun.
- The correction («ليس مجرد تطبيق، بل…»), the three-beat slogan («سريع. بسيط. آمن.»), «مرحباً بك في…», a question the reader did not ask, a heading that needs a colon.
- Buttons that say nothing («ابدأ الآن»، «اعرف المزيد»). A button names its action or its thing («احجز موعداً»، «حمّل التطبيق»), and the main action keeps one name everywhere.
- Dashes as a habit, decorative separators between words (· / |), "Step 1" labels, a version or year stamp as ornament.
- Invented proof: customer logos, quotes, star ratings, «+10,000 عميل», benchmarks. Use real proof or none. Sample content that must stand in (names, prices, rooms) is plainly sample and listed in the delivery so the owner replaces it.

**Motion**

- It never gives the screen away: not the same fade-up on every block, not a hover lift on every card, no bounce or overshoot, no loop that means nothing (pulsing dots, shimmering or typewriter text, floating shapes).
- Timings: press about 140ms, hover colour about 200ms, menus about 240ms, entrances 500–900ms, exits shorter than entrances. A sequence staggers four steps at most.
- Nothing visible stays hidden for more than 900ms, nothing waits for the scroll above the fold, nothing moves across text being read, and only `transform` and `opacity` animate.
- No preloader, no entry gate, no custom cursor, no captured scroll wheel.
- Under `prefers-reduced-motion` the screen is the finished screen and every loop stops; loops also pause when off screen.

**Public and commercial pages**

A landing page, a store page, a product site: the screens a buyer judges first.

- The first screen says what the thing is and offers the action, at once, with nothing before it.
- The title is a name, what it is, or a claim a competitor could not sign; two lines at most at every width (about five words). The rest goes in one supporting sentence. On such a page the title, the supporting sentence and the claims are the page's content, not help text about the interface: they follow «User-facing text» (short, plain, specific) and the owner approves them in the pull request. The interface parts of the page (forms, menus, buttons) still carry no explanations.
- The page follows its argument, one claim per section with its proof, not the stock order (hero, logos, three features, testimonial, prices, call to action). A section with no claim is deleted.
- The idea comes from the subject: put the nearest competitor's name in the sentence that describes the page; if it still works, the page has no idea yet.
- Real pictures only: the product's own interface built as a real screen, its own photographs, or open-licensed pictures of its world with credit. Never grey bars posing as a dashboard or a fake product shot.
- The phone is a composition of its own, not the desktop shrunk.
- The whole run in the skill applies (direction, idea, words, pictures, screenshots, critique).

**Redesigning an existing product**

1. Record the before: screenshots at every width and the inspector's report, kept for the delivery.
2. Keep the stack, the content, the behaviour and the brand's own assets (logo, name, the colours it owns). No framework or styling migration.
3. Work in this order, most effect for least risk: type, colour (one ground, one ink, one accent), the frame (margins, rhythm, a title on every screen), states, then the stock components (icon tiles, badges, glows, card grids).
4. Prove it: the same screenshots and report after, side by side, and every link, form and menu that worked before still works.
5. Update the brand lines in the project's `CLAUDE.md`. When the redesign replaces a look the owner approved, it waits for the owner's go-ahead before merging.

**Right to left**

- Logical properties only (`inline-start`, `padding-inline`, `inset-inline-end`), never left/right in the styles.
- Arrows, chevrons and progress mirror; logos, media controls, check marks and charts' time axes do not. A horizontal gradient or motion is mirrored explicitly.
- Latin, numbers and mixed runs inside Arabic are isolated (`<bdi>` or `dir="auto"`) so punctuation stays in place.

**The design check, on the screenshots, before the pull request**

1. One second: one thing leads the screen. If the answer is "a page", nothing does.
2. Squint: the screen reduces to two or three masses of clearly different size.
3. Cover the logo: if the screen could belong to another product, it has no idea of its own; take it from the product's data and work.
4. Edges: two or three start and end edges, reused; more means things were placed one at a time.
5. Frame: equal margins, no section with half its width empty by accident, no stretch of nothing taller than half a screen.
6. Five seconds as a stranger: what is this, and what do I do next? On a public page both answers are on the first screen.
7. Read the "never" list, the generated-text list and the motion list against the screen.

When Node 22 and Chromium are available (in a cloud container, see `skills/README.md`), also run the skill's inspector on the changed screen (`node <master clone>/skills/design-taste-frontend/scripts/inspect.mjs`, with `--app` for app screens) and fix what it fails. Its working folder `.taste-skill/` stays out of git. A landing page or a full redesign follows the skill's whole run (direction, idea, screenshots, critique) as well.

**Owner-approved exceptions:** the AI page of `skills/at-design/` (breathing colour halos and its gradient) and the logo build of BP-04. Any other exception is the owner's, dated, in the project's `CLAUDE.md`.

## Speed

A slow page is a defect, judged as seriously as a wrong one (owner, on Wakeb: «المنصة صارت سريعة… كان فيه تحميل عدة أمور غير متوازية… أريد هذا الديدن دائماً في أي عملية تطوير»). For every screen you add or change:

- Independent requests go out together (`Promise.all` or equivalent), never one after another. A screen's load time is its slowest request, not the sum of all of them.
- Fetch only what the screen shows: name the columns, page long lists, and load a heavy field (full text, attachments, large JSON) only when its item is opened.
- Data the user has already seen is shown at once from a cache and refreshed quietly in the background. A spinner is for a first load only; the very first load shows a skeleton of the page.
- Heavy work (AI calls, imports, exports, long reports) runs on the server in the background, with its progress shown. It never blocks the screen or needs the page kept open.
- No query inside a loop over rows (N+1): one query for the set, or a server-side join.
- A click or keystroke answers immediately. Heavy calculations are memoised and kept out of components that re-render on every interaction.
- Code that only some screens need is loaded when those screens open, not in the first bundle.
- Before the pull request, open the changed screen with realistic data (not an empty test account), look at the network panel, and say in the delivery what you measured.

## CI builds

Each change is built once (owner, on Photo Cabinet, after one change built three times: «ليش المشروع يبني ثلاث مرات؟ إذا كان ما له داعي خليه يبني مرة واحدة فقط»). A build costs minutes and runner quota, and a pipeline that repeats work hides which run matters.

- A change that touches no built code (documentation, `CLAUDE.md`, `governance/`) does not build at all: `paths-ignore` in the workflow.
- The pull request builds the change. Merging it does not build the same content again: the merge run reuses what the pull request produced when the merged tree is identical (same tree hash), and builds again only when it differs (the base moved, or the merge changed something).
- A new push to the same branch or pull request cancels the run it makes obsolete (`concurrency` with `cancel-in-progress`).
- One trigger per change: a branch push and its pull request do not both run the same workflow.
- Each session checks the project's own workflows against these four points and fixes what fails, in its own pull request before the task (owner, on Keyboard, 2026-10-23, after a merge into `main` rebuilt the APK the branch had just built: «ليش يبني نفس الإصدار مرتين؟ هذا ما لا داعي»). A rule in the master does nothing until the workflow follows it.

## Security and data

- Never commit secrets. Keys live in environment variables; `.env*` files stay out of git.
- Personal data is masked outside the screens that need it, and every account, money or approval action is written to an append-only audit log.
- Authorization is enforced on the server for every action, whatever the UI shows.
- Destructive database changes (drop, delete, rewrite of applied data) are proposed to the owner with the risk spelled out, never run silently.

## Removing a feature

When the owner asks to delete something from its roots («احذفه من جذوره»), remove it as if it had never existed:

- All of its own code: screens, components, routes, menu entries, server functions and jobs, settings and the controls that edit them, permissions, styles, translation keys, tests, fixtures and mock data.
- Every trace of it in other screens: buttons that open it, filters, columns, badges, labels, counters, exports, search, diagrams, and help text or docs that still describe it as current.
- Then search the whole repository for its names (identifiers, table and column names, translation keys, its label in each language) and remove what is left. An empty search is the check, and the delivery says it was run.
- Stored data and schema (rows already saved, tables, columns) follow the destructive-change rule above: propose the deletion or conversion with the risk spelled out, and do it once the owner approves. Applied migrations and changelog entries are history, not traces: they stay.
- A request to disable something is different: the code stays and is switched off.

## Working with the owner

- Reply in the language the owner writes in. Keep it short: what changed, what you assumed, what they need to do.
- **Every message the owner reads is in the language they wrote their last message in, with no exception** (owner, on 10 KG, after a reply came in English to an Arabic message: «إذا كلمتك بالعربي جاوبني بالعربي»). This covers short progress lines between tools, answers to a screenshot, step-by-step instructions and the final delivery alike. Interface names stay as the screen shows them (`Save`, `SMS OTP Expiry`), but the sentence around them is in the owner's language. Before sending, read the first line of the reply and ask: is this the owner's language?
- Say plainly what was tested and what was not. Never present an untested change as verified.
- When a decision is the owner's (product behaviour, data rules, money, deleting data), ask with a recommendation rather than deciding.
- **Cloud session, local task: stop and say so first** (owner, 2026-10-21, on Marsa, after a Windows desktop app was built and tested only through CI from a cloud session: «لو طلبت منك امر بالسحابة وهو المفروض يكون على الجهاز توقف ونبهني»). The owner usually works in cloud sessions. When a request there needs the owner's own computer (building, running or testing a desktop app on Windows or macOS, the owner's local files or installed programs, devices or connections only that computer has), stop before starting, tell the owner in one line why it belongs on the computer, and let them choose: carry on in the cloud or move it there. Web, server and CI work stays in the cloud as usual.

## Best practices

`best-practices.md` in the master holds solutions built in one project that the owner praised or asked to keep, written so any project can rebuild them. Read it from the master clone you made for the session check.

- **Reuse:** when a task asks for something close to an entry, build it from the entry and say so in the delivery.
- **Suggest:** when a task's context fits an entry the owner did not ask for, propose it in one line with a recommendation. Build it only if they agree.
- **Add:** when the owner asks to add something to the best practices, add it to the master's `best-practices.md` on its `main` (bump `VERSION`, add a line to `CHANGELOG.md`) in the same session, written for any stack: what it is, why, how it works, the checks, and where it lives today. When the owner only praises something, ask in one line whether to add it.
- **Keep every entry current** (owner, 2026-10-14: «أيّ شيء في best practices يتمّ تحديثه في أيّ جلسة لازم يتحدّث في مشروع الحوكمة، وعند فتح مشروع آخر يتضمّن ذلك يتمّ اقتراح التغييرات للمستخدم»). When a session in any project changes how an entry works, or the owner asks there for a variation of it, update the entry in the master in that same session: add the change as a new numbered part of the entry, update the entry's «Implemented in» table for that project, bump `VERSION` and add a line to `CHANGELOG.md`. An entry that exists only in a project's code is not current.
- **Propose on session start.** After the governance check, read `best-practices.md`. For every entry whose «Implemented in» table lists this project, compare the parts the project has with the entry's parts. Propose each missing part to the owner in one line with a recommendation, before starting the task, and build only what they approve. A part the owner declines is marked declined in the table so it is not proposed again.

## Changing a rule

The earlier account-wide master (`MASTER_SPEC.md` and the per-project `GOVERNANCE.md`, legal copy once in `projects-release-hub`) is retired by owner decision (2026-10-03). Delete those files wherever they still exist and remove references to them; the `master-governance` repository is the only master. Before deleting a project's `GOVERNANCE.md`, carry the rules only it holds into the project's `CLAUDE.md`.

Governance has one source of truth: [`github.com/muhammedalradi-hue/master-governance`](https://github.com/muhammedalradi-hue/master-governance). Every connected project carries one managed copy, `governance/CLAUDE.md`, stamped on its first line with the master version it was last updated to. (Before 2.0.0 the copy also included `.gemini/` and the stamp was on the first line of `.gemini/config.yaml`.) The master's `CHANGELOG.md` is the record of every version.

A change to the master stays in the master. It is committed straight to the master's `main` with `VERSION` bumped and a line added to `CHANGELOG.md`, and that is the end of it: no other project is edited and no sync pull requests are opened, whether the change was made in the master directly or came from a project. Each project picks it up in its own next session.

- **Check at the start of every session.** In a connected project, before starting the owner's task, compare the project with the master: clone the master (a shallow clone is enough) and run `<master clone>/scripts/check.sh <project path>` (the scripts live in the master clone, not in the project). It prints `up to date`, or the two versions and the `CHANGELOG.md` entries the project is missing. Check once per session. If the master cannot be reached, say so in one line and carry on.
- **Behind the master: update it first, without asking** (owner's instruction, 2026-10-05: «في كل جلسة لأيّ مشروع… لازم تحدّث الـgovernance حقّه بالبداية»). Before starting the owner's task, run `<master clone>/scripts/sync.sh <project path>` and ship the update alone, separate from the task's work, through the project's normal path (its own pull request, or the branch its `CLAUDE.md` names). Then tell the owner in one or two lines: the old version, the new one, and what changed. Ask first only when a change clashes with the project's own rules or an open pull request already touches the managed files, and say why. Update this project only, never another one.
  - **Coming from before 2.0.0:** `sync.sh` reports a stale `.gemini/`. Move any real rules from the project section of `.gemini/styleguide.md` into the project's `CLAUDE.md`, then delete `.gemini/` in the same update.
- **Upstream sources: tell the owner, propose, never adopt alone** (owner, 2026-10-22: «أي تحديث مستقبلاً لازم تعلمني وتقترح لي»). Some rules come from outside repositories, listed with the commit they were taken at in the master's `upstreams.md` (today: `taste-skill`). After the governance check, run `<master clone>/scripts/upstream.sh`; it changes nothing and prints `up to date` or what each source changed since its «Seen» commit. When a source has moved, tell the owner before the task, in a few lines: what changed, what it would change in our rules or projects, and your recommendation for each part. Then, on the master's `main`, move that source's «Seen» commit in `upstreams.md` and list the parts waiting for an answer, so no other session proposes them again. Adopt only what the owner approves: update the copy and the rules in the master (bump `VERSION`, a line in `CHANGELOG.md`), move the «Pinned» commit, and mark the declined parts there.
- **A problem worth a rule.** When something goes wrong during development and a rule would prevent it next time, do not add the rule on your own. Ask the owner: "This happened; shall I record it as a rule for every project?" Only if they say yes, change it in `master-governance` on its `main`, bump `VERSION`, add a line to `CHANGELOG.md`. Stop there: every project, this one included, updates through its own session check (this one now if the owner asks).
- **Changed in a project first.** If a governance file was edited inside a project (its header says it is managed), port the edit to the master the same way, and stop there too. Never leave the master behind the projects.
- **Project-only rules** go in the project's `CLAUDE.md`, which the sync never touches.
- **Every repository in the owner's account is governed**, whether or not it is already in `projects.md`. A repository not connected yet is connected when the owner agrees (clone the master, run `scripts/sync.sh <project path>`, add it to `projects.md`); an agent that notices one tells the owner. Only a repository the owner has explicitly excluded in `projects.md` stays out.
