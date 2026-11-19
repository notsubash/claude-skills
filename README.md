# craft: personal Claude Code skills

A [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces) called **`craft`**. It holds my own skills, grouped into bundles, plus third-party skills pinned to commits I've reviewed. Installing into a project uses Claude Code's native plugin system: a project gets two small entries in `.claude/settings.json` and a lockfile. No skill files are copied into the project. Claude Code caches plugins under `~/.claude/plugins/cache/`, outside the repo.

Everything works in PowerShell and in bash.

## What's in it

| Bundle | You get | Install |
|---|---|---|
| **core** | `craft-core` (senior-pr, security-gate, project-docs, deepen + the first-prompt hook and the push guard), [superpowers](https://github.com/obra/superpowers), [Matt Pocock's](https://github.com/mattpocock/skills) grill-with-docs / grilling / domain-modeling / codebase-design / to-spec / to-tickets, and [ponytail](https://github.com/DietrichGebert/ponytail) | `skills add core` |
| **web** | `craft-web` (ui-pipeline), [stageshow](https://github.com/benjitaylor/skills), [charles-unslop and charles-polish](https://github.com/LemonFace0309/charles-skills), [emil-design-eng](https://github.com/emilkowalski/skills), [playwright-cli](https://github.com/microsoft/playwright-cli). [impeccable](https://github.com/pbakaus/impeccable) is opt-in, see below | `skills add web` |
| **security** | Anthropic's [security-guidance](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/security-guidance) hooks and Cloudflare's [security-audit](https://github.com/cloudflare/security-audit-skill) | `skills add security` |
| **oss** | oss-contribute, oss-portfolio | `skills add oss` |
| **writing** | human-voice, figure-check | `skills add writing` |

`skills list` prints the full list, with each third-party pin. Every third-party plugin also installs on its own (`skills add playwright-cli`). Your own skills install by the plugin that contains them: `skills add senior-pr` installs `craft-core`, since Claude Code installs plugins, not single skills.

### The workflow these encode

1. **Think:** the `deepen` hook rewrites your first prompt of each session into a deeper one and waits for your OK. Then `grill-with-docs` interviews you and records ADRs and a glossary.
2. **Document:** `project-docs` sets up a lean CLAUDE.md, PRODUCT.md, decision log, ADRs and backlog.
3. **Plan:** superpowers `brainstorming`, then `writing-plans`, or Matt's `to-spec` and `to-tickets`.
4. **Build:** superpowers `test-driven-development` and `subagent-driven-development`, `domain-modeling` and `codebase-design` for DDD and deep modules, and ponytail to keep it simple.
5. **UI:** `ui-pipeline` runs impeccable (when installed; otherwise a built-in critique), then stageshow, then charles-unslop, then emil-design-eng, verified with playwright-cli screenshots.
6. **Ship:** `security-gate` writes a CLEARED or BLOCKED report, the push guard checks it on `git push` and `gh pr create`, and `senior-pr` writes the commits and PR.

## Set up the CLI (once)

Needs Node 22+, git, and Claude Code 2.1.300+ (`npm i -g @anthropic-ai/claude-code@latest`). `gh` is optional (used by `update --dry-run` and oss-portfolio).

```powershell
git clone https://github.com/notsubash/claude-skills $HOME\claude-skills
# PowerShell: put bin\ on PATH for this user
[Environment]::SetEnvironmentVariable('Path', "$env:Path;$HOME\claude-skills\bin", 'User')
```

```bash
git clone https://github.com/notsubash/claude-skills ~/claude-skills
echo 'export PATH="$PATH:$HOME/claude-skills/bin"' >> ~/.bashrc
```

Or skip PATH and run `node ~/claude-skills/cli/skills.mjs <command>`.

## Install a bundle into a project

```bash
cd my-project
skills add core            # or: skills add web --project ../other-project
skills doctor              # checks Claude Code version, settings, lockfile, local install
```

What that does, all through the native CLI:
1. `claude plugin marketplace add notsubash/claude-skills --scope project` adds `extraKnownMarketplaces.craft` to `.claude/settings.json`.
2. `claude plugin install core@craft --scope project` adds `enabledPlugins` entries for core and its dependencies.
3. It writes `.claude/craft.lock.json`: the marketplace commit, each plugin's version and the pinned SHA of each third-party plugin.

Commit `.claude/settings.json` and `.claude/craft.lock.json`. **Project settings enable plugins but don't download them.** Each other clone or machine runs `skills add core` once (or `claude plugin install core@craft --scope project`).

Other commands:

```bash
skills list                    # bundles, third-party pins, what's enabled here
skills remove core             # uninstalls core plus dependencies nothing else needs; removes empty settings keys
skills update --dry-run        # what would change, with upstream compare links and changed files
skills update                  # apply: marketplace update + plugin update, then refresh the lockfile
```

Use `--source local` to install from your clone instead of GitHub, for trying out unpushed changes. Plugins from a local directory marketplace are read in place, so edits apply on the next session or `/reload-plugins`.

### Safeguards (applied automatically)

Every third-party plugin was read line by line before adoption ([third_party/REVIEW.md](third_party/REVIEW.md)). `skills add` applies these safeguards from that review, and `skills remove` takes them out again:

| Plugin | What `skills add` sets | Why |
|---|---|---|
| superpowers | `env.SUPERPOWERS_DISABLE_TELEMETRY=1` in project settings | No third-party logo request from the brainstorming page |
| ponytail | plugin options `ledger=false`, `sendNames=false` (via `claude plugin configure`, stored in your user settings) | No prompt snippets in `~/.config/ponytail` or in any webhook |
| security-guidance | `env.SECURITY_REVIEW_MODEL` and `env.SG_AGENTIC_MODEL` set to `claude-sonnet-5-5` | Per-turn reviews on Sonnet instead of uncapped Opus |
| playwright-cli | deny `playwright-cli attach`; ask before `cookie-*`, `state-save/load`, `run-code`, `kill-all`, `delete-data` | Never attach to your everyday browser profile. Deny and ask rules beat the skill's pre-approval |
| impeccable | not in any bundle; `skills add impeccable` refuses without `--accept-impeccable` | Its hooks run a prebuilt engine binary nobody can review, with network access, on every edit |

`--no-safeguards` skips them. Project `env` values take effect once you trust the folder. `skills doctor` checks the safeguards are in place. Two things stay manual: decline ponytail's offer to add a statusLine, and decline impeccable's account sign-in if you install it.

### Switches

| Setting | Effect |
|---|---|
| `CRAFT_DEEPEN=off` | Turns off the first-prompt deepen hook everywhere. A prompt starting with `!raw` turns it off for that session. |
| `CRAFT_SECURITY_GATE=warn` (default), `enforce`, `off` | Push guard: warn when HEAD has no CLEARED report, block it, or stay silent. |

Put them in your shell profile, or in the `env` block of `~/.claude/settings.json`.

## Create your own skill

```bash
skills new-skill api-contract --bundle craft-core --description "Design and review HTTP API contracts ... Use when ..."
```

This creates `plugins/craft-core/skills/api-contract/SKILL.md` from `templates/skill/`, plus seven eval cases under `plugins/craft-core/evals/api-contract-*`. Then follow the [skill-creator](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/skill-creator) loop. Installing `skill-creator@craft` gives you its helpers too.

1. **Write the description first.** It's what makes the skill trigger. Say what the skill does, then "Use when ..." with the words you'd actually type, and name a near-miss it isn't for.
2. **Write the body** as the steps a top professional takes, in order, under 500 lines. Put reference detail in sibling files. Write scripts in Node or Python so they run in both shells.
3. **Fill in the evals:** 3 prompts that should trigger it, 3 near-misses that shouldn't, and 1 real task with graders (`llm` criteria plus free `regex` and `file_exists` checks).
4. **Run them:**
   ```bash
   claude plugin validate plugins/craft-core
   claude plugin eval plugins/craft-core --case "api-contract-*trigger*" --ablation none --runs 3 --no-publish
   claude plugin eval plugins/craft-core --case "api-contract-task*" --ablation with-without --runs 3 --no-publish
   ```
5. **Iterate** on the description and body until triggers pass and the task beats the no-skill baseline. `node scripts/ci-check.mjs` enforces the eval coverage.

Bundles with dependencies (`core`, `web`) must not contain skills, because `claude plugin eval` can't load a plugin whose dependencies are missing. Skills go in the dependency-free `craft-*` plugins, and the bundle depends on them.

## Add a third-party skill you like

Third-party skills aren't copied into this repo. A marketplace entry points at the upstream repo at a reviewed commit, and Claude Code fetches exactly that commit.

1. **Pick the commit**, and use a full SHA, never a branch: `gh api repos/OWNER/REPO/commits/main --jq .sha`
2. **Vet it:**
   ```bash
   skills vet OWNER/REPO --sha <40-char-sha> --path skills/the-skill --name the-skill
   ```
   This checks the repo out in a temp folder, scans every file (scripts, hooks, network, process spawning, secrets access, home-directory writes, package installs, prompt-injection phrases, hidden unicode) and drafts `third_party/reviews/the-skill.md`. **Then read the files yourself**: every SKILL.md and file it loads, every hook config, and every script a hook or skill runs. A clean scan is a reading list, not a verdict.
3. **Add the marketplace entry** in `.claude-plugin/marketplace.json`, with `"category": "third-party"`:
   - Whole plugin: `"source": { "source": "url", "url": "https://github.com/OWNER/REPO.git", "sha": "<sha>" }`
   - One folder (a plugin, or a folder with `SKILL.md` at its root): `"source": { "source": "git-subdir", "url": "...", "path": "skills/the-skill", "sha": "<sha>" }`
   - A subset of skills from a folder that has no `plugin.json`: add `"strict": false, "skills": ["./a", "./b"]` (see `matt-eng`).
4. **Add the review** to `third_party/manifest.json`: upstream, path, SHA, license, hooks, scripts, network, and a short security note.
5. Write the findings into `third_party/REVIEW.md` too. Then optionally add it to a bundle's `dependencies`. Then `node scripts/ci-check.mjs` and open a PR. CI fails if a pin is not a full SHA or has no matching review.

## Update a pinned third-party skill safely

1. `skills update --dry-run` in any project that uses it (or check upstream) shows the new commit, a compare link and the changed files under the pinned path.
2. **Review only the diff** between the old and new SHA: `https://github.com/OWNER/REPO/compare/<old>...<new>`. Look hard at new or changed hooks, scripts, `allowed-tools`, network calls, install steps and, for impeccable, `engine-checksums.txt`.
3. Run `skills vet OWNER/REPO --sha <new> --path ...` for a fresh scan of the new tree.
4. Bump the SHA in **both** `marketplace.json` and `third_party/manifest.json`, and update the review note and date. CI rejects a bump made in one file only.
5. Merge, then in each project: `skills update`.

To roll back, revert the commit and run `skills update`.

## Proof it works

- **CI** (`.github/workflows/ci.yml`), on clean `ubuntu-latest` and `windows-latest` runners with a pinned Claude Code version:
  1. `claude plugin validate` on the marketplace and every plugin
  2. `scripts/ci-check.mjs`: full-SHA pins, a review entry for every pin, skill frontmatter rules, and eval coverage
  3. `scripts/install-test.mjs core`: installs core into an empty git project with an isolated config, starts a fresh `claude -p` session, compares the skills in its init event against `tests/expected/core.json` exactly, uninstalls, and requires `git status --porcelain` to be empty. It needs no API key.
- **Evals:** every own skill has 3 should-trigger cases, 3 should-not-trigger cases and 1 task case, run with `claude plugin eval`. Trigger cases run one-arm. Task cases run with and without the plugin. In CI they're a manual job (`workflow_dispatch` with `evals: true`) and need an `ANTHROPIC_API_KEY` repository secret. Latest results: [evals/REPORT.md](evals/REPORT.md).

## Layout

```
.claude-plugin/marketplace.json   the craft marketplace: own plugins + pinned third-party entries
plugins/<name>/                   own plugins (craft-core, craft-web, oss, writing) and bundles (core, web, security)
  skills/<skill>/SKILL.md
  evals/<skill>-{trigger,no-trigger,task}-N/prompt.md + graders/
  hooks/                          craft-core only: deepen.mjs, push-guard.mjs
third_party/manifest.json         one review per pinned third-party plugin
third_party/reviews/              drafts from `skills vet`
cli/skills.mjs                    the CLI (bin/skills, bin/skills.cmd, bin/skills.ps1 are shims)
scripts/                          ci-check.mjs, install-test.mjs
templates/                        new-skill templates
tests/expected/core.json          the exact skill set a core install must produce
```
