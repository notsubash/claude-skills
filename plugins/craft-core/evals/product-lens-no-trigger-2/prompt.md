---
schema_version: "1.1"
tags: ["no-trigger", "product-lens"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Implement the CSV export endpoint we agreed on: GET /reports/:id/export returning text/csv.
