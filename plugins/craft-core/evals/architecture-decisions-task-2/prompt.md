---
schema_version: "1.1"
tags: ["task", "architecture-decisions"]
runs: 3
max_turns: 10
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Review this ADR before I merge it. Tell me what's missing, most important first.

```markdown
# ADR 7: Microservices

We will move to microservices because they are more scalable and modern, and Netflix and Uber use them. This will make the system more flexible and allow us to use the best tool for each job.

## Consequences
- Better scalability
- Teams can work independently
```

Context you might need: we're 4 engineers on one team, a Rails monolith, about 200 requests per second at peak, no current performance problems. ADR 0003 (accepted) says "Keep a single Rails monolith".
