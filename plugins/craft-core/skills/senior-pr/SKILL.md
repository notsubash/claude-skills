---
name: senior-pr
description: Write commits and a pull request the way a senior engineer would - one focused commit per logical change with a conventional message, and a PR body that states what changed, why, the risk, and how it was tested. Use when the user asks to commit, raise or push a PR, write or fix a PR body or title, "give the PR body", write commit messages, or make the PR "senior". Not for reviewing someone else's PR.
---

# Senior PR

A reviewer should understand the change, trust it, and know how to check it, without reading your chat history.

## 1. Look before writing

Run these and read the output. Don't write from memory of the session.

```bash
git status --short
git log --oneline -15
git diff --stat <base>...HEAD
git diff <base>...HEAD
```

`<base>` is the branch the PR targets (usually `main`; check `gh repo view --json defaultBranchRef`). Read `CONTRIBUTING.md`, `.github/pull_request_template.md` and the last 5 merged PRs (`gh pr list --state merged --limit 5`) if they exist. **The repo's conventions beat this skill.**

## 2. Commits

- One commit per logical change. It builds and passes tests on its own.
- Conventional commits unless the repo uses something else: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `perf:`. Add a scope when the repo uses scopes: `fix(sync): ...`.
- Subject: imperative, at most 72 characters, no trailing period. Say what the change does, not what you did ("fix: keep free-email leads in CRM sync", not "fixed bug").
- Body, when the why isn't obvious: the problem, the cause, and why this fix. Wrap at 72 characters.
- Review fixes go in as `git commit --fixup=<sha>` when the repo squashes, so history stays one-commit-per-change.
- Commit only when the user asked. Never commit secrets, `.env` files or generated output. Never skip hooks.

## 3. PR title

Same rules as a commit subject. It describes the change, never the process. **Never put internal planning words in a title or body**: phase, task, ticket IDs from a private plan, gate, sprint, "as discussed". A stranger should understand it.

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
The exact commands you ran and what they showed. New tests added and what each one proves.
Manual checks, with screenshots for UI changes. Anything you did not test, said plainly.
```

Rules:
- Every claim in the body is something you checked in this session. If you didn't run the tests, say so.
- Keep it short. A 3-line fix gets a 6-line body.
- For an open-source repo, link the issue, follow its PR checklist, and thank no one in the body.

## 5. Hand it over

When the user asks for the body, give it **as raw Markdown inside a fenced block** so it pastes cleanly. When asked to push or open the PR: push the branch, then `gh pr create --title ... --body-file <file>`. Report the PR URL.

If the `security-gate` skill (craft-core) is installed and the change touches auth, input handling, secrets, dependencies or network code, run `security-gate` before opening the PR and mention its verdict under Risk.
