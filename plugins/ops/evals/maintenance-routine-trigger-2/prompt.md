---
schema_version: "1.1"
tags: ["trigger","maintenance-routine"]
runs: 3
max_turns: 3
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Run our monthly ops health check and write up the report.
