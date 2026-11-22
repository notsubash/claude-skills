---
name: senior-pr
description: Write commits and pull requests the way a senior engineer would - one focused conventional commit per logical change, and a PR body covering what changed, why, the risk and how it was tested. Use when the user asks to commit, push, open or raise a PR, or write or fix a PR title, PR body or commit message. Not for reviewing someone else's PR.
---

# Senior PR

A reviewer should understand the change, trust it, and know how to check it, without reading your chat history.

## 1. Look before writing

Read the real diff; don't write from memory of the session.

```bash
git status --short
git log --oneline -15
git diff --stat <base>...HEAD
git diff <base>...HEAD
```

`<base>` is the branch the PR targets (usually `main`; check `gh repo view --json defaultBranchRef`). For a PR, also read `CONTRIBUTING.md`, `.github/pull_request_template.md` and the last 5 merged PRs (`gh pr list --state merged --limit 5`) if they exist. **The repo's conventions beat this skill.**

## 2. Commits

- One commit per logical change. It builds and passes tests on its own.
- Conventional commits unless the repo uses something else: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `perf:`. Add a scope when the repo uses scopes: `fix(sync): ...`.
- Subject: imperative, at most 72 characters, no trailing period. Say what the change does ("fix: keep free-email leads in CRM sync", not "fixed bug").
- Body, when the why isn't obvious: the problem, the cause, and why this fix. Wrap at 72 characters.
- Review fixes: new commits, or `git commit --fixup=<sha>` plus autosquash when the repo keeps per-commit history.
- Commit only when the user asked. Never commit secrets, `.env` files or generated output. Never skip hooks.

## 3. PR title

Same rules as a commit subject. It describes the change, never the process. **No internal planning words** in the title or body: phase, task, gate, sprint, ticket IDs from a private plan, "as discussed". A stranger should understand it.

## 4. PR body

Use the repo's template if it has one. Otherwise:

```markdown
## What
One or two sentences on the behavior change, from the user's or caller's point of view.

## Why
The problem, with evidence: the issue link (`Closes #123`), the error, the bug report.

## How
The approach and the key decisions, including the alternative you rejected and why.
Point at the one file a reviewer should read first.

## Risk
What could break, who is affected, migrations, config or env changes, and how to roll back.
Write "Low: <reason>" when that's true. Don't leave the section out.

## Testing
The exact commands you ran and what they showed. New tests and what each one proves.
Manual checks, with screenshots for UI changes. Anything you did not test, said plainly.
```

- Every claim is something you checked in this session. If you didn't run the tests, say so.
- Keep it short. A 3-line fix gets a 6-line body.

## 5. Hand it over

When the user asks for the body, give it **as raw Markdown inside a fenced block**. When asked to push or open the PR: push the branch, then `gh pr create --title ... --body-file <file>`, and report the PR URL.

If `security-gate` is installed and the diff touches auth, input handling, secrets, dependencies or network code, run it before opening the PR and put its verdict under Risk.
