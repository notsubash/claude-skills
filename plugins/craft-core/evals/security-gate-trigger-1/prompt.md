---
schema_version: "1.1"
tags: ["trigger", "security-gate"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Before I open this PR, run a security check on the branch and tell me if it's safe to ship.
