---
schema_version: "1.1"
tags: ["task", "incident-response"]
runs: 3
max_turns: 10
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
---

It's 14:20 UTC. Since about 14:05, checkout has been returning 502s for roughly 40% of requests (Grafana shows it). We deployed v2.31 of the api at 14:02, which included a new payment-provider client and a database index migration. Two of us are online: me and Priya. Support says customers are emailing. What do we do right now? Give me the plan and anything I should post.
