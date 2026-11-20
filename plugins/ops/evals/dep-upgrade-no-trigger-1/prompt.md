---
schema_version: "1.1"
tags: ["no-trigger","dep-upgrade"]
runs: 3
max_turns: 3
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Write the release notes for v2.3.0 from these merged PRs: #41 add CSV export, #43 fix timezone bug in reports.
