---
name: observability
description: Make production answerable - one wide structured event per request, error tracking by release, golden signals per critical flow, SLOs with error budgets, and burn-rate alerts that page only on user-visible symptoms. Use when the user asks to add logging, metrics, tracing, monitoring, alerts, dashboards, Sentry or OpenTelemetry, define SLOs or an error budget, reduce alert noise, or asks how they'd know if production broke. Not for debugging one bug (bug-triage) or product analytics (product-lens).
---

# Observability

Production should answer, from telemetry alone: is it broken for users, for whom, since when, and did a deploy do it? Instrument for those questions, not for "logs everywhere".

## 1. Look first

What exists: logger, error tracker, metrics backend, tracing, uptime checks, alert routing. What are the 2–4 critical user journeys (sign-up, sign-in, the core action, checkout)? How much traffic? A low-traffic app needs synthetic checks, not fine-grained burn rates. Build the parts the user asked for and the traffic justifies; list the rest as suggestions.

## 2. One wide event per request

Emit one structured (JSON or key=value) event per request per service, at the end, in a `finally`/`ensure` block so it fires on errors too, and wrapped so logging can never fail the request. Fields:

- `request_id`, `trace_id`, `route` (template, not raw path), `method`, `status`, `duration_ms`
- `user_id` or account id, plan or tier, auth method
- `build_sha`, `deploy_age` or deploy id, region
- feature flags evaluated, key business fields (order id, item count)
- DB query count and time, external call count and time, cache hit or miss
- `error_slug` (a unique, greppable name per throw site) and error class

Keep field names stable; treat them as a contract. **Never log secrets, tokens, passwords or full payment data**; redact PII by default. High-cardinality fields (user id, request id) belong in events, never in metric labels.

## 3. Error tracking

Errors go to a tracker (Sentry or similar) tagged with release (build SHA) and environment, with source maps uploaded for frontend code. Alert on a **new issue in the latest release** and on a regression of a resolved one, not on every event.

## 4. Metrics: golden signals per critical flow

- **Latency** as histograms (p50, p95, p99). Track failed-request latency separately; never average.
- **Traffic** (requests per second), **errors** (rate of failed requests, including wrong-content responses), **saturation** (the most constrained resource vs a target below 100%: DB connections, queue depth, memory).
- Services: RED (rate, errors, duration). Resources: USE (utilization, saturation, errors).
- Put deploy markers on every dashboard. One dashboard per service: SLO status on top, golden signals, then dependencies.

## 5. SLOs and error budgets

- For each critical journey: SLI = good events / valid events (for example, sign-in requests under 500 ms with non-5xx status). Measure where the user is: load balancer or client, not deep inside.
- Target from user expectation and history, not "five nines". 99.5–99.9% is typical. Error budget = 1 − target.
- Budget burning faster than planned: reliability work outranks features until it recovers. Write that rule down before you need it.

## 6. Alerts

Page only when it is **urgent, actionable and user-visible**. Symptoms page; causes (CPU, disk) go on dashboards or tickets.

Burn-rate alerts (Google SRE Workbook, for a 99.9% SLO). Both windows must exceed the rate:

| Action | Long window | Short window | Burn rate | Budget used |
|---|---|---|---|---|
| Page | 1 h | 5 m | 14.4 | 2% |
| Page | 6 h | 30 m | 6 | 5% |
| Ticket | 3 d | 6 h | 1 | 10% |

- Every alert links a runbook: what it means, how to check impact, first mitigation (roll back, flag off, scale).
- Low traffic: add a synthetic check per critical journey every 1–5 minutes and alert on consecutive failures.
- Uptime, TLS expiry and domain expiry checks from outside your infrastructure.
- Delete or downgrade any alert that fired without needing action, or never fired in a quarter.

## 7. Tracing (when there's more than one service)

OpenTelemetry SDK, W3C trace context propagated across HTTP and queues. Sample with tail-based sampling that keeps all errors and slow requests; record the sample rate on each event so counts stay correct.

## 8. Verify

- Trigger a test error in staging and production: it appears in the tracker with the right release and a readable stack.
- Fire a test alert end to end: it reaches the person on call.
- Answer three real questions from telemetry only: "error rate on checkout since the last deploy", "slowest route p99 today", "what happened to request X". If one can't be answered, that's the next field to add.
- Report: events and fields added, SLOs and targets, alerts with their runbooks, and the three answers.
