---
schema_version: "1.1"
tags: ["no-trigger", "bug-triage"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Running `npm run dev` locally I get: Error: Cannot find module './config/env' imported from src/server.ts. Fix it.
