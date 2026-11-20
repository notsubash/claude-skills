---
schema_version: "1.1"
tags: ["trigger","dep-upgrade"]
runs: 3
max_turns: 3
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

We got hit by a malicious npm package last month. How do we make sure our installs never pull a version that was published yesterday?
