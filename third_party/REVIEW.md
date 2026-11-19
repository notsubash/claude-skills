# Third-party reviews

Every non-binary file of every pinned third-party plugin was read line by line on 2026-11-19, by 13 reader subagents (Opus 5.5 at medium effort for code, Haiku 5.5 for Markdown and tests) working in fresh contexts on checkouts of the exact pinned commits. Nothing was executed. Claims marked **verified** were re-checked by hand against the source. `manifest.json` holds the machine-readable summary.

**Bottom line:** nothing malicious anywhere. The findings are about defaults, cost, privacy and how hard some skills push the model. The settings recommended below are listed in [Recommended settings](#recommended-settings).

| Plugin | Files read (lines) | Verdict | Biggest issue |
|---|---|---|---|
| [superpowers](#superpowers) | 231 (~37k) | adopt with notes | Forceful "you MUST use skills" prompt injected into every session |
| [matt-eng](#matt-eng) | 26 (~1.2k) | adopt with notes | References `/triage` and `/wayfinder`, which aren't in the subset |
| [ponytail](#ponytail) | 170 (~18.8k) | adopt with notes | Ledger on by default writes prompt snippets to `~/.config/ponytail` every turn |
| [security-guidance](#security-guidance) | 96 (~34k) | adopt with notes | Unpinned `pip install`; sends diffs of all changed files every turn, Opus cost, no hourly cap |
| [security-audit](#security-audit) | 22 (~5.4k) | adopt with notes | Validators refuse all input on native Windows |
| [skill-creator](#skill-creator) | 20 (~5.9k) | adopt with notes | Eval viewer has no Origin check; optimizer broken on native Windows |
| [playwright-cli](#playwright-cli) | 11 (~2.3k) | adopt with notes | Pre-approves `attach` to your everyday browser profile |
| [impeccable](#impeccable) | 70 (~21.6k) | adopt with care (opt-in) | Hooks run an unreadable prebuilt binary with network access on every edit |
| [stageshow](#stageshow) | 369 (~53k) | adopt with notes | Asks to `npm i -D playwright-core` in your project; app-icon artwork isn't MIT |
| [charles-design](#charles-design) | 8 (~0.9k) | adopt | Markdown only |
| [emil-design-eng](#emil-design-eng) | 1 (685) | adopt with notes | Points at a `choreograph` skill that isn't pinned |

## superpowers
obra/superpowers @ `22f0b46` · MIT
- **Only hook:** SessionStart (startup, clear, compact) injects the whole `using-superpowers` skill wrapped in `<EXTREMELY_IMPORTANT>`. **Verified:** "If you think there is even a 1% chance a skill might apply … you ABSOLUTELY MUST invoke the skill" and "YOU DO NOT HAVE A CHOICE". It is softened by its own line 65: "User instructions (CLAUDE.md, AGENTS.md…) take precedence over skills". Expect more skill and subagent use on small tasks.
- **Brainstorming companion** (opt-in local server, 127.0.0.1, random key, constant-time check, path confinement) loads `https://primeradiant.com/brand/…logo.png?v=<version>` on each render unless `SUPERPOWERS_DISABLE_TELEMETRY`, `DISABLE_TELEMETRY` or `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` is set (**verified** `server.cjs:106-110`).
- `subagent-driven-development` and `executing-plans`: "Do not pause to check in with your human partner between tasks". They stop only for destructive, security-sensitive or outside-worktree actions, or a broken plan. They use many subagents (an implementer and a reviewer per task, up to 5 fix rounds). `diagnosing-superpowers` fans out to 7 analysts.
- `using-git-worktrees` runs `npm install`, `pip install` and `cargo build` in a new worktree without asking each time.
- Runtime has no network calls, installs or credential reads. Test runners (manual only) use bypass permissions and live API calls: don't run them casually.

## matt-eng
mattpocock/skills @ `5863806`, 8 skills · MIT
- Markdown only, no `allowed-tools`. `grilling`, `domain-modeling` and `codebase-design` are model-invocable. The rest are manual.
- `setup-matt-pocock-skills` may run `git init` / `git remote add origin <url>`, edits CLAUDE.md or AGENTS.md after you review a draft, and creates tracker labels with `gh`.
- `to-spec` publishes to your issue tracker and adds a label with no separate review step (manual invoke only).
- `improve-codebase-architecture` writes an HTML report to the OS temp folder and opens it. The page loads `cdn.tailwindcss.com` and `mermaid@11` (major-version pin).
- **Broken references:** `/triage` and `/wayfinder` are mentioned in setup and tracker docs but aren't in this subset.

## ponytail
DietrichGebert/ponytail @ `96608e0` · MIT
- **Hooks:** SessionStart injects the ruleset plus a "codebase map". It scans up to 4,000 repo files, keeps identifiers only, and turns off with `PONYTAIL_MAP=0`. SubagentStart injects the ruleset into every subagent. UserPromptSubmit watches for `/ponytail` commands. A status-band module runs every turn.
- **Network:** only the optional webhook, and only if you set `webhookUrl`. It would send the full session id, project, cost, tokens, model and the first 60 characters of your first prompt (`sendNames` defaults to true).
- **Local data:** `ledger` defaults to **true**: a CSV row per turn plus `board.html` in `~/.config/ponytail/band/`, including task names (prompt snippets).
- Once, it tells the model to "proactively offer" a statusLine using `powershell -ExecutionPolicy Bypass -File …ponytail-statusline.ps1`. The script itself is harmless. It copies statusline scripts into `~/.claude` every session.
- The ruleset changes behavior: minimal diffs, `shortcut:` comments in your code, a closing "skipped/risk" line. It keeps validation and security and doesn't tell the model to skip tests. Benchmarks (manual) run with bypass permissions and execute model-written code unsandboxed.

## security-guidance
anthropics/claude-plugins-official @ `df9699a`, `plugins/security-guidance` · Apache-2.0
- **Install:** SessionStart (and PostToolUse when missing) runs `pip install claude-agent-sdk` with **no version pin, no hashes, and your default index** into `~/.claude/security/agent-sdk-venv`. On Windows the agentic reviewer runs the `claude.exe` bundled inside that wheel.
- **Data sent:** the Stop review sends diffs of **every** changed source file since the turn snapshot, including your own edits: up to 30 files, 80 KB each, 400 KB total. Secrets are filtered by file name only, so a key inside a `.py` or `.json` file is sent. Commit and push reviews let an agent Read, Grep and Glob, not confined to the repo.
- **Cost:** about one Opus call (effort high) per code-changing turn with **no hourly cap**, plus up to 3 agentic passes per commit or push (capped at 20 per hour each). It doesn't show in Claude Code's cost display. Turn it down with `SECURITY_REVIEW_MODEL`, `SG_AGENTIC_MODEL`, `ENABLE_STOP_REVIEW=0`, `ENABLE_COMMIT_REVIEW=0`.
- Numeric telemetry goes to Anthropic via Claude Code; the README doesn't mention it. It writes unreferenced git objects into `.git` on dirty prompts. Needs Git Bash on Windows.
- Good: no shell injection, TLS never disabled, credentials never logged, git hardened against repo hooks and config.

## security-audit
cloudflare/security-audit-skill @ `c1c8a8c`, `skills/security-audit` · MIT
- The skill tells the agent to build and run the audited target (fuzzers, browsers) "in an OS-enforced sandbox" without saying which. On Windows there's none, so treat execution as off.
- Full-audit output defaults to `~/security-audit-skill/<repo>/` (outside the project). No rule says to redact found secrets in reports. The agent budget defaults to unlimited.
- **Verified:** both `.cjs` validators refuse every input on native Windows, because Node there has no `O_NOFOLLOW` / `O_NONBLOCK`. They work on Linux, macOS and WSL.

## skill-creator
anthropics/claude-plugins-official @ `df9699a`, `plugins/skill-creator` · Apache-2.0
- No hooks. Every subprocess uses an argv list, and `claude -p` runs without permission flags.
- The eval viewer binds 127.0.0.1 (**verified**) but its `POST /api/feedback` has no Origin or Host check, so a web page open in your browser could overwrite `feedback.json`, which Claude is then told to read. It also SIGTERMs whatever owns port 3117 (needs `lsof`, so a no-op on Windows).
- **Verified:** the description optimizer (`run_eval.py`) uses `select()` on a pipe and doesn't work on native Windows. Use WSL. This repo's evals use `claude plugin eval` instead.

## playwright-cli
microsoft/playwright-cli @ `c872a33`, `skills/playwright-cli` · Apache-2.0
- **`allowed-tools: Bash(playwright-cli:*) Bash(npx playwright:*) …` pre-approves every subcommand.** That includes `attach --extension=chrome|msedge` (your everyday browser profile: tabs, logins, cookies), cookie get and set, `state-save` (writes auth tokens), `run-code` (arbitrary JS) and `kill-all`.
- Nudges the model toward page-registered WebMCP tools (e.g. `add_to_cart`). Recommends an unpinned `npm i -g @playwright/cli@latest`. PR attachments upload screenshots publicly without a redaction warning.

## impeccable
pbakaus/impeccable @ `b49177d`, `plugin/` · Apache-2.0 (engine binary licence not stated)
- **Hooks** run `scripts/impeccable hook` on SessionStart, every Edit/Write and Stop. That launches a **prebuilt engine binary** that can't be reviewed, unsandboxed with your network access (**verified**, its own `hooks.md:113`). The download is SHA-256-pinned and fails closed, but an unhashed `impeccable` found first via `IMPECCABLE_BIN`, `~/.impeccable/bin` or PATH runs instead.
- **Account and telemetry:** the first message opens with an `npx impeccable login` sign-in prompt when you're not signed in (**verified** `init.md:27`). Critiques and audits are saved to your Impeccable account when signed in ("REPORTS OFF" opts out). A telemetry ping with undocumented contents.
- **Writes config outside the plugin:** `hooks on` / `impeccable context` add hook entries to `.claude/settings.local.json` or `~/.claude/settings.json` (and codex, cursor, gemini, copilot files) after recorded consent (**verified**).
- **Instruction override:** in live mode, "`_instructions` wins" over the skill's own text (**verified** `live.md:11`), and browser-overlay "steer" text is acted on. Both are prompt-injection channels. `doctor --fix` is told to run "Do not ask permission first" (**verified**).
- Live mode runs a localhost server (the client sends the token in URLs; a `/source?path=` file-read endpoint whose confinement is inside the binary) and inserts a `<script src=localhost/live.js>` tag into your page source while active.
- Image generation can send project crops to an unnamed provider.

## stageshow
benjitaylor/skills @ `299140f`, `stageshow/` · MIT (`assets/app-icons.ts` excluded, see below)
- No hooks and no runtime network. The kit components make no requests, don't touch storage or cookies, and use no `innerHTML` or eval. Brand SVGs are clean.
- The skill runs `npm install`, a Vite playground on 127.0.0.1, and headless-Chrome filming scripts. It writes `REHEARSAL.md` and `shots/` in your project. `references/rehearse.md:27` tells it to `npm i -D playwright-core` (and postcss) **in your project**. Approve that consciously.
- The lockfile is all registry.npmjs.org. **Verified:** the unusual `@napi-rs/lzma-linux-x64-gnu` entry matches rollup 4.65.0's published optional dependencies.
- **Licensing:** `assets/app-icons.ts` (Apple Mail, Calendar, TestFlight, Slack, Figma, Notion icons) is not MIT. Bank, card and crypto logos in `kit/brands` keep their owners' brand terms. The examples imitate real products closely, including Claude Code's welcome box. Fine for internal demos; check brand rules before publishing.
- `kit/clock.ts` exports `installVirtualClock()`, which patches timers and `Date` page-wide. Don't call it in a real app.

## charles-design
LemonFace0309/charles-skills @ `baf4272`, `charles-unslop` + `charles-polish` · MIT repo; charles-unslop CC-BY-4.0 (attribution present)
- Markdown only. charles-unslop mentions image-generation MCPs and says to ask before running them (they cost money).

## emil-design-eng
emilkowalski/skills @ `64eb3de`, `skills/emil-design-eng` · MIT
- A single Markdown file with no code. It refers to `../choreograph/SKILL.md` twice; that skill isn't in the pin, so the reference is dead. On invocation it replies only "I'm ready to help…" and waits.

## Recommended settings
These follow from the reviews. `skills add` applies all of them (see README > Safeguards), and `skills remove` takes them out again. They're listed here for anyone installing these plugins without the CLI.

| For | Setting | Why |
|---|---|---|
| superpowers | `SUPERPOWERS_DISABLE_TELEMETRY=1` | Stops the third-party logo request |
| ponytail | plugin options `ledger=false`, `sendNames=false` (`claude plugin configure ponytail@craft`) | No prompt snippets on disk or in any future webhook |
| ponytail | decline its statusLine offer | Avoids an ExecutionPolicy Bypass entry in settings.json |
| security-guidance | `SECURITY_REVIEW_MODEL` / `SG_AGENTIC_MODEL` set to a cheaper model, or `ENABLE_STOP_REVIEW=0` | Per-turn Opus review has no hourly cap |
| playwright-cli | deny `Bash(playwright-cli attach:*)` (and the PowerShell form); ask for `cookie-*`, `state-save`, `state-load`, `run-code`, `kill-all`, `delete-data` | Deny and ask beat the skill's pre-approval |
| impeccable | kept out of every bundle; the CLI requires `--accept-impeccable`; decline the account sign-in | Unreviewable code on every edit |
