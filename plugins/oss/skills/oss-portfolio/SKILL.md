---
name: oss-portfolio
description: List the user's merged pull requests across GitHub (or in one repo) with titles and labels, and update their open-source contributions page or CV markdown from that list. Use when the user asks for their merged PRs, "my contributions", PRs with labels or tags, or to update an OSS contributions README, portfolio or CV section.
---

# OSS portfolio

Always start from GitHub's data, not from memory or from the old page.

## 1. Fetch

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/oss-portfolio/scripts/merged-prs.mjs" --json > merged-prs.json
```

Options: `--repo owner/name` limits it to one repo. `--since YYYY-MM-DD` limits by date. `--include-own` keeps PRs to repos the user owns (they're dropped by default, since those aren't contributions to other people's projects). The script uses the `gh` CLI, so the user needs to be logged in (`gh auth status`). It prints the PR number, repo, title, merge date, labels and URL. Run it again without `--json` for a readable table.

If the user is inside one repo and asks for "my merged PRs here", pass `--repo` with that repo's `owner/name` from `gh repo view --json nameWithOwner`.

## 2. Update the page

Read the target file (for example `open-source-contributions/README.md`) and keep its structure, headings and tone. Then:
- Group entries the way the file already does (usually by project), newest first.
- One line per PR: `[#123](url) title` plus the labels, when the file shows labels.
- Keep any hand-written context the user added to existing entries.
- Leave merge dates out unless the file already shows them.
- Leave out PRs that were reverted or are only chores, if the user asks for highlights only.

Show the diff before writing. Don't commit unless asked.
