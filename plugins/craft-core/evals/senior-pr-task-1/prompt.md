---
schema_version: "1.1"
tags: ["task", "senior-pr"]
runs: 3
max_turns: 15
allowed_tools: ["Skill", "Read", "Glob", "Grep", "Write", "Edit"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Write the commit message and the PR title and body for this change. Our team uses conventional commits. The work was done as "Phase 2, task 4" of our internal plan.

Diff summary:
- src/sync/crm.ts: when a lead gives a free email (gmail etc.) and leaves before giving a name, we used to skip the CRM sync entirely. Now we sync with name "Unknown" and tag `incomplete-lead`.
- src/sync/crm.test.ts: added 2 tests: free email + no name syncs with the tag; company email + no name still syncs as before.
- Ran `npm test` (all 214 pass) and `npm run typecheck` (clean). Did not test against the real CRM sandbox.

Issue: #318 "Leads with free email and no name never reach the CRM".
