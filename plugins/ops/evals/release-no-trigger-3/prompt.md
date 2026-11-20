---
schema_version: "1.1"
tags: ["no-trigger","release"]
runs: 3
max_turns: 3
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Users report the search box ignores accents ('cafe' doesn't find 'café'). Fix it.
