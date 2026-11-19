---
schema_version: "1.1"
tags: ["no-trigger", "ui-pipeline"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
---

Fix the 500 error when saving settings; the API returns 'column not found'.
