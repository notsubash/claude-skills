# Postmortem template

Replace every `<...>`. Don't invent a fact to fill a gap. Write "unknown" and add it to Open questions. The checker fails on any `<...>` left in the file.

```markdown
# <YYYY-MM-DD>: <What users saw, in plain words, e.g. "Checkout failed for 38% of users for 47 minutes">

- Status: Draft | In review | Reviewed | Closed
- Severity: SEV<n>
- Incident commander: <name>
- Postmortem owner: <name>
- Date of incident: <YYYY-MM-DD>, <start> to <end> <timezone, prefer UTC>

## Summary

<Three to five sentences a non-engineer can read: what users saw, how long, what we did to stop it, the main cause, the most important follow-up.>

## Impact

- Users affected: <count or share, with source>
- Duration of user impact: <hh:mm, from first impact to mitigation>
- What they experienced: <errors, slowness, wrong data, lost data>
- Business impact: <failed orders, revenue, SLO budget used, support tickets>: <source link>
- Data: <none lost | what was lost or damaged, and the repair status>

## Detection and response

- Time to detect: <minutes from first impact to someone knowing>, detected by <alert name | customer report | an engineer noticed>
- Time to mitigate: <minutes from detection to user impact ending>
- Time to resolve: <minutes to stable and closed>

## Timeline (UTC)

| Time | Event | Source |
|---|---|---|
| <hh:mm> | <Trigger: e.g. deploy v143 of api starts> | <link> |
| <hh:mm> | <First user impact> | <graph link> |
| <hh:mm> | <Detected: alert fires / ticket arrives> | <link> |
| <hh:mm> | <Incident declared, IC named, SEV set> | <link> |
| <hh:mm> | <Each hypothesis, action and decision, including the dead ends> | <link> |
| <hh:mm> | <Mitigation applied> | <link> |
| <hh:mm> | <Impact ends, confirmed by signal> | <graph link> |
| <hh:mm> | <Resolved> | <link> |

## What happened

<The story in prose, in order. Write what people knew and saw at each decision point and why their choice made sense then. No hindsight words ("should have", "failed to", "obviously").>

## Causes

- Trigger: <the change or event that set it off>
- Root causes: <the conditions in the system that let the trigger hurt users. Usually more than one. Keep asking "why did the system allow this?" until you reach something you can change.>
- Contributing factors: <what made it worse or longer: detection gaps, missing runbook, alert routing, a confusing dashboard, time pressure>

## What went well

- <e.g. the rollback took 3 minutes; comms went out in 10>

## What went wrong

- <e.g. the alert fired to a muted channel>

## Where we got lucky

- <e.g. it happened at 10:00 on a weekday, not 03:00 on a Saturday>

## Action items

| # | Action | Type | Owner | Priority | Due | Ticket |
|---|---|---|---|---|---|---|
| 1 | <Specific, with a checkable end state, e.g. "CI rejects a config missing the region key (test in config.test.ts)"> | prevent / detect / mitigate / process | <one person> | P0/P1/P2 | <YYYY-MM-DD> | <link> |

## Open questions

- <Anything unknown, with who will find out>

## Supporting information

- <Dashboards, logs, the incident channel, related postmortems (and whether this is a repeat)>
```

## Action-item quality

| Weak | Strong |
|---|---|
| Improve monitoring | Page on-call when checkout 5xx > 2% for 5 minutes (alert rule in `alerts/checkout.yml`) |
| Be more careful with config | Config schema validation in CI rejects a missing `region` key |
| Train the team on rollbacks | One-command rollback (`make rollback`) documented in the runbook and tested in the next game day |
| Investigate the database | Find why the connection pool saturated at 200 rps; owner reports by <date> (type: investigate) |
| Add more tests | Contract test for the payment provider's error response, run in CI |

Prefer, in order: remove the hazard, then automatic guardrails (validation, canary, circuit breaker), then detection, then documentation and training. Training on its own rarely stops a repeat.

## Review meeting (30–45 minutes)

The IC or postmortem owner runs it. Share the draft at least a day before. Agenda: walk the timeline; agree on causes; ask "how could we have caught this earlier (tests, canary, alert, load test)?"; agree on the action items, owners and priority. Steer "who" questions to "what made that the reasonable choice?". Afterwards, set the status to Reviewed and share the doc widely.
