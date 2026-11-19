---
schema_version: "1.1"
tags: ["task", "security-gate"]
runs: 3
max_turns: 15
allowed_tools: ["Skill", "Read", "Glob", "Grep", "Write", "Edit"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Run the security clearance gate on this change before I open the PR. There is no git repo here, so treat this as the full diff of HEAD vs main.

```diff
+++ src/routes/export.ts
+import { exec } from 'node:child_process';
+const AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
+const AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
+router.get('/export', async (req, res) => {
+  const user = await db.query(`SELECT * FROM users WHERE id = ${req.query.id}`);
+  exec(`zip -r /tmp/export.zip ${req.query.folder}`, () => res.download('/tmp/export.zip'));
+});
```

Tell me the verdict and what to fix.
