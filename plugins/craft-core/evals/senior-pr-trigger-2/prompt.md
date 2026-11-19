---
schema_version: "1.1"
tags: ["trigger", "senior-pr"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

give me the PR body for this branch, in raw markdown
