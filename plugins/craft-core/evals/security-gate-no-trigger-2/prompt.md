---
schema_version: "1.1"
tags: ["no-trigger", "security-gate"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Add rate limiting to the login endpoint using express-rate-limit.
