---
type: llm
weight: 2
---

Judge whether this is monitoring a senior SRE would design.
It proposes structured per-request events (wide events or canonical log lines) with fields including request or trace id, route, status, duration, user or account id, and the build SHA or release.
It adds an error tracker tagged by release, so a deploy that breaks checkout is visible.
It defines SLOs or SLIs for the critical journeys (at least checkout) and uses error-budget or burn-rate alerting, or explains a simpler symptom-based alert because of low traffic.
It pages only on user-visible symptoms and handles low night traffic, for example with synthetic checks of sign-in or checkout.
It covers saturation of the DB connection pool (a metric or alert before exhaustion).
It says alerts should have a runbook or first mitigation, and does not recommend paging on raw CPU or on every error.
