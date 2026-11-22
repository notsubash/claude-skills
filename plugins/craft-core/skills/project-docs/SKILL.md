---
name: project-docs
description: Set up or repair a project's working docs - a lean CLAUDE.md, plus PRODUCT.md, a decision log, a glossary or a backlog only where the project needs them - after interviewing the user. Use when starting a new repo, when the user asks to set up the docs, create or trim CLAUDE.md, write PRODUCT.md or a product brief, or start a decision log or ADR folder. Not for deciding or writing up one architecture decision (architecture-decisions) or judging whether a feature is worth building (product-lens).
---

# Project docs

Docs exist so a fresh session, or a new teammate, makes the same decisions you would. Every line has to earn its place: a doc nobody reads goes stale and starts to mislead.

## 1. Look first

Read what already exists: `README*`, `CLAUDE.md`, `AGENTS.md`, `docs/`, `CONTRIBUTING.md`, the package manifest, the CI config and the last 20 commits. Don't duplicate what the code or tooling already records.

## 2. Interview

If the `grilling` skill is available, use it. Otherwise ask, a few questions at a time, and wait for the answers:

- **Problem and user.** Who is it for, what pain does it remove, and what one measurable signal shows it worked?
- **Non-goals.** What will it deliberately not do?
- **Constraints.** Deadline, budget, platforms, hosting, compliance.
- **Non-negotiables.** Rules a session must never break: security, data, scope, style.
- **Decisions already made.** Stack, hosting, data model, and why.
- **Commands.** Install, run, test, lint, deploy, and which ones cost money or touch production.

Push back on vague answers. "Fast" isn't a requirement; "p95 under 300 ms on the list endpoint" is. If the problem, user or success metric is still fuzzy, run `product-lens` first and write its result into `PRODUCT.md`.

## 3. Write only what's needed

| File | When | Contents |
|---|---|---|
| `CLAUDE.md` | Always | Under 100 lines: one-line purpose, a doc map, non-negotiables, the commands table, conventions (branches, commits, PRs). Link out instead of inlining. |
| `PRODUCT.md` | Anything user-facing | Problem, users, success metric, scope and non-goals, key flows, open questions. |
| `docs/decision-log.md` | Decisions you might revisit | A table: date, decision, why, alternatives, revisit-when, link. |
| `docs/adr/` | Decisions expensive to reverse | The folder and a `README.md` index. Each ADR's content comes from `architecture-decisions` if it's available. |
| `GLOSSARY.md` | A domain with its own words | Term, meaning, the code name it maps to. Use `domain-modeling` if it's available. |
| `docs/backlog.md` | Work deferred on purpose | Item, why deferred, the trigger to pick it up. |

For a small script or prototype, `CLAUDE.md` alone is right. Say so instead of producing six files.

## 4. CLAUDE.md rules

- Imperatives, each with a reason when the reason isn't obvious.
- Commands in a table, with the ones that cost money or touch production marked.
- Don't restate what lint, the type checker or CI already enforces.
- Leave out secrets, personal data, and anything that changes weekly. Link to where it lives.

## 5. Finish

Show the user the file list with a one-line purpose for each. Commit only if they ask, as `docs: add project docs`.
