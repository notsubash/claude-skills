---
schema_version: "1.1"
tags: ["trigger","dep-upgrade"]
runs: 3
max_turns: 3
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Our Dependabot PRs keep piling up. Set up a sane dependency update policy for this Node project.
