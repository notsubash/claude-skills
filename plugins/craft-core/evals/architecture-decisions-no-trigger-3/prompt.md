---
schema_version: "1.1"
tags: ["no-trigger", "architecture-decisions"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Is it worth building a Slack integration for our app at all? Only two customers have asked for it.
