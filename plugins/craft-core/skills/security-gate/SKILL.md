---
name: security-gate
description: Security clearance gate before code ships - scans the branch diff for secrets, vulnerable dependencies and risky code paths, then writes a CLEARED or BLOCKED verdict with evidence to .claude/security-gate/. Use before opening or merging a PR, before deploying or releasing, when the user asks for a security review, security audit, security check or "clearance", or when a push is blocked for lacking a clearance. Not for general code review.
---

# Security clearance gate

The gate answers one question for one commit: **is it safe to ship this diff?** Its output is a file other tools and people can check, not a chat message.

## 1. Scope

```bash
git fetch origin --quiet || true
BASE=$(git merge-base HEAD origin/HEAD 2>/dev/null || git merge-base HEAD main)
git diff --name-only "$BASE"...HEAD
git rev-parse HEAD
```

The gate covers `BASE...HEAD` plus uncommitted changes. If the working tree is dirty, say so: the verdict only holds for committed code.

## 2. Checks, in order

Run each check that applies. Record the exact command and a summary of its output. **A check that couldn't run is not a pass.** List it under "Not checked".

1. **Secrets.** Run `gitleaks detect --log-opts="$BASE..HEAD" --no-banner` if gitleaks is installed. Otherwise grep the diff for key-shaped strings (`AKIA[0-9A-Z]{16}`, `-----BEGIN .*PRIVATE KEY-----`, `sk-[A-Za-z0-9]{20,}`, `ghp_[A-Za-z0-9]{36}`, `xox[bp]-`, and `password|secret|token\s*[:=]\s*['"][^'"]{8,}`), and check that no `.env*`, `*.pem` or `*.key` file is tracked.
2. **Dependencies.** Only when a manifest or lockfile changed, or once per release. Use the stack's own tool: `npm audit --omit=dev --audit-level=high`, `pnpm audit --prod`, `pip-audit`, `cargo audit`, `govulncheck ./...`, `bundle audit`. New dependencies: check they're maintained, the name isn't a typosquat, and they have no install scripts you didn't expect.
3. **Code paths.** Read every changed file that handles: authentication or sessions, authorization (who can read or write which record), user input reaching a query, shell, file path, template, redirect or outbound URL, deserialization, crypto, file uploads, CORS and CSP, webhooks, or secrets and config. For each, write the specific threat you checked and what you found. If the `security-audit` skill (Cloudflare) is available, use its attack classes for this step. If not, use Claude Code's built-in `/security-review` on the branch.
4. **Config and infra.** Debug flags, permissive CORS, disabled TLS verification, new open ports, IAM or token scopes, and logging of secrets or PII.

## 3. Verdict

- **BLOCKED** if there's any confirmed critical or high finding, any secret in the diff, or a known-exploitable dependency on a reachable path.
- **CLEARED WITH NOTES** if there are only medium or low findings, each with an owner or a follow-up issue.
- **CLEARED** if nothing was found and every applicable check ran.

Never clear a diff you couldn't scope. Never downgrade a finding because a fix would be inconvenient.

## 4. Write the report

Write `.claude/security-gate/<short-sha>.md`, where `<short-sha>` is `git rev-parse --short=12 HEAD`:

```markdown
# Security gate: <short-sha>
Verdict: CLEARED | CLEARED WITH NOTES | BLOCKED
Commit: <full sha>    Base: <base sha>    Date: <ISO date>
Diff: <n> files, +<a>/-<d>

## Findings
| Severity | Where | Issue | Evidence | Fix |
|---|---|---|---|---|

## Checks run
- <command> -> <result>

## Not checked
- <check> - <why>
```

Suggest adding `.claude/security-gate/` to `.gitignore` unless the team wants reports in history. Tell the user the verdict in one line and the path to the report. For BLOCKED, list the fixes in priority order and offer to make them, then run the gate again on the new commit.

## The push guard

The craft-core plugin ships a hook that runs on `git push` and `gh pr create`. If there's no report for the current HEAD, or the report says BLOCKED, it warns. With `CRAFT_SECURITY_GATE=enforce` set, it blocks instead. With `CRAFT_SECURITY_GATE=off`, it's silent.
