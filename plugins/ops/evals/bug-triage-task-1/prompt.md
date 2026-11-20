---
schema_version: "1.1"
tags: ["task","bug-triage"]
runs: 3
max_turns: 10
allowed_tools: ["Skill","Read","Glob","Grep"]
env: {"EVAL_CRAFT_DEEPEN": "off"}
---

Triage and plan the fix for this bug. Give me your plan, I'll implement it.

Report from a customer (Acme, account 8812): "Invoices for October show the wrong total. Some line items appear twice."
What we know:
- Started around Nov 3. Release v4.12.0 went out Nov 2 and included "refactor invoice line item query to use a join".
- Error tracker: no errors.
- 3 other accounts emailed about duplicate line items this week. 410 invoices were generated since Nov 2; we don't know how many are wrong.
- Invoices are emailed to the customer's clients automatically.
- We have unit tests for invoice totals using a single line item per product.
