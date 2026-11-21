---
schema_version: "1.1"
tags: ["no-trigger", "incident-response"]
runs: 3
max_turns: 3
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
---

A user says the export button gives them a blank CSV. Here's the stack trace: TypeError: Cannot read properties of undefined (reading 'rows') at exportCsv (export.ts:42)
