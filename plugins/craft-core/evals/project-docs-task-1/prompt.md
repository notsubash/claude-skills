---
schema_version: "1.1"
tags: ["task", "project-docs"]
runs: 3
max_turns: 15
allowed_tools: ["Skill", "Read", "Glob", "Grep", "Write", "Edit", "Bash"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Set up the working docs for a new project. I've answered the interview questions already so don't ask them again:

- Project: "Lastcall", a web app that checks scheduled social posts still point to live product pages before they publish, and holds them if not.
- Users: solo creators and small marketing teams using Buffer.
- Success: fewer than 1% of published posts link to sold-out or dead pages.
- Non-goals: no post editor, no analytics dashboard.
- Constraints: deadline in 3 weeks, Hetzner VPS, I develop on Windows with Git Bash.
- Non-negotiables: never log OAuth tokens; never call the real Buffer API in tests.
- Stack decided: Node 22 + TypeScript + Hono + SQLite (cheap, single box).
- Commands: `npm run dev`, `npm test`, `npm run typecheck`, `bash scripts/deploy.sh root@<ip>` (touches production).

Write the files into the current directory.
