---
type: llm
weight: 2
---

It adds an upstream remote pointing to acme/deja and syncs main from it before branching.
It creates a dedicated branch for issue 5650.
It writes a failing test in cmd/show_test.go first, before the fix (test-first).
It follows the maintainer's instruction to match the `deja restore` error message format.
It uses signed-off commits (git commit -s) and runs `make lint test` before pushing.
It explains the commands for the user to run themselves rather than silently doing everything.
