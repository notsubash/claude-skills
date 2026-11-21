# ADR template

Based on MADR 4 (MIT OR CC0-1.0, https://adr.github.io/madr/), with Nygard's original sections and Fowler's confidence and re-evaluation notes folded in. Delete any optional section that would be empty. Aim for one page.

```markdown
# NNNN. <Decision as a short imperative phrase, e.g. "Use Postgres for the job queue">

- Status: Proposed | Accepted | Rejected | Deprecated | Superseded by [NNNN](NNNN-title.md)
- Date: YYYY-MM-DD
- Decider: <one named person or role>
- Consulted: <people and teams whose advice was taken> (optional)
- Supersedes: [NNNN](NNNN-title.md) (optional)

## Decision

<One or two sentences. The inverted pyramid: a reader who stops here knows what was decided.>
In the context of <situation>, facing <the driver that matters most>, we decided for <option> and against <the main alternatives>, to achieve <the benefit>, accepting <the main downside>.

## Context

<Facts, value-neutral, with sources: current numbers, incidents, constraints, deadlines. 3 to 10 lines. Link to the design doc, spike or benchmark instead of pasting them.>

Drivers (at most three, each measurable):
1. <Quality-attribute scenario: when <stimulus> under <environment>, <artifact> responds with <response>, measured as <measure>.>
2. ...

Constraints: <fixed facts that are not traded off: budget, compliance, team skills, what's in production>

## Options considered

| Option | Driver 1 | Driver 2 | Cost of reversal | Operational load | Notes |
|---|---|---|---|---|---|
| Keep what exists | | | none | | |
| <Boring option> | | | | | |
| <Contender> | | | | | |

<One line per rejected option on why it lost, against the drivers.>

## Consequences

- Good: <what gets easier or better, tied to a driver>
- Bad: <what gets harder, new failure modes, lock-in, on-call load>
- Follow-ups: <work this creates, with owners if known>

## Confirmation

<How we'll know the decision is followed and still holds. Prefer an automated fitness function in CI: the rule, the tool, the file. Otherwise the review step and who does it.>

## Confidence and revisit

Confidence: high | medium | low, because <reason>.
Revisit when: <concrete triggers: a metric crossing a number, a price change, a team change, a new requirement>.
```

## Minimal variant

For a one-way door that's simple: Title, Status/Date/Decider, Decision, Context (with drivers), Consequences, Confirmation, Revisit when. Drop the options table to a list of the alternatives with one line each.

## Index (`docs/adr/README.md`)

```markdown
| # | Decision | Status | Date |
|---|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted | 2026-01-10 |
```

The checker script reads this table and fails if a file is missing from it, or if it lists one that doesn't exist.

## Writing rules (from practitioners' ADR advice)

- Be specific: "Postgres 16 on the existing RDS instance", not "a relational database".
- Only relevant points. A generic pro ("large community") that doesn't touch a driver is noise.
- Facts, not opinions or emotion. Cite the source of every number.
- Name people and teams. "It was decided" hides the decider.
- Don't assume anything is obvious to a reader joining in two years.
- Ask "why?" until you reach the real driver.
- Edit ruthlessly. If a sentence doesn't change what a reader would conclude, cut it.
