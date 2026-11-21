---
schema_version: "1.1"
tags: ["trigger", "test-integrity"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Add tests for the discount calculation in src/pricing.ts. We have none right now.
