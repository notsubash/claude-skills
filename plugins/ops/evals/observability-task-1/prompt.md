---
schema_version: "1.1"
tags: ["task","observability"]
runs: 3
max_turns: 10
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Design the monitoring and alerting for our app. Be specific.

Facts:
- SaaS app, Node API + Postgres + React frontend, about 30 requests/second at peak, near zero at night.
- Critical journeys: sign-in, creating a project, and Stripe checkout.
- Today: console.log strings, no error tracker, one uptime ping on the homepage that emails the founder.
- Two incidents last month: checkout broke for 6 hours after a deploy (nobody noticed until a customer emailed), and the DB connection pool was exhausted at peak.
- One engineer on call, by phone.
