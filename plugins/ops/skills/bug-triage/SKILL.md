---
name: bug-triage
description: Take a bug from report to closed - gather the missing facts in one batch, find the event in logs or the error tracker, set severity from user impact, reproduce it minimally (git bisect when it's a regression), write the failing test first, fix the root cause and its siblings, repair affected data, verify in a prod-like environment, and close the loop with the reporter. Use when the user pastes a bug report, error, stack trace, Sentry issue or support ticket, says something is broken in production, asks to triage or prioritize bugs, or asks about a regression or flaky test. Not for outages in progress affecting many users right now (mitigate first; this skill covers the follow-up), and not for new features.
---

# Bug triage

A bug is closed when the user's problem is gone, a test proves it, and it can't silently come back. Not when the code changed.

## 1. Intake: facts before theories

- Collect, in **one** question batch, only what's missing: steps, expected vs actual, when it started, how often, who (user or account id), environment, app version or build SHA, screenshot or request id.
- Find it in the evidence: error tracker issue, logs by request or trace id, the deploy timeline. Raw evidence beats the report's summary.
- Search for duplicates in the tracker and recent commits. Link them; keep one issue.

## 2. Severity from impact, then priority

Severity is impact; priority is when we fix it.

| Severity | Signal | Action |
|---|---|---|
| S1 | Data loss or corruption, security exposure, payments or sign-in broken for many | Stop the bleeding now (roll back, flag off), then fix. Security: handle privately, don't post details in public issues |
| S2 | Core flow broken for a segment, no workaround | This cycle |
| S3 | Workaround exists, or non-core flow | Schedule |
| S4 | Cosmetic | Batch or close |

When unsure between two levels, pick the higher one. Weigh how many users, how often, revenue at risk, and whether data is being damaged right now (that makes it S1 regardless of count).

## 3. Reproduce

- Smallest repro: a failing test, a script, or exact steps against a prod-like dataset. "Cannot reproduce" means you're missing a fact, usually data shape, permissions, timezone, locale, concurrency, browser, feature flag, or cache. Compare the reporter's context to yours, one difference at a time.
- **Regression?** Find the last good version and `git bisect run <script>`. Check deploys, dependency and config changes, and flag flips at the time it started.
- Can't reproduce after a real attempt: add targeted logging or a wide-event field at the suspected point, ship it, and wait for the next occurrence. Don't ship a guess as a fix.

## 4. Failing test first

Write the test that fails for the reported reason at the lowest level that still shows the bug (unit before integration before end-to-end). Watch it fail. It becomes the regression guard.

## 5. Root cause, not symptom

- Keep asking "why" until you reach a cause you can fix and that explains every observation. If `superpowers:systematic-debugging` is installed, use it for this step.
- **Search for siblings:** grep for the same pattern elsewhere (the same unchecked null, the same timezone math, the same missing auth check). Fix or ticket each.
- Ask why tests, types or review didn't catch it. A cheap guard (a type, a lint rule, an assertion) beats one more test.

## 6. Fix

- Minimal change; refactors go in a separate commit or PR.
- **Repair the data** the bug damaged: find affected records with a query, write an idempotent fix script, dry-run it and report counts, then run it. Keep the script in the repo.
- Risky fix? Ship it behind a flag or to a canary first.

## 7. Verify

New test passes, full suite passes, the original repro steps pass in a prod-like environment. After deploy, confirm the error tracker issue stops recurring for the new release before closing.

## 8. Close the loop

- Reply to the reporter in plain words: what was wrong, that it's fixed, anything they need to do.
- Link the commit or PR, add a **Fixed** changelog entry, close the duplicates.
- User-facing outage or data loss: write a blameless postmortem. If `incident-response` is available, use its template and `check-postmortem.mjs`; otherwise cover the timeline, impact, causes, what detected it, and owned action items.

## Triage a backlog

Label each bug with severity, area and status. Close "needs info" after 14 days without reply, saying how to reopen. Group by root cause, not by symptom. Report the top 5 by impact.

## Flaky tests

A flaky test is a bug, either in the test or in the code (race, order dependence, time, shared state). Quarantine it with a ticket and an owner within a day; never add blanket retries. Reproduce it by running it in a loop, with random order, or under load.
