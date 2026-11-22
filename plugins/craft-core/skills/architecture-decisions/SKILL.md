---
name: architecture-decisions
description: Make and record expensive-to-reverse technical decisions - size the decision, name at most three measurable drivers, compare real options including keeping what exists, decide with an owner and a confidence level, and write a one-page ADR with a confirmation check and revisit triggers. Also design docs, superseding ADRs and ADR review. Use when the user is choosing a database, queue, framework, hosting, API style, sync vs async, monolith vs services or build vs buy, asks "which should we use", to write, record or review an ADR, design doc or RFC, or "why did we pick X". Not for setting up a docs folder (project-docs) or the internal design of one module.
---

# Architecture decisions

Architecture is the set of decisions that are expensive to change. There are only trade-offs: find the least-bad option for *this* system's drivers, make the trade-off visible, and leave a record that lets someone in the same situation reach the same conclusion.

Match depth to cost of reversal. A reversible choice gets a sentence; a choice that shapes data, interfaces or operations for years gets the full flow.

## 1. Look first

- Read `docs/adr/` (or `doc/adr`, `docs/decisions`, `docs/architecture/decisions`), `docs/decision-log.md`, `CLAUDE.md`, the README and the code paths the decision touches.
- Already decided? Quote the ADR and stop, or say which revisit trigger has fired and treat this as a superseding decision.
- What exists today is always an option. Find what it costs now, in numbers if you can (latency, incidents, hours of toil, bills).

## 2. Size it

| Door | Signals | Process |
|---|---|---|
| Two-way | Behind an interface, swap in a day, no data migration | Decide now. One line in the decision log. No ADR. |
| One-way | Data model, storage engine, public API or event contract, vendor lock-in, a new runtime or language, team boundaries | This full flow and an ADR. |
| Too big for one ADR | Several coupled decisions, more than one team, weeks of work | A design doc first ([references/design-doc.md](references/design-doc.md)), then one ADR per decision it settles. |

Say which door it is and why. Call out a two-way door being treated as one-way.

## 3. Drivers before options

- **Constraints** are fixed (deadline, budget, compliance, the team's skills, what's in production). List them separately; they aren't traded off.
- **Driving characteristics: at most three.** Ask which three would sink the system if they failed.
- Write each as a **quality-attribute scenario** with a measure: *"When 2,000 checkouts per minute arrive during a sale, the order service accepts them with p99 under 300 ms and loses none."* "Scalable" or "fast" is not a driver. With no number yet, write "unknown: measure first" and make measuring it part of the work.

## 4. Options

- At least three real options: **keep what exists (or do nothing)**, the **boring option** (tech the team already runs in production), and the serious contender(s). No strawmen.
- Judge each against the drivers and constraints, not with generic pros and cons. A table: rows are options; columns are each driver, cost of reversal, operational load (who's paged, what new thing must be run and patched), team familiarity, cost.
- Count every new moving part as a cost. Check that the design doesn't cut across team ownership.
- "Netflix uses it" is not evidence. Their drivers aren't yours.

Details and worked examples: [references/tradeoffs.md](references/tradeoffs.md).

## 5. Cut uncertainty, then decide

- **Riskiest unknown:** propose a time-boxed spike that answers it with a measurement. Don't estimate what you can measure in a day.
- **Last responsible moment:** if deciding later costs nothing and you'll know more, say so and name what will be known by then.
- **One decider** (on a solo project, the user). Record whose advice was taken and any dissent.
- **Confidence** (high / medium / low) and what would change it.

## 6. Write the ADR

Use [references/adr-template.md](references/adr-template.md).

- **One decision, about one page.** Lead with the decision in one sentence. Link to spikes, benchmarks and design docs instead of pasting them.
- **Context is factual**, with sources: numbers, incidents, links. Record political or deadline reasons honestly; they are real context.
- **Consequences include the bad ones**: what gets harder, the new operational burden, what you're locked into.
- **Confirmation**: how we'll know the decision is followed and still holds. Prefer an automated check that fails if it's broken (a dependency rule with dependency-cruiser, import-linter or ArchUnit; a latency budget test; a schema or contract test). Propose wiring it into CI; add it when the user agrees.
- **Revisit when**: concrete triggers (traffic above N, a vendor price change, the team doubling). Not "in six months".
- **Files**: `NNNN-kebab-title.md`, the next number after the highest existing one, in the repo's ADR folder. If there's none, ask before creating `docs/adr/`.
- **Show the draft first.** Write the file when the user approves. Status starts `Proposed`; it becomes `Accepted` when the decider says so.
- **Recording an old decision:** say so in the Context ("recorded in 2026 for a 2024 decision") and mark unknown rationale as unknown. Don't invent it.

## 7. Change a decision

Accepted ADRs are not edited, apart from status and links. To change one:
1. Write a new ADR that says `Supersedes NNNN` and what changed.
2. In the old ADR, set the status to `Superseded by NNNN` with a link. Change nothing else.
3. Update the index (`docs/adr/README.md`, if it exists) in the same change.

`Deprecated`: no longer applies, no replacement. `Rejected`: never accepted; keep it so the idea doesn't come back undiscussed.

## 8. Verify

After any write, run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/architecture-decisions/scripts/check-adrs.mjs" docs/adr
```

It fails on duplicate or malformed numbers, a missing or invalid status, a `Superseded by` pointing at a missing ADR, broken relative links, and an index out of step with the files. Fix every failure before saying it's done.

## Reviewing an architecture, design doc or ADR

Report gaps, most important first, quoting the line:
- Drivers are measurable scenarios, at most three, separate from constraints?
- Keeping what exists and the boring option are real options?
- Options compared against the drivers, not generic pros and cons?
- Bad consequences and operational cost stated?
- A named decider, confidence, a Confirmation and a revisit trigger?
- One decision, about one page, decided at the right level for its reversibility?

## Output

For "which should we use": **Door**, **Drivers**, **Options** (table), **Riskiest unknown and spike**, **Recommendation** (with confidence), then the ADR draft. A few lines per section. When the user only wants the ADR written, skip to step 6 and ask for what's missing in one batch.
