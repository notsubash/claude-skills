---
schema_version: "1.1"
tags: ["trigger","release"]
runs: 3
max_turns: 3
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

The deploy we did 20 minutes ago doubled our error rate. Should we roll back, and how?
