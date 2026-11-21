---
name: architecture-decisions
description: Make and record architecture decisions the way senior architects do - size the decision (one-way or two-way door), name the two or three quality attributes that drive it as measurable scenarios, compare real options including keeping what exists, spike the riskiest unknown, decide with a named owner and a confidence level, and write a one-page ADR with a confirmation check (a fitness function in CI where possible) and revisit triggers. Also writes design docs or RFCs for larger changes, supersedes old ADRs correctly, and reviews existing ADRs. Use when the user is choosing a database, queue, framework, hosting, API style, sync vs async, monolith vs services, build vs buy, asks "which should we use", "write an ADR", "record this decision", "design doc", "RFC", "review this architecture", or "why did we pick X". Not for laying out a project's docs folder (project-docs) or for shaping one module's interface in code.
---

# Architecture decisions

Architecture is the set of decisions that are expensive to change. There are no best practices here, only trade-offs. The job is to find the least-bad option for *this* system's drivers, make the trade-off visible, and leave a record that lets someone in the same situation reach the same conclusion. Why matters more than how.

Match depth to cost of reversal. A reversible choice gets a sentence; a choice that shapes data, interfaces or operations for years gets the full flow.

## 1. Look first

- Read `docs/adr/` (or `doc/adr`, `docs/decisions`, `docs/architecture/decisions`), `docs/decision-log.md`, `CLAUDE.md`, the README and the code paths the decision touches.
- Is it already decided? Then quote the ADR and stop, or say why its revisit trigger has fired and this is a superseding decision.
- What exists today is always an option. Find out what it costs now, in numbers if you can (latency, incidents, hours of toil, bills).

## 2. Size it

It is **architecturally significant** if it affects structure, quality attributes (performance, availability, security...), dependencies, interfaces between teams or systems, or how the code is built and deployed.

| Door | Signals | Process |
|---|---|---|
| Two-way | Behind an interface, swap in a day, no data migration | Decide now. One line in the decision log. No ADR. |
| One-way | Data model, storage engine, public API or event contract, vendor lock-in, a new runtime or language, team boundaries | This full flow and an ADR. |
| Too big for one ADR | Several coupled decisions, more than one team, weeks of work | A design doc first ([references/design-doc.md](references/design-doc.md)), then one ADR per decision it settles. |

Say which door you think it is and why. Call out a two-way door being treated as one-way: that slows teams down for nothing.

## 3. Drivers before options

- **Constraints** are fixed: deadline, budget, compliance, the team's skills, what's already in production. List them separately; they aren't traded off.
- **Driving characteristics: pick at most three.** Every extra "-ility" makes the design more complex. Ask which three would sink the system if they failed.
- Write each as a **quality-attribute scenario** with a measure: *"When 2,000 checkouts per minute arrive during a sale (stimulus, environment), the order service accepts them with p99 under 300 ms and loses none (response, measure)."* "Scalable" or "fast" is not a driver. If there's no number yet, write "unknown: measure first" and make measuring it part of the work.

## 4. Options

