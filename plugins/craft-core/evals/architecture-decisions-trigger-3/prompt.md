---
schema_version: "1.1"
tags: ["trigger", "architecture-decisions"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

I'm thinking of splitting our Django monolith into microservices so the API and the admin can scale separately. Help me figure out whether that's the right call and write it up as a design doc.
