---
type: llm
weight: 2
---

This is a product-judgment answer: judge the reasoning and the recommendation.
It separates evidence (3 team requests, 71% email opens, 9-hour median fix time, two late posts) from assumptions.
It identifies the specific segment that has the problem (teams, about 9 accounts), not "users" in general.
It states the job or outcome (for example: get the right teammate to fix a held post before it publishes) and notes email is the current alternative.
It names a riskiest assumption and a cheap test before the full 4-day build (for example: one channel only, a single webhook, or a manual/concierge alert for the 9 teams) with a kill or success criterion.
It proposes a primary metric with a baseline and target (for example: median hold-to-fix time from 9 hours down to a stated number for team accounts) and at least one guardrail.
It ends with a clear decision (build / test first / don't build) with a reason, and does not recommend building both integrations outright with no test.
