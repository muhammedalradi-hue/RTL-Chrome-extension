<!-- master-governance v1.3.0 · managed copy, do not edit here. Change it in github.com/muhammedalradi-hue/master-governance and run scripts/sync.sh (see "Changing a rule" below). -->

# Governance for coding agents

These rules apply to every project connected to `master-governance`. The project's own `CLAUDE.md` adds what is specific to it (stack, conventions, product rules) and wins on those; it never relaxes a rule here.

## Who is who

- **Claude Code** is the primary development agent: it designs, implements, tests and opens the pull request.
- **Gemini Code Assist** is the second reviewer, with a particular eye on the user-facing side: screens, user-visible text and documents. It runs on every pull request (`.gemini/`). **Codex** may review too.
- **The owner** (the person you talk to) decides product questions, runs database migrations and approves new rules.

## Git workflow

Every change goes through a pull request, without being asked:

1. Work on a branch (the session's designated branch when there is one), push it and open a pull request into `main` (or the branch the project's `CLAUDE.md` names as playing that role, with the owner's dated exception). Never push to that branch directly, and do not keep separate working branches (`demo`, `staging`) unless the owner asks for one in the project's `CLAUDE.md`. The one exception is the first commit of an empty repository. Gemini sees only pull requests, so this is what makes it review everything.
2. Reviews start on their own when the pull request opens. After a substantial follow-up push, comment `/gemini review` to get a fresh one.
3. Handle every finding from Gemini or Codex before merging: fix it and push, or reply explaining why not. Then resolve the thread. A finding about user-facing text or layout is as real as one about logic. Fix a finding when it arrives, without waiting to be asked.
   - **No review arrived** (Gemini's daily quota ran out, a reviewer did not run, or nothing came back): tell the owner and let them decide whether to wait for the review or go ahead without it. Never merge an unreviewed pull request on your own.
   - **The owner let it through without review:** that pull request is not reviewed later. The next review covers only the new features asked for after it, unless the owner explicitly asks for the skipped part to be reviewed too.
4. Merge with **rebase** (keeps history linear) only when the checks are green, every thread is resolved and there is no conflict. When the project deploys on merge (its `CLAUDE.md` says so), merging is a release: do not merge what you have not run.
5. A change that needs a database migration waits: the owner runs the migration first and confirms, then you merge. Never edit a migration that has been applied; add a new one. A project whose `CLAUDE.md` defines another mechanism (migrations applied automatically on merge, or one cumulative idempotent setup file that is re-run in full) follows that mechanism instead, and the pull request says which migration it carries.

## User-facing text

Most of what the owner complained about in past work was text, not logic. Rules:

- Write the way a careful native speaker writes, in whichever language the product uses. Arabic must read like Arabic written by a person, not translated from English: natural word order, common words, no filler ("يرجى العلم أنه", "قم بـ…" where a plain verb does).
- Short. A label is one to three words. A button says the action ("حفظ", "إرسال الطلب"). A message says what happened or what to do, in one sentence. A hint exists only when the field is genuinely ambiguous, and then it is one short line.
- The interface explains itself. Do not add paragraphs that explain how a screen works. If a screen needs explaining, change the screen.
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

## Security and data

- Never commit secrets. Keys live in environment variables; `.env*` files stay out of git.
- Personal data is masked outside the screens that need it, and every account, money or approval action is written to an append-only audit log.
- Authorization is enforced on the server for every action, whatever the UI shows.
- Destructive database changes (drop, delete, rewrite of applied data) are proposed to the owner with the risk spelled out, never run silently.

## Working with the owner

- Reply in the language the owner writes in. Keep it short: what changed, what you assumed, what they need to do.
- Say plainly what was tested and what was not. Never present an untested change as verified.
- When a decision is the owner's (product behaviour, data rules, money, deleting data), ask with a recommendation rather than deciding.

## Changing a rule

The earlier account-wide master (`MASTER_SPEC.md` and the per-project `GOVERNANCE.md`, legal copy once in `projects-release-hub`) is retired by owner decision (2026-10-03). Delete those files wherever they still exist and remove references to them; the `master-governance` repository is the only master. Before deleting a project's `GOVERNANCE.md`, carry the rules only it holds into the project's `CLAUDE.md` and the project section of `.gemini/styleguide.md`.

Governance has one source of truth: [`github.com/muhammedalradi-hue/master-governance`](https://github.com/muhammedalradi-hue/master-governance). Every connected project carries a copy (`governance/CLAUDE.md`, `.gemini/config.yaml`, the generic part of `.gemini/styleguide.md`) stamped with the master version.

- **A problem worth a rule.** When something goes wrong during development and a rule would prevent it next time, do not add the rule on your own. Ask the owner: "This happened; shall I record it as a rule for every project?" Only if they say yes:
  1. Change it in `master-governance` through a pull request there, bump `VERSION`, add a line to `CHANGELOG.md`.
  2. Run `scripts/sync.sh` on every project in `projects.md` and open a pull request in each.
- **Changed in a project first.** If a governance file was edited inside a project (its header says it is managed), port the edit to the master the same way, then sync the other projects. Never leave the master behind the projects.
- **Project-only rules** go in the project's `CLAUDE.md` or in the project section of its `.gemini/styleguide.md` (between the `project-rules` markers). The sync keeps that section as it is.
- **Every repository in the owner's account is governed**, whether or not it is already in `projects.md`. A repository missing from the list is connected at the next sync (clone the master, run `scripts/sync.sh <project path>`, add it to `projects.md`), never skipped. Only a repository the owner has explicitly excluded in `projects.md` stays out.
- **A master change is finished only when every project has its sync pull request**, opened in the same session, before the change is reported as done. Publishing the master and syncing one project is a breach (see `incidents.md`).
