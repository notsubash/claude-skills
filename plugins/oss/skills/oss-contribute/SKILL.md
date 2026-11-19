---
name: oss-contribute
description: Contribute to an open-source repo the way its maintainers want - set up the fork and upstream remote, read the contribution rules, pick and scope an issue, fix it test-first on its own branch, and open a PR that follows the project's conventions, while teaching the user each step so they make the changes themselves. Use when the user forked or cloned a repo to contribute, wants to take an issue, asks which issue to pick, or wants to send fixes upstream.
---

# Open-source contribution

The maintainer's time is the scarce resource. A contribution that follows the rules, stays small and proves itself with tests gets merged. Everything else waits.

## 1. Set up (once per clone)

```bash
git remote -v                                  # origin = your fork?
git remote add upstream https://github.com/<owner>/<repo>.git   # if missing
git fetch upstream
git switch main && git merge --ff-only upstream/main
```

Then read, in full: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `.github/PULL_REQUEST_TEMPLATE*`, `.github/ISSUE_TEMPLATE*`, the CI workflows (they're the real definition of "passes"), and any `AGENTS.md` or `CLAUDE.md`. Write down the rules that matter: commit format, sign-off (`-s`, DCO), changelog entries, test commands, the lint and format commands, and whether an issue must be assigned before work starts.

Build and run the test suite once before changing anything, so you know which failures were already there. Tell the user which local-environment failures you'll ignore and why.

## 2. Pick the issue

When the user offers several: rank them by what can be verified without accounts or paid services, then by size, then by the maintainer's signals (`good first issue`, assigned, recent maintainer comments). Read the whole issue thread and the linked PRs: someone may already be on it, or the maintainer may have said how they want it done. **If the maintainer stated an approach, follow it.**

## 3. Fix

- One issue, one branch: `git switch -c fix/<issue-number>-<slug>`.
- Reproduce first. Write a failing test that shows the bug, then fix it, then watch the test pass.
- Smallest change that fully solves the issue. No drive-by refactors or reformatting. Open a separate issue for anything else you notice.
- Match the surrounding code style, even where you'd do it differently.
- Run exactly what CI runs: lint, types, tests.

**Teach mode (the default):** before each change, explain what you'll change and why, show the command or the diff, and let the user run or apply it when they've asked to do the work themselves. Explain every git command the first time you use it.

## 4. Commits and PR

Follow the repo's format. If there isn't one, use the `senior-pr` skill from craft-core. The PR:
- Title in the repo's style, referencing the issue only if they do (`fix(cli): ... (#123)`).
- Body: `Closes #<n>`, what changed and why, how you tested (the commands), and anything the maintainer should decide.
- Fill in every checkbox in their template truthfully.
- If a maintainer asks for changes, apply them as new commits (or fixups if they squash), reply to each comment, and re-request review.

## 5. After the PR

Once it's merged: delete the branch and any worktree, then sync `main` from upstream. If the user keeps a portfolio of contributions, offer `oss-portfolio`.
