---
name: project-docs
description: Set up or repair a project's working docs - a lean CLAUDE.md, PRODUCT.md, a decision log with ADRs, a glossary, and a backlog - by interviewing the user first, then writing only the docs the project needs. Use when starting a new repo, when the user asks to "set up the docs", create CLAUDE.md, write a PRD or product brief, start a decision log or an ADR folder, or when an existing CLAUDE.md is bloated or stale. Not for making or writing up a specific architecture decision (use architecture-decisions).
---

# Project docs

Docs exist so a fresh session, or a new teammate, makes the same decisions you would. Every line has to earn its place. A doc nobody reads is worse than none, because it goes stale and starts to mislead.

## 1. Look first

Read what already exists: `README*`, `CLAUDE.md`, `AGENTS.md`, `docs/`, `CONTRIBUTING.md`, the package manifest, the CI config and the last 20 commits. Don't duplicate what the code or the tooling already records.

## 2. Interview

If the `grilling` skill is available, use it. Otherwise ask the questions yourself, a few at a time, and wait for the answers:

- **Problem and user.** Who is this for, what pain does it remove, and how will you know it worked (one measurable signal)?
- **Non-goals.** What will this deliberately not do?
- **Constraints.** Deadline, budget, platforms (Windows and PowerShell?), hosting, compliance.
- **Non-negotiables.** The rules a session must never break: security, data, scope, style.
- **Decisions already made.** Stack, hosting, data model, and why each one.
- **Commands.** How to install, run, test, lint, deploy, and which commands cost money or touch production.

Push back on vague answers. "Fast" isn't a requirement. "p95 under 300 ms on the list endpoint" is. If the problem, user or success metric is still fuzzy, run `product-lens` first and write its result into `PRODUCT.md`.

## 3. Write only what's needed

| File | When | Contents |
|---|---|---|
| `CLAUDE.md` | Always | Under 100 lines: a one-line purpose, the doc map (table), non-negotiables, the commands table (command, what it does, cost or risk), conventions (branches, commits, PRs), the current state. Link out instead of inlining. |
| `PRODUCT.md` | Anything user-facing | Problem, users, the success metric, scope and non-goals, key flows, open questions. |
| `docs/decision-log.md` | Any decision you might revisit | A table: date, decision, why, alternatives, revisit-when, link. |
| `docs/adr/` | Decisions that are expensive to reverse | One numbered file per decision plus a `README.md` index. Create the folder and index here; for each ADR's content, use `architecture-decisions` if it's available (drivers, options, confirmation, revisit triggers). |
| `GLOSSARY.md` | A domain with its own words | Term, meaning, the code name it maps to. If `domain-modeling` is available, use it here. |
| `docs/backlog.md` | Work deferred on purpose | An item, why it was deferred, and the trigger to pick it up. |

For a small script or prototype, `CLAUDE.md` alone is right. Say so instead of producing six files.

## 4. CLAUDE.md rules

- Write instructions as imperatives, each with a reason when the reason isn't obvious.
- Put the commands in a table, with the commands that cost money or touch production marked as such.
- Don't restate what lint, the type checker or CI already enforces.
- Leave out secrets, personal data, and anything that changes weekly. Link to where it lives.
- End with a `Current state:` line that sessions update when a milestone lands.

## 5. Finish

Show the user the file list with a one-line purpose for each. Commit only if they ask, as `docs: add project docs`.
