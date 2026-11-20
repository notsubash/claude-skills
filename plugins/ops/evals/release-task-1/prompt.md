---
schema_version: "1.1"
tags: ["task","release"]
runs: 3
max_turns: 10
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Plan this release for me, step by step, including how we roll it out and what makes us roll back.

Facts:
- Web app on a container platform; CI builds a Docker image per commit; we deploy by updating the image tag. Currently we deploy straight to 100%.
- This release renames the Postgres column users.fullname to users.display_name, and adds a new billing page behind no flag.
- Last release we had to roll back, and the rollback failed because the old code couldn't read the migrated schema.
- Error tracker and basic latency dashboards exist.
