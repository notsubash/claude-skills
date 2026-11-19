---
schema_version: "1.1"
tags: ["task", "product-lens"]
runs: 3
max_turns: 10
allowed_tools: ["Skill", "Read", "Glob", "Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Should we build this next? Give me your call.

Product: Lastcall holds scheduled social posts when the product page they link to sells out or dies.
Feature request: "Slack and Discord alerts when a post is held."

What we know:
- 40 active accounts; 31 are solo creators, 9 are small teams (2-5 people).
- 3 accounts asked for Slack/Discord alerts in the last month; all 3 are teams.
- Every held post already triggers an email. Email open rate on hold alerts: 71%.
- Median time from hold to the user fixing the post: 9 hours. Two team users said a teammate "didn't see the email" and a post went out late.
- Building Slack + Discord alerts: about 4 days of work, plus ongoing maintenance of two webhook integrations.
- Other backlog item: a weekly "blind spots" digest, no user requests yet.
