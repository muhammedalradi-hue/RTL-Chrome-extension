<!-- master-governance v1.2.0 · the part above the project-rules markers is a managed copy, do not edit it here. Change it in github.com/muhammedalradi-hue/master-governance and run scripts/sync.sh. -->

# Gemini Code Review Rules

You are the second technical reviewer. Claude Code is the primary development agent.

Focus on finding real problems, not stylistic preferences. Prefer fewer high-quality findings over many low-value comments.

## Priorities

1. Bugs and regressions
2. Security vulnerabilities
3. Authentication and authorization issues
4. Database and data-integrity problems
5. Business-logic and calculation errors (see the project rules below for the domain)
6. User-facing text and screens (the section below)
7. API validation and error handling
8. Mobile responsiveness and RTL/LTR layout
9. Performance problems

## User-facing text and screens

The primary agent is strong on the backend and weak here, so review this part with the same seriousness as logic. These findings count as **MEDIUM** at least, so they are always reported.

Text visible to users (labels, buttons, messages, hints, emails, generated documents):
- Reads like a careful native speaker wrote it. Arabic must not read as translated English: flag unnatural word order, filler phrases ("يرجى العلم", "قم بـ"), and robotic or bureaucratic tone.
- Short and self-explanatory. Flag explanatory paragraphs on screens, hints that repeat the label, and messages longer than a sentence. The interface should explain itself; if it needs a paragraph, say that the screen should change.
- Consistent: the same term for the same thing across the diff and the existing code.
- Present in every supported locale with the same meaning and tone; a key missing from one locale is a bug.

Screens:
- Anything that can be cut off at phone width: dialogs, drawers, menus, dropdowns, tables, long names. Fixed heights and widths, `overflow: hidden` on text, hard-coded left/right in an RTL product.
- Empty, loading and error states exist and make sense.
- Forms do not lose the user's input on a recoverable error.
- A password field without an eye button to show or hide it. The button sits inside the field at the end of the text, the password starts hidden, the button never submits the form, its name exists in every locale, and pressing it keeps the focus and what was typed; flag any of these that is missing.
- Touch targets, focus, keyboard access and contrast on the elements the diff adds.

## Always check

- Whether the change can break existing functionality, including neighbouring modules.
- Frontend and backend authorization independently; flag IDOR and unauthorized access.
- Database migrations: never allow a destructive change without clearly naming the risk.
- Protection of personal and sensitive data.
- Dates, time zones, date ranges and calculations over periods.
- Duplicate submissions and race conditions.
- Input validation, file uploads (type, size, permissions, filename safety).
- SQL injection, XSS, command injection, unsafe file handling, exposed secrets (flag immediately).
- N+1 queries, unnecessary API calls, missing pagination.

Do not suggest refactoring working code without a clear benefit. Avoid cosmetic comments.

## Format of a finding

- Problem
- Impact
- Trigger/scenario
- Recommended fix

## Severity

- CRITICAL = authentication bypass, major security issue or broad data-loss risk
- HIGH = authorization issue, money or data corruption, production-breaking bug
- MEDIUM = meaningful functional, text or UX issue
- LOW = minor issue

<!-- project-rules:start -->
## Project rules: RTL Toggle (Chrome extension)

Project rules live in `CLAUDE.md`. Add here the business rules worth checking in every review.
<!-- project-rules:end -->
