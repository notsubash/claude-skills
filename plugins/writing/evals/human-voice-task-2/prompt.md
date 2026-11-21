---
schema_version: "1.1"
tags: ["task", "human-voice"]
runs: 3
max_turns: 15
allowed_tools: ["Skill", "Read", "Glob", "Grep", "Write", "Edit"]
---

Write the narration for the 20-second intro of my next Manim video. One draft, under 60 words, my voice.

Facts (use only these):
- Video topic: why the sample mean's spread shrinks like 1/sqrt(n).
- Visual: 1,000 simulated samples, histogram narrowing as n goes from 1 to 100.
- At n = 100 the spread is a tenth of the spread at n = 1.

How I write narration (from my last video): "ok so here's a weird one. you flip a coin ten times and get eight heads. is the coin broken? let's actually find out."