- At least three real options: **keep what exists (or do nothing)**, the **boring option** (the tech the team already runs in production), and the serious contender(s). A strawman doesn't count.
- Judge each option against the drivers and constraints, not with generic pros and cons. A table works: rows are options; columns are each driver, cost of reversal, operational load (who's paged, what new thing must be run, patched and monitored), team familiarity, cost.
- Check team and system boundaries (Conway's law). A design that cuts across team ownership will drift back toward the org chart.
- Count every new moving part as a cost. Each one adds failure modes, upgrades and on-call load.
- Beware evidence by famous example ("Netflix uses microservices"). Their drivers aren't yours.

Details and worked examples: [references/tradeoffs.md](references/tradeoffs.md).

## 5. Cut uncertainty, then decide

- **Find the riskiest unknown** (will it hold the load? does the library do X? what does the migration cost?) and propose a time-boxed spike that answers it with a measurement. Don't estimate what you can measure in a day.
- **Wait until the last responsible moment.** If deciding later costs nothing and you'll know more, say so and name what will be known by then.
- **One decider.** Someone owns the decision. Under the advice process they consult the people affected and the people with expertise, then decide. Record whose advice was taken and any dissent. Decision by consensus with no owner is how decisions get re-argued every month.
- **State confidence** (high / medium / low) and what would change it.

## 6. Write the ADR

Use [references/adr-template.md](references/adr-template.md). Rules:

- **One decision per ADR, about one page.** Lead with the decision in one sentence. Link to the spike, benchmarks and design doc instead of pasting them in.
- **Context is value-neutral and factual**, with sources: numbers, incidents, links. Name people and teams; don't hide behind the passive voice. Record political or deadline reasons honestly. They are real context.
- **Consequences include the bad ones**: what gets harder, the new operational burden, what you're now locked into.
- **Confirmation**: how we'll know the decision is being followed and still holds. Prefer an automated **fitness function** in CI (a dependency rule, a latency budget test, a schema check). Fall back to a named review step.
- **Revisit when**: concrete triggers (traffic above N, a vendor price change, the team doubling). Not "in six months".
- **Numbering and files**: `NNNN-kebab-title.md`, the next number after the highest existing one, in the repo's existing ADR folder. If there's no ADR folder, ask before creating `docs/adr/`.
- **Show the draft first.** Write the file only when the user approves. Status starts at `Proposed`; it becomes `Accepted` when the decider says so.
- **Write it at decision time.** When recording an old decision, say so in the Context ("recorded in 2026 for a 2024 decision") and don't invent rationale. Mark anything unknown as unknown.

## 7. Change a decision

Accepted ADRs are not edited, apart from status and links. To change one:
1. Write a new ADR that says `Supersedes NNNN` and explains what changed (usually a revisit trigger).
2. In the old ADR, set the status to `Superseded by NNNN` with a link. Change nothing else.
3. Update the index (`docs/adr/README.md`, if it exists) in the same change.

`Deprecated` means no longer applies, with no replacement. `Rejected` is for a proposal that was never accepted. Keep it; it stops the idea coming back undiscussed.

## 8. Make it enforceable

An ADR nobody can check becomes fiction. For each Confirmation, add the cheapest automated check that would fail if the decision were broken. For example, ArchUnit, dependency-cruiser, import-linter or `go vet` rules for layering; a benchmark or load test with a budget; a contract or schema test for an API. Wire it into CI, or propose it as the first follow-up if the user doesn't want it now.

## 9. Verify

Run the checker on the ADR folder after any write:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/architecture-decisions/scripts/check-adrs.mjs" docs/adr
```

It fails on duplicate or malformed numbers, a missing or invalid status, a `Superseded by` pointing at an ADR that doesn't exist, broken relative links, and index entries out of step with the files. Fix every failure before you say it's done.

## Reviewing an architecture, a design doc or an ADR

Report the gaps, most important first, quoting the line:
- Are the drivers measurable scenarios, and at most three? Are constraints separated from drivers?
- Is keeping what exists a real option? Is the boring option there?
- Are the options compared against the drivers, or with generic pros and cons?
- Are the bad consequences and the operational cost stated?
- Is there a named decider, a confidence level, a Confirmation and a revisit trigger?
- Is it one decision, about one page, decided at the right level for its reversibility?

## Anti-patterns to name

Resume-driven design (picking tech to learn it). Golden hammer (one tool for everything). Groundhog day (the same debate every month because nobody wrote down the why). Covering your assets (never deciding, to avoid blame). Email- or Slack-driven architecture (decided in a thread nobody can find). The ivory tower (deciding without the people who'll run it). Generality nobody asked for ("in case we need to switch databases").

## Output

For "which should we use": **Door**, **Drivers**, **Options** (table), **Riskiest unknown and spike**, **Recommendation** (with confidence), then the ADR draft. Keep each section to a few lines. When the user only wants the ADR written, skip to step 6 and ask for whatever is missing in one batch.
