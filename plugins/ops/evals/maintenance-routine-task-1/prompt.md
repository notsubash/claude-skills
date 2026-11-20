---
schema_version: "1.1"
tags: ["task","maintenance-routine"]
runs: 3
max_turns: 10
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Design our maintenance routine. I'm a solo developer running a production SaaS (Node, Postgres on a managed host with daily automatic backups, Vercel frontend, Sentry, GitHub Actions, Dependabot). I spend zero time on maintenance today and want something I'll actually keep doing. What do I check, how often, and how do I make sure it happens?
