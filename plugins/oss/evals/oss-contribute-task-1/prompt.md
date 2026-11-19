---
schema_version: "1.1"
tags: ["task", "oss-contribute"]
runs: 3
max_turns: 15
allowed_tools: ["Skill", "Read", "Glob", "Grep", "Write", "Edit"]
---

I forked github.com/acme/deja and cloned my fork. I want to fix this issue myself, with you guiding me:

Issue #5650: "`deja show` exits 0 when given an unknown snapshot id; it should print an error and exit 1."
Maintainer comment on the issue: "Please add a test in cmd/show_test.go and keep the error message format consistent with `deja restore`."

CONTRIBUTING.md says: commits must be signed off (-s); run `make lint test` before pushing; one PR per issue.

Give me the plan and the first commands to run.
