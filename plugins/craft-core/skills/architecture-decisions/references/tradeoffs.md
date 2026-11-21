# Trade-off analysis

## Architecture characteristics

Pick at most three that drive the decision. A checklist to pick from (grouped loosely after ISO/IEC 25010):

| Group | Characteristics |
|---|---|
| Operational | performance (latency, throughput), scalability, elasticity, availability, reliability, recoverability (RTO/RPO), observability |
| Structural | maintainability, testability, deployability, modularity, extensibility, portability |
| Cross-cutting | security, privacy, compliance, cost, usability, accessibility, data integrity |

Implicit characteristics (security, basic maintainability) are always there. Only name them as drivers when this decision moves them a lot.

## Quality-attribute scenarios

The six parts: **source** (who or what), **stimulus** (the event), **environment** (normal, peak, degraded), **artifact** (the part of the system), **response** (what it does), **response measure** (the number).

| Vague | Scenario |
|---|---|
| "Must be fast" | A signed-in user opening the dashboard under normal load sees it render in under 1.5 s at p95. |
| "Highly available" | When one availability zone fails, checkout keeps accepting orders, with under 1 minute of errors and zero lost orders. |
| "Easy to change" | A developer adds a new payment provider in under 3 days, touching only the payments module. |
| "Secure" | An unauthenticated request to any /admin route gets a 401, enforced in one middleware, checked by a test that lists every route. |

## Comparing options

- Score each option against each driver with a short reason, not a number out of 10. Weighted scores hide the reasoning and invite gaming.
- Add the columns people forget: **cost of reversal** (what it takes to undo in a year), **operational load** (new things to run, patch, monitor; who gets paged), **team familiarity**, **lock-in**, and **money** (licence, hosting, people).
- Look at second-order effects. A message queue decouples services, and also adds eventual consistency, retries, poison messages, ordering questions and a new thing to monitor.
- Distributed options pay the distribution tax: network failures, partial failure, versioned contracts, distributed tracing, data consistency across services. Only pay it for a driver that needs it (independent deployability across teams, very different scaling needs, fault isolation).

## Common decisions: the questions that settle them

| Decision | Ask |
|---|---|
| Database / storage | Access patterns (reads vs writes, queries vs key lookups)? Consistency needed? Data size in two years? Can the database you already run do it (Postgres usually can)? |
| Queue / async | Must the caller wait? Ordering? At-least-once plus idempotency, or exactly-once? Can a table plus a worker do it at this volume? |
| Monolith vs services | How many teams deploy independently? Different scaling or availability needs per part? A modular monolith with enforced boundaries gets most of the benefit. |
| Sync vs event-driven | Who needs to know, and how fast? Who owns the contract? How will you trace one request across it? |
| Build vs buy | Is this your differentiator? Total cost including integration, ops and exit? What happens if the vendor dies or triples the price? |
| API style | Who are the clients and do you control them? Versioning plan? REST plus OpenAPI is the boring default for public APIs. |
| Framework / language | Does the team know it? Hiring? Upgrade cadence and long-term support? |

## Fitness functions

An automated check that fails when the architecture drifts from a decision. Choose the cheapest one that would actually catch a violation.

| Decision | Fitness function |
|---|---|
| Layering (UI must not import the database) | dependency-cruiser (JS/TS), import-linter (Python), ArchUnit (JVM), `depguard` / `go vet` analyzers (Go), a Cargo workspace with restricted deps (Rust) |
| Latency budget | A benchmark or k6/Locust test in CI with a threshold. Or an SLO alert in production, where the burn rate is the check. |
| API compatibility | Contract tests (Pact), an OpenAPI diff that fails on a breaking change, a schema registry with compatibility mode |
| No new direct vendor calls | A grep or lint rule that only allows the SDK import in one adapter module |
| Bundle or image size | A size-limit check in CI |
| Data residency or encryption | A policy-as-code check on infrastructure (OPA/Conftest, Checkov) |

## Diagrams

Use the C4 model. Level 1 (system context) and level 2 (containers: apps, databases, queues) cover almost every decision. Draw level 3 only for the component the decision lives in. Write diagrams as code (Mermaid, Structurizr DSL, PlantUML) so they're diffed and reviewed like everything else. Every arrow gets a label (what flows, and the protocol).

## Where this comes from

- Michael Nygard, "Documenting Architecture Decisions" (2011): the ADR and its architecturally significant decisions.
- MADR 4 (adr.github.io/madr): option analysis and the Confirmation section.
- Martin Fowler, "Architecture Decision Record" (bliki): one page, inverted pyramid, confidence, supersede and never edit.
- Mark Richards & Neal Ford, *Fundamentals of Software Architecture* and *Software Architecture: The Hard Parts*: everything is a trade-off, why over how, limit the driving characteristics, the anti-patterns.
- Neal Ford, Rebecca Parsons, Patrick Kua, *Building Evolutionary Architectures*: fitness functions.
- Len Bass, Paul Clements, Rick Kazman, *Software Architecture in Practice* (SEI): quality-attribute scenarios, ATAM.
- Andrew Harmel-Law, *Facilitating Software Architecture*: the advice process.
- Simon Brown, the C4 model.
- Malte Ubl, "Design Docs at Google": goals and non-goals, alternatives, cross-cutting concerns.
- Dan McKinley, "Choose Boring Technology": innovation tokens and the cost of new moving parts.
