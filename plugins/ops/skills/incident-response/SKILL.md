---
name: incident-response
description: Run a production incident and its postmortem the way SRE teams do - declare early, set severity from user impact, assign roles (incident commander, ops, comms, scribe), stop the bleeding with a rollback or flag-off before hunting the root cause, post status updates on a fixed cadence, hand off explicitly, then write a blameless postmortem with a sourced timeline, time-to-detect and time-to-mitigate, trigger vs root cause vs contributing factors, and a few owned, ticketed action items. check-postmortem.mjs validates the write-up. Use when the user says the site, app or API is down, there's an outage, a SEV or P1, errors or latency are spiking for many users, a deploy broke production, asks for a status page update, an incident report, a postmortem, a post-incident review or an RCA. Not for a single user's bug or a stack trace with no live impact (bug-triage).
---

# Incident response

An incident is when users are being hurt right now and normal work stops. The order is fixed: **stop the bleeding, restore service, keep the evidence, then understand it.** Finding the root cause while users wait is the most common way to make an incident longer.

## 1. Declare

Declare an incident, out loud and in writing, if any of these is true:
- users can see it (errors, latency, data that looks wrong, a feature gone), or
- it needs a second person or team, or
- it isn't fixed after 30–60 minutes of focused work.

Declare early. Downgrading is free; a late declaration costs hours. Open one channel (or one doc, for a solo developer) where everything about the incident goes.

## 2. Severity

Set it from user impact, with a number. When unsure, pick the higher one; the postmortem can correct it.

| Sev | Impact | Response |
|---|---|---|
| SEV1 | Most users can't use the core product, data loss or exposure, or money is moving wrongly | All hands now, status page now, updates every 30 min |
| SEV2 | A core flow broken for a significant share of users, or an SLO burning fast | Respond now, status page if customers notice, updates every 30–60 min |
| SEV3 | Partial or degraded, with a workaround, or a small share of users | Business hours, internal updates |
| SEV4 | Cosmetic, or internal only | A ticket, not an incident |

Use the project's own definitions if it has them (look for an `incident`, `oncall` or `runbook` doc).

## 3. Roles

Even with two people, name them. One person can hold several roles; the incident commander holds every role not handed out.
- **Incident commander (IC).** Coordinates, decides, keeps the big picture. *Doesn't* type fixes. If the IC is debugging, nobody is in charge.
- **Ops lead.** The only person changing production. Every change is announced in the channel before it's made ("rolling back api to v142 now"). Nobody else touches production. Freelance fixes make incidents worse and the timeline unreadable.
- **Comms lead.** Status page and stakeholder updates on the cadence, so engineers aren't interrupted.
- **Scribe.** Timestamped log of facts, actions and decisions in the channel or the incident doc. This becomes the postmortem timeline.

When Claude helps a solo developer, Claude acts as scribe and comms drafter, and keeps the user in the IC and ops roles: Claude proposes each production action and the user runs or approves it.

## 4. Mitigate first

Find what changed, then undo it. Most incidents follow a change.
1. **What changed just before it started?** Deploys, config or flag changes, migrations, dependency or infrastructure changes, traffic spikes, a third party's status page. Compare the start time with the deploy log.
2. **Pick the fastest safe mitigation**, usually in this order: roll back the deploy; turn off the feature flag; fail over or move traffic; scale up; rate-limit or shed load; block a bad client; turn off a non-critical feature to protect the core one.
3. **Don't roll forward with a fix you haven't tested** unless a rollback is impossible (a migration that can't be undone). If so, say why.
4. **Keep the evidence** before it's gone: logs, a heap or thread dump, the bad request, the metrics screenshot, the deploy SHA. Don't restart the only broken instance before you capture what's on it.
5. **Confirm the mitigation with the user-facing signal** (error rate, latency, the synthetic check, a real request), not with "the deploy finished".

Stay on the incident until the signal has been normal for a while (15–30 min for SEV1/2). Then mark it *mitigated* and move to *monitoring*.

## 5. Communicate

Use [references/comms.md](references/comms.md). Rules:
- First external update within 15–30 minutes for SEV1/2, even if all it says is "we're investigating".
- Updates on the cadence you promised, even when nothing changed. Silence reads as chaos.
- Plain words: what users see, what to do meanwhile, when the next update is. No internal names, no blame, no guessed causes, no promised ETA you can't keep.
- States: Investigating → Identified → Mitigated / Monitoring → Resolved.

## 6. Hand off

At shift end, or when the IC gets tired: the outgoing IC writes a summary (state, what's been tried, current hypothesis, open actions, next update time). They say "you're now the incident commander" and wait for an explicit yes before leaving. Template in [references/comms.md](references/comms.md).

## 7. Resolve

Resolved means the user impact is gone and the signal is stable. It doesn't mean the root cause is fixed. Then:
- post the resolved update
- open the postmortem doc and name one owner
- file tickets for the temporary mitigations to undo (a flag left off, a scaled-up cluster, a blocked client)
- if data was damaged, repair it and tell the users it touched. bug-triage covers data repair.

## 8. Postmortem

Required for SEV1 and SEV2, any data loss, any manual intervention by on-call, any incident that took too long to detect, and any repeat. Draft within 2–3 working days while memory is fresh, review within a week. Use [references/postmortem-template.md](references/postmortem-template.md).

- **Blameless, not accountability-free.** People acted reasonably on what they knew at the time. Ask what made the action seem right, and why the system allowed it. "Human error" is never a cause; it's where the investigation starts. Rewrite test: if the sentence would still be true with a different person in the seat, it's about the system. Good.
- **Facts only, with sources.** Every timeline entry and impact number links to a log, graph, deploy or message. Unknowns are written as open questions, never filled with a guess.
- **Hindsight is not insight.** "Should have" and "failed to" judge the past with knowledge nobody had then. Describe what people saw and why their choice made sense.
- **Separate trigger, root cause and contributing factors.** The trigger is what set it off (a deploy). Root causes are the conditions that let the trigger hurt users (no canary; a config with no validation). Contributing factors made it worse or longer (an alert that went to the wrong channel). There's usually more than one cause; don't force a single one.
- **Detection and response are findings too.** Measure time to detect and time to mitigate. If either was slow, at least one action item targets it.
- **"Where we got lucky"** is often the most useful section.
- **Few, strong action items.** Three to seven. Each has a type (prevent, detect, mitigate, process), one named owner (a person, not a team), a ticket, a priority and a due date, and a checkable end state. Prefer fixes that remove the hazard (validation, automation, guardrails) over fixes that rely on people remembering (training, "be careful", a checklist nobody reads). "Improve monitoring" isn't an action item. "Page on checkout 5xx above 2% for 5 min" is.
- **A postmortem without follow-through is the same as no postmortem.** Track action items to closure and look at repeats across incidents.

## 9. Verify

Run the checker on the postmortem before sharing it:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/incident-response/scripts/check-postmortem.mjs" docs/postmortems/2026-11-21-checkout-outage.md
```

It fails on missing sections, a timeline without timestamps, missing time to detect or mitigate, action items without an owner, ticket, due date or type, leftover placeholders, and blame language ("human error", "should have", "failed to", "careless"). Fix everything it reports, or explain to the user why a finding doesn't apply.

## Output

**During an incident**, keep replies short and in this order: **status** (sev, impact, state), **next action** (who does it, the command), **next update** at. Draft the status update for the user to post. Don't write long analysis mid-incident.

**After**, write the postmortem to the repo's postmortem folder (ask before creating `docs/postmortems/`), run the checker, and give the user the action items as a list they can file.
