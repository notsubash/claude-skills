---
schema_version: "1.1"
tags: ["no-trigger","bug-triage"]
runs: 3
max_turns: 3
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Set up Sentry and structured logging for our Express API so we can see errors in production.
