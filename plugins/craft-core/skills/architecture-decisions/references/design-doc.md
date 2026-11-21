# Design doc / RFC

For a change too big for one ADR: several coupled decisions, more than one team, or weeks of work. The doc exists to find the problems in the design while they're cheap, on paper and in review. Without the review it's just paperwork.

Write one when the design is genuinely uncertain, the cost of getting it wrong is high, and other people need to weigh in. Skip it when the solution is obvious and the main work is implementation. Then a ticket and an ADR are enough.

Aim for 3 to 10 pages. Longer means it should be split.

## Outline

1. **Context and scope.** What exists today, with numbers. What this changes. A context diagram (C4 level 1: the system, its users, the systems it talks to) if more than two systems are involved.
2. **Goals and non-goals.** Goals are measurable outcomes, written as quality-attribute scenarios where they're about behaviour. Non-goals are things a reasonable person might expect this to do that it deliberately won't. They're the most useful lines in the doc.
3. **The design.** Start with the overview a reviewer needs in two minutes, then the detail. Show the trade-offs, not only the result:
   - System context and containers (C4 levels 1 and 2). Go deeper only where the decision lives.
   - APIs and data: the contracts and the schema, since these are the expensive parts to change. Show sketches, not full specs.
   - Data flow for the main path and the main failure path.
   - Migration and rollout: how we get from here to there without downtime or data loss (expand, migrate, contract), and how we back out at each step.
4. **Alternatives considered.** Each with why it lost against the goals. Always include keeping the current design.
5. **Cross-cutting concerns.** Security and privacy (threat model in a paragraph: what's new that an attacker could reach), reliability (what fails, blast radius, what pages whom), observability (the signals that will tell us it works), cost, compliance.
6. **Risks and open questions.** The riskiest unknown and the spike that answers it. Questions for reviewers, each addressed to a person.
7. **Decisions.** The list of ADRs this doc produces, one per one-way-door decision, written once review settles them.

## Review

- Name the reviewers and a deadline. Ask each one a specific question; "any thoughts?" gets nothing.
- Record decisions and dissent in the doc. Once it's approved, the ADRs become the durable record and the doc can go stale.
- A review that changes nothing is a warning sign. Either the design was already settled (skip the doc next time) or nobody read it.
