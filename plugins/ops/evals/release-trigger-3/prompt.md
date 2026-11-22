---
schema_version: "1.1"
tags: ["trigger","release"]
runs: 3
max_turns: 3
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

The new billing flow is merged. Plan the production rollout: the stages, what we watch at each one, and what would make us roll back.
