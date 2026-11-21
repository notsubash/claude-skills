---
type: llm
weight: 2
---

Judge the live incident response.
It treats this as a declared incident with a severity based on impact (about 40% of checkout failing: SEV1 or SEV2), not as a normal debugging task.
It mitigates first: the first action is rolling back v2.31 (or turning off the new payment client behind a flag) because the errors started right after the deploy, before any deep root-cause debugging. It notes the index migration may need checking before or during rollback (whether the old version works with it, or whether it is still running and locking tables).
It assigns roles between the two people (one coordinating as incident commander and on comms, one making the production change) and says only one person changes production, announcing each change.
It says to keep evidence (logs, error samples, the deploy SHA) and to confirm the fix with the user-facing signal (the 502 rate in Grafana returning to normal), not just with the deploy finishing.
It includes a short customer-facing status update in plain words with no guessed cause and a time for the next update, and an update cadence.
It mentions a postmortem afterward, but does not write a long analysis now.
