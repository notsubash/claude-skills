---
name: product-lens
description: Apply product judgment before building - who exactly has the problem, the job they're hiring the product for, the evidence versus the assumptions, the riskiest assumption and the cheapest test of it, one success metric with a baseline and target, and the smallest scope worth shipping - ending in a build, test-first or don't-build call. Use when the user asks whether a feature is worth building, what to build next, how to prioritize features or a backlog, what the success metric should be, who a product is for, or to review a PRD, spec or feature idea. Not for writing the PRODUCT.md file itself (use project-docs) or for implementing the feature.
---

# Product lens

Most wasted engineering is good code for the wrong thing. Before the "how", settle who has the problem, how badly, how you'll know it worked, and the smallest thing that would tell you.

Work from the request in front of you. Ask only for what you can't find. Read the repo's `PRODUCT.md`, `README`, issues and analytics docs first.

## 1. Evidence before opinions

List what's known, and label each item:
- **Evidence:** user quotes, support tickets, issue threads, analytics numbers, usage logs, churn reasons, sales calls, the user's own repeated behavior.
- **Assumption:** everything else, including "users want X" with no source.

Go to the rawest source available: the ticket text rather than a summary of it, the event table rather than a dashboard. If the evidence is thin, say so plainly. That's itself a finding.

## 2. The user and the job

- **Who:** a specific segment, not "users". Say how many there are, how often the problem hits them, and how painful it is. Separate the person who uses it from the person who pays, if they differ.
- **The job:** "When <situation>, I want to <motivation>, so I can <outcome>."
- **Today's alternative:** what they do now (a workaround, a competitor, nothing) and what switching would cost them. If the current workaround is cheap and fine, the feature has to be much better, not just available.

## 3. Riskiest assumption, cheapest test

Name the one assumption that, if wrong, makes the work pointless. Usually it's demand ("they'll use it"), value ("it solves the job") or feasibility.

Propose the cheapest test that could prove it wrong, before building the full thing:
- 5 user conversations with a specific question
- a fake-door button or waitlist
- a concierge or manual version
- a clickable prototype
- an existing data query

Give the test a **kill criterion** decided in advance: "If fewer than 3 of 10 trial users enable it within a week, we stop."

## 4. One metric that would prove it

- **Primary metric:** what changes for the user if this works, measured by behavior, not opinion. Give the baseline (today's number, or "unknown: measure it first"), the target, and the timeframe.
- **Guardrails:** 1–2 metrics that must not get worse (for example support load, latency, churn or cost).
- **Instrumentation:** the exact events or queries that measure it. If they don't exist, adding them is part of the work.

Vanity metrics (page views, sign-ups without activation, "engagement") don't count unless they're tied to the job.

## 5. Scope to the smallest valuable version

- Cut to the slice that delivers the job for the core segment and tests the riskiest assumption.
- List what's deliberately out, and the trigger that would bring each item back.
- When comparing options, put value against cost explicitly. A small table works: option, who it helps, evidence, rough effort, risk.

## 6. Decide

End with one call and the reason:
- **Build:** strong evidence, clear metric, small scope.
- **Test first:** promising but the riskiest assumption is untested. Name the test and the kill criterion.
- **Don't build (now):** weak evidence, a cheap existing alternative, or cost far above value. Say what would change your mind.

## Reviewing a PRD, spec or feature idea

Check it against the steps above and report gaps as a short list, most important first:
- Is the problem stated with evidence?
- Is the user specific?
- Does a measurable metric have a baseline and target?
- Are non-goals listed?
- Is the riskiest assumption named?
- Are failure, empty and error states covered?
- Is there a launch and rollback plan?
- Is the instrumentation specified?

Quote the line you're responding to.

## Output

Keep it tight. Use these headings: **Evidence vs assumptions**, **User and job**, **Riskiest assumption and test**, **Metric**, **Scope**, **Decision**. When the user wants it recorded, offer to add the result to `PRODUCT.md` or the decision log through `project-docs`. Say what outside signal (a number, a user, a test result) would show the decision was right.
