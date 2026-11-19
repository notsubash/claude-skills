---
schema_version: "1.1"
tags: ["task", "figure-check"]
runs: 3
max_turns: 15
allowed_tools: ["Skill", "Read", "Glob", "Grep", "Write", "Bash"]
---

Check every figure in this script for my stats video before I render it:

1. Caption: "A fair coin flipped 100 times: expect 50 heads, standard deviation 5."
2. Caption: "Getting 60 or more heads has a p-value of about 0.028, so there's a 2.8% chance the coin is fair."
3. On-screen formula: "z = (x - mu) / (sigma / n)"
4. Label: "95% of a normal distribution lies within ±1.96 standard deviations."
5. Caption: "A 99% confidence interval is narrower than a 95% one."

Recompute what you can and give me a table of what's right and wrong.
