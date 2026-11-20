---
schema_version: "1.1"
tags: ["task","dep-upgrade"]
runs: 3
max_turns: 10
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Set up our dependency policy. We had two supply-chain incidents this quarter (a compromised transitive package ran a postinstall script in CI). Give me the exact config to add and the steps to verify it works.

Project facts:
- Node 22 app, pnpm 11, lockfile committed (pnpm-lock.yaml).
- GitHub Actions CI runs `pnpm install` then tests, in the same job that has DEPLOY_TOKEN in env.
- Dependabot is enabled with the default config (weekly, npm only).
- esbuild is a dependency and needs its install script.
- Team rule: no dependency version younger than one week.
