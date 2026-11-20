---
schema_version: "1.1"
tags: ["trigger","maintenance-routine"]
runs: 3
max_turns: 3
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Set up a recurring check so I don't forget backups, certificates and stale feature flags.
