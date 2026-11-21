---
schema_version: "1.1"
tags: ["no-trigger", "test-integrity"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Explain what this regex does: ^(?=.*[A-Z])(?=.*\d).{8,}$
