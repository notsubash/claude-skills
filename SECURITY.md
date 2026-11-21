# Security policy

craft installs Claude Code plugins that run on your machine: skills Claude follows, and hooks that run on every prompt (`deepen`) and before every `git push` / `gh pr create` (the push guard). Third-party plugins are pinned to commits that were read line by line ([third_party/REVIEW.md](third_party/REVIEW.md)). A security problem in any of this matters, so please report it privately.

## Reporting a vulnerability

**Don't open a public issue.** Use GitHub's private reporting: [Report a vulnerability](https://github.com/notsubash/claude-skills/security/advisories/new).

Include what you can:
- what's affected: the `skills` CLI, a hook, a skill's instructions, or a pinned third-party plugin
- the version (`skills --version`), your OS and shell, and your Claude Code version
- steps to reproduce, and what an attacker gains

You'll get a reply within 7 days. Fixes ship as a patch release with a CHANGELOG entry that credits you, unless you'd rather not be named.

## What counts

In scope:
- The CLI writing outside the scope it was asked to (for example, a just-me install touching tracked files), running commands it shouldn't, or mishandling the lockfile.
- A hook that can be made to run untrusted input, leak data, or let a push through in `enforce` mode when it should block.
- Skill instructions that steer Claude into unsafe actions: disabling safeguards, exfiltrating secrets, running unreviewed downloads.
- A pinned third-party plugin doing something its review in `third_party/REVIEW.md` missed. Please also report it upstream.
- The release or self-update path installing something other than the tagged release.

Out of scope: problems in Claude Code itself (report those to Anthropic), and issues in an upstream plugin's code at a commit we don't pin.

## Supported versions

Only the latest release gets fixes. Update with `skills self-update`.
