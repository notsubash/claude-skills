---
schema_version: "1.1"
tags: ["no-trigger","maintenance-routine"]
runs: 3
max_turns: 3
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Upgrade our Postgres client library from v8 to v9.
