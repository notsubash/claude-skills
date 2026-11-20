---
name: release
description: Ship a release safely after the PR is merged - version it, write a user-facing changelog, check migrations are backward compatible, deploy as an immutable artifact through progressive rollout with predefined rollback triggers, watch errors and SLOs against the previous release, tag it, handle hotfixes, and schedule feature-flag cleanup. Use when the user asks to cut, tag or publish a release, bump the version, write a changelog or release notes, deploy to production, roll back, ship a hotfix, set up release-please or changesets, or plan a rollout or flag cleanup. Not for writing commits or the PR itself (use senior-pr) or for dependency updates (use dep-upgrade).
---

# Release

Deploying puts code on servers; releasing exposes it to users. Keep them separate, make every step reversible, and decide what "bad" looks like before you ship.

## 1. Look first

How releases happen today: CI/CD pipeline, hosting, artifact type, existing tags and versions, `CHANGELOG.md`, release tooling (release-please, changesets, semantic-release), feature-flag system, migration tool. Follow the existing process; improve one thing at a time.

## 2. Version

- **Libraries, APIs, CLIs, SDKs:** SemVer. Breaking change = major; deprecate one minor release before removing.
- **Web apps:** a date or build number is fine. What matters is that every running build reports its git SHA (in a `/version` endpoint, logs and error tracker), so any error maps to code.
- Conventional Commits plus release-please or changesets can propose the version and changelog; a human edits the result.

## 3. Pre-release checks

- Main is green; the exact artifact that passed CI is what ships. Build once, promote the same artifact through environments; never rebuild for prod.
- **Migrations are backward compatible** (expand → migrate → contract): add columns and tables first, deploy code that writes both, backfill, switch reads, remove old columns in a later release. A migration that the previous code version can't run against blocks rollback.
- New behavior is behind a flag, default off, when it's risky or needs a staged rollout.
- Rollback plan written: the previous artifact id and the command to redeploy it, plus what to do about data written meanwhile.
- **Rollback triggers decided now:** for example error rate above 2× the previous release, p95 latency up 20%, a new error tracker issue on a critical flow, or a burn-rate page.

## 4. Changelog and notes

Keep a Changelog format: `## [x.y.z] - YYYY-MM-DD` under an `Unreleased` section, grouped as Added, Changed, Deprecated, Removed, Fixed, Security. Write for users: what changed for them and what they must do. Never paste the git log. Call out breaking changes and migrations at the top.

## 5. Deploy progressively

1. Deploy to staging; smoke test the critical journeys.
2. Production canary or a small percentage (or one region). Watch the error tracker, golden signals and SLO burn for this release vs the previous one, for a set time (15–60 min, longer for low traffic).
3. Widen in steps (for example 10% → 50% → 100%), checking the triggers at each step.
4. Trigger hit: **roll back first, investigate second.** Redeploy the previous artifact or turn the flag off; don't revert-and-rebuild under pressure.

Mobile and desktop can't roll back: use staged store rollouts, server-side kill switches, and a minimum-version gate.

## 6. Tag and publish

Annotated tag on the released commit (`git tag -a v1.4.0 -m "..."`), GitHub release with the changelog section, the artifact or package published from CI only (trusted publishing, no long-lived tokens on laptops).

## 7. After release

- Confirm the metric the change was meant to move is instrumented and being recorded (product-lens).
- Close the linked issues; tell users who asked.
- **Flag cleanup:** release flags should live one to two weeks. Open the removal ticket when the flag is created; remove the flag and its dead branch once at 100% and stable.

## 8. Hotfix

Branch from the released tag, smallest possible fix with a regression test, the **same** pipeline and checks (no skipping tests because it's urgent), patch version, deploy progressively but faster, then merge back to main so the fix isn't lost in the next release.

## 9. Verify and report

Report: version and tag, changelog entry, migration safety (expand/contract step), rollout stages with the metrics observed at each, rollback triggers and whether any fired, flags to remove and their ticket.
