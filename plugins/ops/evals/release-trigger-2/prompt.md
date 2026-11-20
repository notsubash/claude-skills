---
schema_version: "1.1"
tags: ["trigger","release"]
runs: 3
max_turns: 3
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Write the changelog for this release from these merged PRs: #88 add team invites, #90 fix CSV encoding, #91 remove legacy v1 export endpoint.
