---
schema_version: "1.1"
tags: ["task", "architecture-decisions"]
runs: 3
max_turns: 10
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

We need to pick how to run background jobs and I want the ADR drafted in your reply (don't write files).

What we know:
- Node/TypeScript API, one Postgres 16 instance on RDS, deployed on Fly.io. Team of 3 developers, nobody has run Redis or Kafka in production.
- Jobs today: sending transactional emails and generating PDF invoices, about 4,000 jobs a day, peak 30 a minute at month end.
- Right now these run inline in the request. Invoice generation takes up to 8 seconds and caused 14 request timeouts last month.
- Emails must not be sent twice. Invoices can be regenerated safely.
- Options people have mentioned: Redis + BullMQ, AWS SQS, Kafka, or a Postgres-backed queue (pg-boss / SKIP LOCKED).
