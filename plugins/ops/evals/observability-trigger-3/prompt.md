---
schema_version: "1.1"
tags: ["trigger","observability"]
runs: 3
max_turns: 3
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Our on-call gets 40 alerts a week and most are noise. Help me redesign the alerting.
