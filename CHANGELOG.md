# Changelog

What changed for people who use `skills`. Newest first. Each version is a git tag (`v1.0.0`) and a [GitHub release](https://github.com/notsubash/claude-skills/releases); `skills self-update` installs the latest one.

## [Unreleased]

### Added

- **architecture-decisions** (craft-core): size a decision as a one-way or two-way door, name at most three measurable drivers, compare options including keeping what exists, spike the riskiest unknown, then write a one-page ADR with a confirmation check and revisit triggers. Also design docs, superseding and ADR review. `check-adrs.mjs` validates an ADR folder (numbering, status, supersede links, links, index).
- **test-integrity** (craft-core): tests that would catch a real bug (public behavior, real dependencies, independent expected values, a failing test before each fix, proof each test can fail). Failing tests get fixed in the code, never by skipping, loosening or special-casing the test. `check-test-diff.mjs` checks a branch for weakened tests and for code that special-cases test inputs.
- **Test guard hook** (craft-core): before an edit or command that weakens tests (skip, `.only`, a deleted test or assertion, excluded tests or a lowered coverage threshold in config, a masked exit code, `--no-verify`), Claude asks you first. `CRAFT_TEST_GUARD=enforce` blocks instead, `warn` only tells Claude, `off` turns it off.
- **incident-response** (ops): declare, set severity, assign roles, mitigate first, post status updates on a cadence, hand off, then write a blameless postmortem. `check-postmortem.mjs` validates it.
- **context7** (third-party, Upstash, MIT): current, version-specific library docs through Context7's hosted MCP server, plus the `context7-mcp` skill that tells Claude when to use it. `skills add context7 --global`, then sign in once with `/mcp`. Your library name and question go to mcp.context7.com.
- **caveman** (third-party, Julius Brussee, Apache-2.0), a subset: `/caveman`, `/ultracave`, `/megacave` and `/caveman-help`. Upstream's hooks are left out, so it never switches itself on: it's off until you type `/caveman`, and `stop caveman` ends it.
- **[docs/playbook.md](docs/playbook.md)**: which skill to use when, with what to type, for a new project, joining an existing repo, an LLM feature, an incident, a refactor, shipping, and long sessions.
- Manim-based task evals for figure-check and human-voice.
- `SECURITY.md` and issue forms for skill misfires, CLI bugs and third-party plugins.

### Removed

- **oss-portfolio** (oss). `skills add oss` now installs oss-contribute only.

### Changed

- **All own skills trimmed and de-conflicted.** Shorter descriptions (they load into every session), with "Not for" boundaries so each request has one owner: flaky tests → test-integrity, live outages and rollbacks → incident-response, build vs buy → architecture-decisions, PRODUCT.md → project-docs, local dev errors and one-component UI fixes → no skill. Removed duplicated principles and anti-pattern lists, the CLAUDE.md "Current state" line (it contradicted "nothing that changes weekly"), and a hard-coded Windows assumption.
- **Skills stay in scope.** dep-upgrade, observability and release do the part you asked for and suggest the rest instead of reconfiguring the project; test-integrity and architecture-decisions don't add new test infrastructure or CI checks unasked.
- **bug-triage** no longer quarantines flaky tests on its own (that contradicted test-integrity and the test guard).
- **Push guard** in the default `warn` mode only speaks when the branch touches sensitive files. `enforce` still checks every push.

- project-docs sets up the ADR folder and index, and hands each decision's content to architecture-decisions.
- GitHub Actions are pinned to commit SHAs and kept current by Dependabot with a 7-day cooldown. CI fails on an unpinned action.

## [1.0.2] - 2026-11-21

### Fixed

- `skills self-update` failed with `Permission denied (publickey)`, or hung, for anyone without a GitHub ssh key: npm fetched the release tag over ssh. It now installs `github:notsubash/claude-skills#semver:<version>`, which goes over https.
- On 1.0.0 or 1.0.1? Update once by hand: `npm i -g github:notsubash/claude-skills#semver:x`. `skills self-update` works from then on.

## [1.0.1] - 2026-11-20

### Fixed

- `skills self-update` and the daily update check no longer fail with "GitHub answered 403" on shared networks. They used GitHub's API, which allows 60 requests an hour per IP address; they now read the release page, which has no such cap.

## [1.0.0] - 2026-11-20

The first release.

### The `skills` CLI

- `skills` on its own walks you through it: pick a scenario, pick where the skills live, check the plugins you want.
- Three scopes: **shared** with the repo (`.claude/settings.json`), **just me** (`--local`, git-ignored) or **everywhere** (`--global`).
- `skills use <scenario>`, `skills add <name>`, `skills remove <name>`, `skills list`, `skills info`, `skills doctor`, `skills sync`, `skills update`.
- `skills new-skill` scaffolds a skill with seven eval cases. `skills vet` scans a third-party skill before you pin it.
- Third-party plugins are pinned to reviewed commits, and `skills add` applies the safeguards from each review. impeccable needs an explicit opt-in.
- Works the same in PowerShell, cmd, bash, zsh and fish on Windows, macOS and Linux.

### Tab completion

- Completes commands, plugin, skill and scenario names, and each command's flags, in bash, zsh, fish and PowerShell.
- Sets itself up the first time you run `skills` in an interactive shell. `skills completion uninstall` turns it off for good.
- bash: also works in login shells that don't read `~/.bashrc` (macOS Terminal, VS Code on macOS, ssh), and in Git Bash when `$HOME` isn't your Windows profile folder.

### Staying current

- `skills --version` prints the version you're on.
- Once a day, `skills` checks for a newer release and prints one line when there is one: `update available: 1.0.0 → 1.1.0 · skills self-update`. It stays quiet in CI, when output is piped, and with `SKILLS_NO_UPDATE_CHECK=1`.
- `skills self-update` installs the latest release tag, not whatever is on `main`, shows `old → new`, and rewrites the tab-completion hook for every shell that has one.

### Skills

- Own bundles: **core**, **craft-core** (senior PRs, security gate, project docs, product lens, deepen), **craft-web**, **web**, **security**, **oss**, **writing** and **ops**.
- Pinned third-party plugins: superpowers, matt-eng, ponytail, security-guidance, security-audit, skill-creator, playwright-cli, impeccable, stageshow, charles-design and emil-design-eng.

[1.0.2]: https://github.com/notsubash/claude-skills/releases/tag/v1.0.2
[1.0.1]: https://github.com/notsubash/claude-skills/releases/tag/v1.0.1
[1.0.0]: https://github.com/notsubash/claude-skills/releases/tag/v1.0.0
