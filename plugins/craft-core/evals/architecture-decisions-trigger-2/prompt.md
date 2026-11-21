---
schema_version: "1.1"
tags: ["trigger", "architecture-decisions"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

We decided last week to move auth to Clerk instead of rolling our own. Can you write an ADR for it?
