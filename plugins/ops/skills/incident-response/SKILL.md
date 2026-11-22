---
name: incident-response
description: Run a live production incident and write its blameless postmortem - declare early, set severity from user impact, mitigate (roll back, flag off) before hunting the root cause, post status updates on a fixed cadence, then write a postmortem with a sourced timeline and owned action items, validated by check-postmortem.mjs. Use when the site, app or API is down or degraded for many users, a deploy just broke production, or the user asks for a status page update, incident report, postmortem or RCA. Not for a single user's bug or an error with no live impact (bug-triage).
---

# Incident response

Users are being hurt right now. The order is fixed: **stop the bleeding, restore service, keep the evidence, then understand it.** Root-causing while users wait makes incidents longer.

## 1. Declare

Declare an incident, in writing, if users can see it, it needs a second person, or it isn't fixed after 30-60 minutes of focused work. Declare early; downgrading is free. Keep everything in one channel or doc.

## 2. Severity

Set it from user impact. When unsure, pick the higher one. Use the project's own definitions if it has an incident, on-call or runbook doc.

| Sev | Impact | Response |
|---|---|---|
| SEV1 | Most users can't use the core product, data loss or exposure, or money moving wrongly | All hands, status page now, updates every 30 min |
| SEV2 | A core flow broken for a significant share of users, or an SLO burning fast | Respond now, status page if customers notice, updates every 30-60 min |
| SEV3 | Degraded with a workaround, or a small share of users | Business hours, internal updates |
| SEV4 | Cosmetic or internal only | A ticket, not an incident |

## 3. Roles

Name them even with two people; one person can hold several.
- **Incident commander:** coordinates and decides; doesn't type fixes.
- **Ops lead:** the only one changing production, announcing each change before making it ("rolling back api to v142 now").
- **Comms:** status page and stakeholder updates on the cadence.
- **Scribe:** a timestamped log of facts, actions and decisions. It becomes the postmortem timeline.

Helping a solo developer, Claude is scribe and comms drafter. The user stays commander and ops: Claude proposes each production action; the user runs or approves it.

## 4. Mitigate first

1. **What changed just before it started?** Deploys, config or flag changes, migrations, dependency or infra changes, traffic spikes, a third party's status page.
2. **Fastest safe mitigation**, usually: roll back the deploy; flag off; fail over; scale up; rate-limit or shed load; block a bad client; turn off a non-critical feature.
3. **Don't roll forward with an untested fix** unless rollback is impossible (an irreversible migration). Say why.
4. **Keep the evidence** before it's gone: logs, a heap or thread dump, the bad request, metrics screenshots, the deploy SHA. Don't restart the only broken instance first.
5. **Confirm with the user-facing signal** (error rate, latency, a synthetic check, a real request), not "the deploy finished".

Hold until the signal has been normal for 15-30 minutes (SEV1/2), then move to *monitoring*.

## 5. Communicate

Use [references/comms.md](references/comms.md).
- First external update within 15-30 minutes for SEV1/2, even if it only says "investigating".
- Updates on the promised cadence, even when nothing changed.
- Plain words: what users see, what to do meanwhile, when the next update is. No internal names, blame, guessed causes or ETAs you can't keep.
- States: Investigating, Identified, Monitoring, Resolved.

## 6. Hand off

The outgoing commander writes a summary (state, what's been tried, current hypothesis, open actions, next update time), hands over explicitly, and waits for a yes. Template in [references/comms.md](references/comms.md).

## 7. Resolve

Resolved means the user impact is gone and stable, not that the root cause is fixed. Post the resolved update, name a postmortem owner, ticket the temporary mitigations to undo (a flag left off, a scaled-up cluster), and repair damaged data and tell affected users.

## 8. Postmortem

Required for SEV1/2, data loss, manual on-call intervention, slow detection, or a repeat. Draft within 2-3 working days. Use [references/postmortem-template.md](references/postmortem-template.md).

- **Blameless.** People acted reasonably on what they knew. Ask what made the action seem right and why the system allowed it. "Human error" is where the investigation starts, never a cause. No "should have" or "failed to".
- **Facts with sources.** Every timeline entry and impact number links to a log, graph, deploy or message. Unknowns are open questions, not guesses.
- **Trigger, root causes, contributing factors**, separately. The trigger set it off (a deploy); root causes let it hurt users (no canary, no config validation); contributing factors made it worse or longer. Don't force a single cause.
- **Time to detect and time to mitigate** are findings. If either was slow, an action item targets it.
- **Where we got lucky.**
- **Three to seven action items**, each with a type (prevent, detect, mitigate, process), one named person, a ticket, a priority, a due date and a checkable end state. Prefer removing the hazard over relying on people remembering. "Improve monitoring" isn't an item; "page on checkout 5xx above 2% for 5 min" is.

## 9. Verify

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/incident-response/scripts/check-postmortem.mjs" <postmortem.md>
```

It fails on missing sections, an untimestamped timeline, missing time to detect or mitigate, action items without owner, ticket, due date or type, leftover placeholders, and blame language. Fix everything it reports or explain why a finding doesn't apply.

## Output

**During an incident**, keep replies short: **status** (sev, impact, state), **next action** (who, the command), **next update** time. Draft the status update for the user to post. No long analysis mid-incident.

**After**, write the postmortem to the repo's postmortem folder (ask before creating `docs/postmortems/`), run the checker, and give the action items as a list to file.
