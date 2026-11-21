---
schema_version: "1.1"
tags: ["trigger", "architecture-decisions"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

We need background jobs for sending emails and resizing images. Should we use Redis with BullMQ, SQS, or just a Postgres table? We already run Postgres.
