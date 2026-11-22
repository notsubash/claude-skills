---
name: bug-triage
description: Take a reported or production bug from report to closed - gather the missing facts, find it in logs or the error tracker, set severity from user impact, reproduce it (git bisect for regressions), write the failing test first, fix the root cause and its siblings, repair damaged data, and close the loop with the reporter. Use when the user brings a bug report, Sentry issue or support ticket, a bug seen in production, a regression, or asks to triage or prioritize a bug backlog. Not for an error hit during local development (just debug it), an outage hurting many users right now (incident-response), or flaky tests (test-integrity).
---

# Bug triage

A bug is closed when the user's problem is gone, a test proves it, and it can't silently come back. Not when the code changed.

## 1. Intake: facts before theories

- Ask, in **one** batch, only for what's missing: steps, expected vs actual, when it started, how often, who (user or account id), environment, version or build SHA, screenshot or request id.
- Find it in the evidence: the error tracker issue, logs by request or trace id, the deploy timeline. Raw evidence beats the report's summary.
- Search for duplicates in the tracker and recent commits. Link them; keep one issue.

## 2. Severity, then priority

| Severity | Signal | Action |
|---|---|---|
| S1 | Data loss or corruption, security exposure, payments or sign-in broken for many | Live impact on many users: switch to incident-response. Security: handle privately, no details in public issues |
| S2 | Core flow broken for a segment, no workaround | This cycle |
| S3 | Workaround exists, or non-core flow | Schedule |
| S4 | Cosmetic | Batch or close |

Unsure between two levels? Pick the higher. Data being damaged right now makes it S1 regardless of user count.

## 3. Reproduce

- Smallest repro: a failing test, a script, or exact steps against prod-like data. "Cannot reproduce" means a missing fact, usually data shape, permissions, timezone, locale, concurrency, browser, feature flag or cache. Compare the reporter's context to yours one difference at a time.
- **Regression?** Find the last good version and `git bisect run <script>`. Check deploys, dependency and config changes, and flag flips around the start time.
- Still can't reproduce: add targeted logging at the suspected point, ship it, and wait for the next occurrence. Don't ship a guess as a fix.

## 4. Failing test first

Write the test that fails for the reported reason, at the lowest level that still shows the bug. Watch it fail. It becomes the regression guard.

## 5. Root cause, not symptom

- Keep asking "why" until you reach a fixable cause that explains every observation. If `superpowers:systematic-debugging` is installed, use it here.
- **Siblings:** grep for the same pattern elsewhere (the same unchecked null, timezone math, missing auth check). Fix or ticket each.
- Ask why tests, types or review didn't catch it. A cheap guard (a type, a lint rule, an assertion) beats one more test.

## 6. Fix

- Minimal change; refactors go in a separate commit.
- **Repair damaged data:** find affected records with a query, write an idempotent fix script, dry-run it and report counts, then run it. Keep the script in the repo.
- Risky fix? Behind a flag or to a canary first.

## 7. Verify

New test passes, the full suite passes, and the original repro passes in a prod-like environment. After deploy, confirm the tracker issue stops recurring in the new release before closing.

## 8. Close the loop

- Draft the reply to the reporter in plain words: what was wrong, that it's fixed, anything they need to do.
- Link the commit or PR, add a **Fixed** changelog entry if the repo keeps a changelog, close the duplicates.
- User-facing outage or data loss: write a blameless postmortem with incident-response's template and checker if it's installed.

## Triage a backlog

Label each bug with severity, area and status. Close "needs info" after 14 days without reply, saying how to reopen. Group by root cause, not symptom. Report the top 5 by impact.
