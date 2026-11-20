---
name: maintenance-routine
description: Run the recurring health check for a live app - weekly errors, SLO burn, dependency PRs past their cooldown, advisories, failed or flaky CI, stale PRs and support themes; monthly backup restore test, certificate and domain expiry, secret rotation, access review, stale feature flags and runtime end-of-life; quarterly alert pruning, SLO review and disaster-recovery drill - ending in a red, amber, green report with owned actions, and set it up to run on a schedule. Use when the user asks for a weekly or monthly maintenance check, an ops or health review, a maintenance checklist, keeping the app healthy after launch, or to schedule recurring checks. Not for fixing one specific bug (bug-triage) or doing the dependency updates themselves (dep-upgrade).
---

# Maintenance routine

Production degrades quietly: certificates expire, backups stop working, flags pile up, dependencies age. A short, fixed routine catches it before users do. The routine finds and routes problems; the other skills fix them.

## 1. Look first

Find the previous report (default `docs/ops/`) and carry over open actions. Find what tools exist: error tracker, dashboards, CI, the update bot, hosting and billing consoles, `gh`. If something can't be checked from here, list it as a manual step for the user rather than guessing.

## 2. Weekly (30–60 minutes)

| Check | How | Route to |
|---|---|---|
| New and top errors since last week, by release | Error tracker, sorted by users affected | bug-triage |
| SLO and error budget burn | Dashboard; budget used vs plan | observability, or reliability work if over |
| Dependency PRs that cleared the 7-day cooldown; new advisories | Update bot PRs, `npm audit` or equivalent, reachability | dep-upgrade |
| Failed or flaky CI on main | `gh run list --branch main --status failure` | bug-triage (flaky section) |
| Open PRs and branches older than 2 weeks | `gh pr list`, `git branch -r --sort=committerdate` | Close or finish |
| Support and feedback themes | Inbox, tickets, reviews: top 3 recurring | product-lens |
| Cost anomalies | Billing console, week over week | Investigate if up >20% unexplained |

## 3. Monthly

- **Restore a backup** to a scratch environment and query it. A backup you haven't restored is a hope, not a backup. Record restore time.
- TLS certificates and domains: expiry dates more than 30 days away, auto-renew working.
- Secrets and tokens due for rotation; tokens with no expiry; unused API keys.
- Access review: remove people and integrations that no longer need access (hosting, DB, registry, GitHub, error tracker).
- Feature flags at 100% for more than two weeks: remove them (release skill).
- Runtime and framework end-of-life dates (Node, Python, database version) inside the next 6 months: plan the upgrade.
- Storage and database growth trend; slow queries list.

## 4. Quarterly

- Prune alerts: delete or downgrade any that fired without needing action or never fired.
- Review SLO targets against what users actually needed.
- Disaster-recovery drill: rebuild a service from scratch with the docs. Fix the docs where they were wrong.
- Tech debt review, stated as cost (days lost per feature, incidents caused), not taste.
- License and dependency inventory; drop unused packages.

## 5. Report

Write `docs/ops/YYYY-MM-DD.md` (or post where the team reads it):

```
# Ops check YYYY-MM-DD
Overall: GREEN | AMBER | RED

| Area | Status | Finding | Action | Owner | Due |
```

Keep it to one screen: findings and actions only, no restating what was healthy beyond the status column. Carry unfinished actions forward and flag any carried twice.

## 6. Make it recurring

A routine that depends on memory stops in a month. Offer one:
- **Claude Code `/schedule`**: a cloud routine that runs this skill weekly and writes the report.
- **GitHub Actions `schedule:` cron** for the scriptable checks (certificate expiry, `npm audit`, stale PRs), opening an issue on findings.
- A calendar slot for the manual steps (backup restore, access review).

## 7. Verify

Each line in the report cites its source (a link, a command and its output, or "manual: not checked"). Nothing is marked GREEN without having been checked this run.
