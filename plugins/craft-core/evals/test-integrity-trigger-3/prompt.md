---
schema_version: "1.1"
tags: ["trigger", "test-integrity"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Our test suite has 90% coverage but bugs still get through. Can you look at tests/test_orders.py and tell me if these tests are actually any good?
