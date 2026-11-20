---
schema_version: "1.1"
tags: ["trigger","observability"]
runs: 3
max_turns: 3
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Add structured logging and OpenTelemetry tracing to our Node API. What should every log line contain?
