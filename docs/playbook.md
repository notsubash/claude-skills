# Playbook: which skill, when

The README says what each skill does. This page says **what to type, in what order**, for the situations a senior engineer or AI engineer actually hits. Each scenario has three parts: what to install, the flow, and what to watch out for.

How skills fire, in one paragraph: most skills trigger on their own when your prompt matches their description, so plain language works ("raise a PR", "is this worth building?"). Some are manual: type `/plugin:skill`, e.g. `/matt-eng:grill-with-docs`. The `deepen` hook rewrites your **first** prompt of each session and waits for your OK. Start a prompt with `!raw` to skip it when you already know exactly what you want.

**Contents**

0. [Once per machine](#0-once-per-machine)
1. [Starting a new project](#1-starting-a-new-project)
2. [Joining an existing project (team, client, inherited)](#2-joining-an-existing-project)
3. [Coming back to your own project after a while](#3-coming-back-to-your-own-project)
4. [Building a feature, day to day](#4-building-a-feature-day-to-day)
5. [A library you don't know, or one that moved fast](#5-a-library-you-dont-know-or-one-that-moved-fast)
6. [A design decision you can't easily undo](#6-a-design-decision-you-cant-easily-undo)
7. [Building an LLM feature or agent](#7-building-an-llm-feature-or-agent)
8. [Prod is broken, or a bug report lands](#8-prod-is-broken-or-a-bug-report-lands)
9. [Refactoring or legacy code](#9-refactoring-or-legacy-code)
10. [Shipping: PR, security, release](#10-shipping-pr-security-release)
11. [Long sessions and token budget](#11-long-sessions-and-token-budget)
12. [UI work](#12-ui-work)
13. [Contributing to open source](#13-contributing-to-open-source)
14. [Keeping a live app healthy](#14-keeping-a-live-app-healthy)
15. [Rules of thumb](#rules-of-thumb)

---

## 0. Once per machine

```bash
npm i -g github:notsubash/claude-skills#semver:x
skills add context7 caveman --global     # useful in every project, commit nothing
skills add writing --global              # if you write posts, replies, video scripts
skills doctor
```

Then, in any Claude Code session: run `/mcp`, pick **context7**, and sign in through the browser. It shows `needs-auth` until you do. No API key needed.

Why global: context7 and caveman don't depend on the project, and global scope means no `.claude/` changes in team repos.

---

## 1. Starting a new project

**Install:** `skills use everyday` (shared scope; commit `.claude/settings.json` and `.claude/craft.lock.json`). Add `skills add web` if it has a UI.

**Flow:**

| Step | Type | What happens |
|---|---|---|
| 1. Pressure-test the idea | "Is this worth building? Here's the idea: …" | `product-lens`: evidence vs assumptions, the user and the pain, a metric, a thin slice, a kill criterion. Verdict: build, test first, or don't build |
| 2. Get the idea out of your head | `/matt-eng:grill-with-docs` | Interviews you one question at a time and writes down the decisions it surfaces |
| 3. Pick the stack | "Postgres or SQLite for this? Write an ADR." | `architecture-decisions`: drivers, options including the boring one, a one-page ADR. Only for choices that are hard to reverse |
| 4. Check current APIs before scaffolding | "Set up a Next.js 16 app router project with Drizzle. Use context7 for both." | `context7-mcp` pulls the docs for the version you named, not what the model remembers |
| 5. Write the project docs | "Set up the docs" | `project-docs`: a lean CLAUDE.md, plus PRODUCT.md and the ADR folder only if the project needs them |
| 6. Plan the first slice | "Let's brainstorm the first slice", then "write the plan" | superpowers `brainstorming` → `writing-plans`. For tracker-driven work: `/matt-eng:to-spec` → `/matt-eng:to-tickets` |
| 7. Build it | "Implement task 1 test-first" | `test-driven-development` + `test-integrity`; ponytail keeps the solution small |
| 8. Ship it | "Security check, then raise a PR" | `security-gate` → push guard → `senior-pr` |

**Watch out:**
- Do step 5 *after* the first decisions, not before. A CLAUDE.md written on day zero is mostly guesses.
- Don't ADR everything. A two-way door (easy to undo) gets one line in the decision log, not a document.
- Building the first slice with `subagent-driven-development` runs long without checking in. Use it when the plan is solid, not while you're still exploring.

---

## 2. Joining an existing project

Team repo, client repo, or a codebase you inherited. **It isn't yours, so don't change its `.claude/` folder.**

**Install:** `skills use existing-repo` (craft-core, just-me scope, nothing to commit). With context7 and caveman installed globally from step 0, that's the whole kit.

**Flow:**

| Step | Type | What happens |
|---|---|---|
| 1. Map it | "Walk me through how this codebase is organised: entry points, request flow, where state lives, how it's tested and deployed. Cite files." | Plain Claude Code reading, no skill needed. Ask for file paths so you can check |
| 2. Read their rules first | "Summarise CLAUDE.md, CONTRIBUTING and any ADRs. What conventions must I follow?" | You learn their conventions before Claude starts applying yours |
| 3. Understand their stack *at their versions* | "What does `useActionState` do in the React version this repo pins? Check package.json, then context7." | `context7-mcp` with the pinned version. This matters most on an older stack, where the latest docs would mislead you |
| 4. First change | "Add tests for X" before touching X | `test-integrity`: proves you understand the current behaviour before you change it |
| 5. Hand it in | "Raise a PR" | `senior-pr` follows the repo's own commit style if it has one |

**Watch out:**
- **context7 sends your query to a hosted service.** In client or NDA repos, ask generic library questions ("how does Prisma handle nested writes") and never paste their code into the lookup. The skill doesn't stop you.
- `project-docs` will offer to write a CLAUDE.md. In someone else's repo, ask the team first.
- If the team later wants the same skills, switch to shared scope with their agreement: `skills remove craft-core --local && skills add craft-core`.

---

## 3. Coming back to your own project

**Install:** nothing new. On a fresh clone or a new machine, run `skills sync`.

**Flow:**
1. "What changed since I last worked here? Read the git log, open branches, the decision log and the backlog." Plain Claude Code.
2. "Our CLAUDE.md is bloated, trim it." `project-docs` cuts it back to what's still true.
3. "Update dependencies." `dep-upgrade` applies a 7-day release-age cooldown, does majors one at a time, and reviews the lockfile. Pair it with context7 for migration guides: "What changed between Prisma 5 and 6? Use context7."
4. "Weekly maintenance check." `maintenance-routine` gives you a red-amber-green report on what rotted while you were away.

---

## 4. Building a feature, day to day

**Install:** `everyday` in your own repos, `existing-repo` in others.

**Flow:** what to type at each point:

1. **Unclear ask?** "Is this feature worth building?" (`product-lens`), or `/matt-eng:grill-with-docs` to pin down scope.
2. **Clear ask, real size?** "Brainstorm this, then write a plan." Skip this for anything under an hour.
3. **Touching a library?** Name it with its version, or say "use context7". You'll get current signatures instead of remembered ones.
4. **Build:** "Implement this test-first." The test guard hook asks before Claude skips, loosens or deletes a test.
5. **Before you call it done:** superpowers `verification-before-completion` checks that it actually runs. "Is this the simplest version?" runs `/ponytail-review`.
6. **Ship:** "Commit this and raise a PR."

**Watch out:** if CI is red, say "get CI green". `test-integrity` fixes the code, not the test. If you ever *do* want to change a test, say so explicitly and say why.

---

## 5. A library you don't know, or one that moved fast

This is context7's job. The model's training data lags behind fast-moving libraries (Next.js, the AI SDKs, LangGraph, Tailwind, Supabase), and stale answers look exactly as confident as current ones.

**What to type:**

| You want | Type |
|---|---|
| A specific version | "How do I stream responses in the Vercel AI SDK **v5**? Use context7." |
| The version this repo pins | "Check package.json for the Prisma version, then look up relation syntax in context7." |
| A known library ID, skipping the search | "use context7 with /vercel/next.js for middleware" |
| A migration | "What breaks moving from Pydantic v1 to v2? Use context7, one query per topic." |

**How to get good results:**
- **One concept per question.** "Routing and auth and caching" in one query gets shallow results for all three. Ask three times.
- **Say the version.** Without one you get the latest docs, which is wrong for an older pinned stack.
- **It triggers on any library mention.** That costs a round-trip per question. For something you know cold, ask normally and it'll mostly stay out of the way; if it doesn't, say "no lookup needed".
- If it says your quota is used up: sign in through `/mcp` (or re-sign in). It should tell you when it falls back to memory. If it doesn't, ask.

---

## 6. A design decision you can't easily undo

Database, queue, auth provider, monolith split, model provider, vector store.

**Flow:**
1. "Postgres queue or Redis? We need X and Y." `architecture-decisions` first asks how hard the decision is to undo. Two-way doors get a quick answer and no ADR.
2. For one-way doors it names at most three measurable drivers, compares options *including keeping what exists*, and proposes a spike for the riskiest unknown.
3. Check the options' current capabilities: "What are pgvector's current index types and limits? Use context7." Don't compare products from memory.
4. It writes a one-page ADR with a **confirmation check** (a test or CI check that fails if the decision drifts) and **revisit triggers**.
5. Bigger changes: "Write a design doc for splitting the monolith."

**Watch out:** `/matt-eng:grill-with-docs` also writes ADRs. Use grill for *discovering* what you think, and architecture-decisions for *deciding* between options.

---

## 7. Building an LLM feature or agent

AI engineering is ordinary engineering with a few sharp edges: APIs change monthly, outputs aren't deterministic, and cost scales with usage.

**Install:** `everyday`. context7 is already global.

**Flow:**

| Step | Type | Skill |
|---|---|---|
| 1. Is an LLM even the right tool? | "Is an LLM feature worth it here vs rules or search? Here's the use case…" | `product-lens`. Include "do nothing" and a non-LLM option |
| 2. Pick model and provider, RAG vs fine-tune vs long context, which vector store | "Write an ADR: RAG with pgvector vs long-context prompting" | `architecture-decisions`. Make cost per request and p95 latency drivers, not just quality |
| 3. Get the SDK right | "Using the OpenAI Agents SDK, current version, how do handoffs work? Use context7." For Claude, Claude Code's built-in `claude-api` skill covers model IDs, caching and tool use | `context7-mcp` |
| 4. Evals before prompt-tweaking | "Add tests for the extraction prompt: a fixed set of inputs with expected outputs, and assertions that would fail if the prompt regressed" | `test-integrity`. Real expected values, not "output is non-empty". Mock the LLM only in unit tests of the code around it |
| 5. Observability | "Add tracing and cost logging to the agent loop" | `observability`: one wide event per call, with model, tokens, latency, cost and outcome |
| 6. Ship behind a flag | "Plan the rollout" | `release`: progressive rollout with rollback triggers. Prompts are code, so version them |

**Watch out:**
- **Never paste API keys, customer data or proprietary prompts into a context7 query.**
- An eval that calls the live model is slow and costs money. Keep a small deterministic suite in CI and a bigger one you run by hand.
- `security-gate` catches committed keys. Run it before every push on AI projects, since `.env` mistakes are common there.

---

## 8. Prod is broken, or a bug report lands

**Install:** `skills use live-app` (ops) if it isn't already part of `everyday`.

| Situation | Type | Skill |
|---|---|---|
| It's down now | "Checkout is down since the deploy" | `incident-response`: declare, set severity, **mitigate first** (roll back, turn the flag off), then status updates on a cadence |
| Afterwards | "Write the postmortem" | `incident-response`: blameless, sourced timeline, owned and ticketed actions |
| A bug report or Sentry issue | Paste it | `bug-triage`: evidence → severity → minimal repro → failing test → root-cause fix → data repair → reply |
| A local error while developing | Just ask | No skill. `bug-triage` deliberately stays out of local dev errors |
| A library behaving oddly | "Is this a known behaviour change in Redis 7.4? Use context7." | `context7-mcp` |

**Watch out:** no caveman during an incident. Status updates and handoffs are read by other people under stress. The voice drops to plain prose on its own for irreversible actions, but turn it off anyway: "stop caveman".

---

## 9. Refactoring or legacy code

1. **Pin the current behaviour first:** "Add characterization tests for the billing module before I refactor." (`test-integrity`)
2. **Find the shape:** `/matt-eng:improve-codebase-architecture` for a report, or "domain model for billing" (`domain-modeling`).
3. **Keep it small:** ponytail pushes for minimal diffs. `/ponytail-debt` lists the shortcuts already in the code.
4. **Old framework?** Look up the docs for the version you're on *and* the one you're moving to, with context7: "What's the Express 4 → 5 migration for error middleware?"
5. **Big rewrite?** Write an ADR first. A rewrite is a one-way door.

---

## 10. Shipping: PR, security, release

| Type | Skill |
|---|---|
| "Security check before I push" | `security-gate` writes a CLEARED/BLOCKED report. The push guard checks for it when the branch touches sensitive files |
| "Commit this" / "raise a PR" | `senior-pr`: one conventional commit per logical change; PR body with what, why, risk and how it was tested |
| "Cut a release" / "write the changelog" | `release`: version, user-facing changelog, expand/contract migrations, rollout plan |
| Something risky (auth, payments, crypto) | `skills use security` adds the heavier engines. Note: security-guidance runs a review on **every** code-changing turn, which costs tokens |

caveman never writes into commits, PRs or changelogs (those count as "persisted outside chat"), so leaving it on while you ship is fine.

---

## 11. Long sessions and token budget

You have two tools, and they aren't the same thing:

| | `craft-core:terse` output style | `/caveman` |
|---|---|---|
| Scope | The whole project or every session, set once in `/config` → Output style | One session; you turn it on and off |
| Feel | Short, normal English | Fragments, no articles |
| Token saving | Modest | `caveman` ≈ the same as "answer concisely" (upstream measured 3%); `/ultracave` ≈ 35% fewer output tokens |
| Survives `/compact` or a new session | Yes | No. The upstream hooks that remember the mode aren't installed, so type it again |

**When to use caveman:**
- A long debugging or exploration session where you're skimming lots of output: `/caveman`.
- You actually want fewer tokens: `/ultracave`. This is the one with a real effect.
- `stop caveman` or `normal mode` turns it off. `/caveman-help` shows the cheat sheet. Ignore the commit, review and compress skills it lists, which aren't installed.

**When not to:** onboarding someone, security reviews, explaining a design, or anything you'll forward to someone. Don't stack it on top of `terse`. Pick one.

Other budget levers: `!raw` skips the deepen rewrite. Keep CLAUDE.md lean (`project-docs`). Turn off skills you aren't using in this project (`skills remove`).

---

## 12. UI work

**Install:** `skills use frontend` (core + web).

"Redesign this page" or "this UI looks generic" runs `ui-pipeline`: critique → stageshow demo → charles-unslop → emil polish → verified with playwright screenshots. For component APIs at your version: "Radix Dialog props in the version we pin, use context7." Fixing one component isn't a pipeline job; just ask.

---

## 13. Contributing to open source

**Install:** `skills use contribute` (just-me scope, so `.claude/` never lands in your PR).

"I forked X and want to contribute" or "which issue should I take?" runs `oss-contribute`: their rules, scoping the issue, a test-first fix, and a PR in *their* conventions. Use context7 for the project's *dependencies*, not the project itself; read the project's own source directly.

---

## 14. Keeping a live app healthy

- "Set up a weekly maintenance check and schedule it" → `maintenance-routine`
- "Define SLOs" / "too many alerts" → `observability`
- "Are we hit by the X compromise?" / "fix this CVE" → `dep-upgrade`
- New major version of a core dependency → context7 for the migration guide, then `dep-upgrade` for the upgrade itself

---

## Rules of thumb

1. **Scope follows ownership.** Your repo → shared. Someone else's → just me (`--local`). Every project → global.
2. **One owner per request.** If two skills seem to fit, the "Not for" line in each description decides. Flaky tests → `test-integrity`. Outages → `incident-response`. Build vs buy → `architecture-decisions`.
3. **Name the version** whenever a library is involved. That's what makes context7 worth having.
4. **Keep context7 queries generic in private repos.** Library questions yes; their code no.
5. **caveman is for your eyes only.** Off for incidents, reviews and anything shared.
6. **Small task, no ceremony.** Under an hour: skip brainstorm, plan and ADR. Just ask, test, ship.
7. **Force a skill when auto-trigger misses:** `/plugin:skill`. If it misfires repeatedly, file it with the skill-misfire issue form.
