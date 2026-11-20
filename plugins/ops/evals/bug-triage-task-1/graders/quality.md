---
type: llm
weight: 2
---

Judge whether this is how a senior engineer would triage the bug.
It treats it as high severity because wrong money amounts are being sent to customers' clients, and proposes stopping the bleeding first (for example pausing automatic invoice emails, rolling back, or a flag) before the full fix.
It suspects the v4.12.0 join refactor as a regression and proposes confirming it (diff, git bisect, or reproducing with multi-line-item data).
It proposes writing a failing test first that reproduces duplicate line items (for example an invoice with several line items or matching join rows).
It proposes finding all affected invoices with a query and repairing or reissuing them, with a dry run or count before changing data.
It includes at least one of: closing the loop with affected customers, or checking for the same join pattern elsewhere.
