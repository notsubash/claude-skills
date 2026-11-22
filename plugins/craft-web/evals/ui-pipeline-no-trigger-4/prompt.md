---
schema_version: "1.1"
tags: ["no-trigger", "ui-pipeline"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Disable the submit button on the signup form while the request is pending.
