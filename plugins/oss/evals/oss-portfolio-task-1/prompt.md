---
schema_version: "1.1"
tags: ["task", "oss-portfolio"]
runs: 3
max_turns: 15
allowed_tools: ["Skill", "Read", "Glob", "Grep", "Write", "Edit"]
---

Update my contributions README with these merged PRs. Keep the existing structure and leave merge dates out.

Current README:
```markdown
# Open Source Contributions
Merged pull requests I've contributed to other people's projects.
## Projects
### acme/deja
- [#5601](https://github.com/acme/deja/pull/5601) docs: fix install command for Windows `documentation`
```

New merged PRs (JSON from the fetch script):
```json
[{"repo":"acme/deja","number":5686,"title":"fix: deja how and deja restore print the usage line deja help prints","mergedAt":"2026-10-26","labels":["bug"],"url":"https://github.com/acme/deja/pull/5686"},
 {"repo":"tower/bernstein","number":212,"title":"fix(supervisor): preserve server state across restarts","mergedAt":"2026-10-24","labels":[],"url":"https://github.com/tower/bernstein/pull/212"}]
```
Give me the full updated README.
