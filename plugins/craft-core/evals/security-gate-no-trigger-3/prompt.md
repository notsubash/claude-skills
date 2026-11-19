---
schema_version: "1.1"
tags: ["no-trigger", "security-gate"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Rotate the database password in our .env.example and update the README.
