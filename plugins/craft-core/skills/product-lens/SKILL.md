---
name: product-lens
description: Decide whether a change is worth building, for whom, and how we'll know - evidence vs assumptions, a specific user and pain, an outcome metric, options including do nothing, a thin slice and a kill criterion, ending in a build, test-first or don't-build call. Use when the user asks whether a feature is worth building, what to build next, how to prioritize a backlog, what the success metric should be, who the product is for, to review a PRD or spec for these gaps, or to prepare customer interviews. Not for writing PRODUCT.md (project-docs), choosing a technology or build vs buy (architecture-decisions), or implementing the feature.
---

# Product lens

Most wasted engineering is good code for the wrong thing. Settle whether it's worth building, for whom, and how we'll know, before the "how".

Match depth to the request: a quick question gets a short answer; a real spec gets the full workflow. Read the repo's `PRODUCT.md`, `README`, issues and analytics docs first. Ask only for what's missing, in one batch.

## Workflow: "should we build X"

Run in order. Skip steps the user already answered.

1. **Evidence vs assumptions.** Label each known fact. *Evidence:* user quotes, tickets, analytics, usage logs, churn reasons, sales calls, spending. *Assumption:* everything else, including "users want X" with no source. Go to the rawest source available. Thin evidence is itself a finding.
2. **Situation.** Who has this problem (a segment with a count, not "users")? How often and how painful? How do they solve it today, and what did that cost them last time? Past behavior beats opinions about the future. What happens if we do nothing? Separate user from buyer if they differ.
3. **Problem statement**, one sentence: *[specific user] struggles to [task] because [cause], which costs them [consequence].* If you can't write it, say so and stop designing.
4. **Metric.** One primary metric that reflects real behavior change, with baseline (or "unknown: measure first"), target and timeframe. One leading indicator. One or two guardrails (latency, errors, support volume, churn). Name the events or queries; adding missing ones is part of the work. No vanity metrics.
5. **Options, at least three**, always including *do nothing* and *a smaller version*. For each: cost, time, reversibility, what it teaches us.
6. **Appetite.** What is this worth in time? Fix the time and cut the scope to fit.
7. **Thin slice.** The smallest end-to-end version that tests the riskiest assumption and is still useful.
8. **Rabbit holes and no-gos.** What could eat the budget, and what is explicitly out, with the trigger that would bring each back.
9. **Riskiest assumption and test.** The one assumption that makes the work pointless if wrong. The cheapest test that could disprove it: 5 targeted conversations, a fake door or waitlist, a manual version, a prototype, or an existing data query. Rollout steps, a decision date, and a **kill criterion written in advance**.
10. **Decide.** One call, the reasons, the untested assumptions, the next step:
    - **Build:** strong evidence, clear metric, small scope.
    - **Test first:** promising, riskiest assumption untested. Name the test and kill criterion.
    - **Don't build (now):** weak evidence, a cheap existing alternative, or cost far above value. Say what would change your mind.

## Reviewing a spec or PRD

Report gaps as a short list, most important first, quoting the line:

- User specific? Pain evidenced, not asserted?
- Measurable outcome with baseline and target, not only an output?
- Non-goals written down? Do-nothing or a smaller alternative considered?
- Time budget stated, and scope fits it?
- Reversible? If not, reviewed at the right level?
- Metrics and guardrails instrumented before launch?
- Failure, empty and error states covered? Rollout and rollback plan?
- Riskiest assumptions named, each with a cheap test?

## Load only when needed

- Problem statement, press release/FAQ, spec or experiment card templates: [references/templates.md](references/templates.md)
- Customer interviews or ongoing discovery: [references/discovery.md](references/discovery.md)
- Tech debt, performance, estimates, reliability, prioritization (RICE, cost of delay), or communicating a decision: [references/tradeoffs.md](references/tradeoffs.md)

## Output

For "should we build X": **Evidence vs assumptions**, **User and problem**, **Metric**, **Options**, **Riskiest assumption and test**, **Scope**, **Decision**, a few lines each. Say what outside signal would show the decision was right. If the user wants it recorded, offer to add it to `PRODUCT.md` or the decision log.
