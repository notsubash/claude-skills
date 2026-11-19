---
schema_version: "1.1"
tags: ["no-trigger", "senior-pr"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Set up a GitHub Actions workflow that runs npm test on pull requests.
