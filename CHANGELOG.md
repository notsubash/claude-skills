# Changelog

What changed for people who use `skills`. Newest first. Each version is a git tag (`v1.0.0`) and a [GitHub release](https://github.com/notsubash/claude-skills/releases); `skills self-update` installs the latest one.

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

[1.0.1]: https://github.com/notsubash/claude-skills/releases/tag/v1.0.1
[1.0.0]: https://github.com/notsubash/claude-skills/releases/tag/v1.0.0
