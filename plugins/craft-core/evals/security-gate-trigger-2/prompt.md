---
schema_version: "1.1"
tags: ["trigger", "security-gate"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

We deploy tomorrow. Do a security review of what changed since main and give me a clear go or no-go.
