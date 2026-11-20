---
schema_version: "1.1"
tags: ["trigger","observability"]
runs: 3
max_turns: 3
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

We only find out the app is down when users tweet at us. What monitoring and alerts should we set up?
