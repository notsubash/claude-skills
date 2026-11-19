---
schema_version: "1.1"
tags: ["trigger", "security-gate"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

The push guard says there's no security clearance for HEAD. Can you clear it?
