---
type: llm
weight: 2
---

This is a planning answer: judge the plan and commands it gives, not whether anything was executed.
The plan or commands add an upstream remote for acme/deja and sync main from it before branching.
The plan creates a dedicated branch for issue 5650.
The plan has a failing test in cmd/show_test.go written before the fix (test-first).
The plan follows the maintainer's instruction to match the `deja restore` error message format.
The plan uses signed-off commits (-s) and runs `make lint test` before pushing.
The answer explains the commands for the user to run themselves.
