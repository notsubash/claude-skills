---
schema_version: "1.1"
tags: ["trigger","dep-upgrade"]
runs: 3
max_turns: 3
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

npm audit shows 14 vulnerabilities, 3 high. Which ones actually matter and what do we do?
