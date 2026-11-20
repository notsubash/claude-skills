---
type: llm
weight: 2
---

Judge whether this is a maintenance routine an experienced operator would set up.
It separates cadences (at least weekly and monthly) instead of one undifferentiated list.
Weekly checks include new or top errors in Sentry and dependency or security updates.
It includes actually testing a backup restore, not only confirming backups exist.
It includes certificate or domain expiry, and at least one of: secret rotation, access review, stale feature flags, runtime end-of-life.
It makes the routine recurring with a concrete mechanism (a scheduled job, cron, GitHub Actions schedule, or calendar block) and produces a short written report or log with actions.
It is sized for a solo developer (a short time budget), not an enterprise process.
