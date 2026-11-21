---
type: llm
weight: 2
---

Judge the architecture reasoning and the ADR draft.
It names at most three driving characteristics and states at least one of them measurably (for example: no request blocked by job work, p99 under a number; zero duplicate emails; handles the 30/minute peak), separately from constraints (team of 3, no Redis/Kafka experience, existing Postgres).
It compares at least three options against those drivers and includes the existing/boring option (a Postgres-backed queue on the database they already run), rather than generic pros and cons.
It weighs operational load or new moving parts (running Redis or Kafka is a new system for a 3-person team) and treats Kafka as overkill for about 4,000 jobs a day.
It addresses not sending emails twice (idempotency key or at-least-once with dedupe), not just "use a queue".
The ADR has a status (Proposed or Accepted), a clear decision, consequences that include at least one downside, a confirmation check (a test, a CI check, an alert or a metric), and a concrete revisit trigger (for example a job volume or latency threshold), not just "revisit later".
It is about one page, not a long essay.
