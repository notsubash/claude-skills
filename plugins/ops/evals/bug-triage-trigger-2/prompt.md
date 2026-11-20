---
schema_version: "1.1"
tags: ["trigger","bug-triage"]
runs: 3
max_turns: 3
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Sentry issue: TypeError: Cannot read properties of null (reading 'id') in OrderSummary.tsx, 340 events, 52 users since the last deploy. What do I do?
