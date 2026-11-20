---
name: product-lens
description: Think like a product-minded engineer - whether a change is worth building, for whom, and how we'll know. Separates evidence from assumptions, names the specific user and pain, sets an outcome metric with guardrails, compares options including do nothing and a smaller version, sets the appetite (time budget), finds the thin slice, rabbit holes and no-gos, designs the experiment with kill criteria, and ends in a build, test-first or don't-build call. Use when the user asks whether a feature is worth building, what to build next, how to prioritize a backlog, what the success metric should be, who a product is for, to review or write a PRD, spec, ticket or experiment, to prepare customer interviews, to frame tech debt or build-vs-buy as a product tradeoff, or to learn product thinking. Not for writing the PRODUCT.md file itself (use project-docs) or for implementing the feature.
---

# Product lens

Most wasted engineering is good code for the wrong thing. Ask whether a change is worth building, for whom, and how we'll know, before the "how".

Match the depth to the request: a quick question gets a short answer; a real spec gets the full template. Read the repo's `PRODUCT.md`, `README`, issues and analytics docs first. Ask only for what's missing, in one batch.

## Principles

1. **Problem before solution.** A feature request is a hypothesis about a problem. State the pain in the user's terms first.
2. **Outcomes over outputs.** Judge work by the change in user or business behavior, not by features shipped.
3. **Match process to reversibility.** One-way doors (public API contracts, core data models, pricing) get slow, senior, written review. Two-way doors (copy, layout behind a flag) get decided fast by whoever is closest. Call out two-way doors treated as one-way.
4. **Appetite before estimate.** Ask what the problem is worth in time, then shrink the solution to fit. Fixed time, variable scope.
5. **Shape before building.** Narrow the problem, set boundaries, name rabbit holes and no-gos before design or code.
6. **Write the customer story first.** If you can't write a compelling announcement and FAQ in the customer's words, you aren't ready to build.
7. **Past behavior beats opinions about the future.** Ask what users did last time and what it cost them, not whether they'd use it.
8. **Instrument before launch.** Success metric, guardrails and events exist before the flag turns on.
9. **Own the result.** After release, compare outcome to prediction and adjust the next bet.

## Workflow: a feature, ticket or "should we build X"

Run in order. Skip steps the user already answered.

1. **Evidence vs assumptions.** Label each known fact. *Evidence:* user quotes, tickets, analytics, usage logs, churn reasons, sales calls, spending. *Assumption:* everything else, including "users want X" with no source. Go to the rawest source available. Thin evidence is itself a finding.
2. **Clarify the situation.** Who has this problem (a segment with a count, not "users")? How often and how painful? How do they solve it today, and what does switching cost? What happens if we do nothing? Separate user from buyer if they differ.
3. **Problem statement**, one sentence: *[specific user] struggles to [task] because [cause], which costs them [consequence].* If you can't write it, say so and stop designing.
4. **Outcome and metrics.** One primary metric that reflects real behavior change, with baseline (or "unknown: measure first"), target and timeframe. One leading indicator. One or two guardrails (latency, errors, support volume, revenue, churn). Name the events or queries; adding missing ones is part of the work. Vanity metrics don't count.
5. **Options, at least three**, always including *do nothing* and *a smaller version*. For each: cost, time, reversibility, what it teaches us. A small table works.
6. **Appetite.** What is this worth to the business in time? Pick the option that fits.
7. **Thin slice.** The smallest end-to-end version that tests the riskiest assumption and is still useful. Prefer vertical slices over horizontal layers.
8. **Rabbit holes and no-gos.** What could eat the budget (edge cases, integrations, migrations, performance), and what is explicitly out, with the trigger that would bring each back.
9. **Riskiest assumption and experiment.** The one assumption that makes the work pointless if wrong (demand, value or feasibility). The cheapest test that could disprove it: 5 targeted conversations, fake door or waitlist, concierge/manual version, prototype, or an existing data query. Rollout (flag, 1%, 10%, 50%, 100%), decision date, and a **kill criterion written in advance**.
10. **Decide.** One call, the reasons, untested assumptions, next step:
    - **Build:** strong evidence, clear metric, small scope.
    - **Test first:** promising, riskiest assumption untested. Name the test and kill criterion.
    - **Don't build (now):** weak evidence, a cheap existing alternative, or cost far above value. Say what would change your mind.

## Reviewing a spec, PRD or ticket

Check each; report gaps as a short list, most important first, quoting the line you're responding to:

- User specific? Pain evidenced, not asserted?
- Measurable outcome with baseline and target, not only an output?
- Non-goals written down?
- Do-nothing or smaller alternative considered?
- Time budget stated, and scope fits it?
- Reversible? If not, reviewed at the right level?
- Metrics and guardrails instrumented before launch?
- Failure, empty and error states covered?
- Rollout and rollback plan?
- Riskiest assumptions named, each with a cheap test?

## Anti-patterns to call out

Building a handed-down spec without asking why. Counting output (tickets, PRs) as progress. Gold-plating an unvalidated feature. Overfitting to the loudest customer. Skipping do-nothing. Launching without metrics or a kill criterion. Extending the deadline instead of cutting scope. Treating product as someone else's job.

## Load only when needed

- Writing a problem statement, press release/FAQ, spec or experiment card: [references/templates.md](references/templates.md)
- Preparing customer interviews or setting up ongoing discovery: [references/discovery.md](references/discovery.md)
- Tech debt, performance, estimates, build vs buy, reliability, prioritization (RICE, cost of delay), communicating a decision, or teaching the method: [references/tradeoffs.md](references/tradeoffs.md)

## Output

For "should we build X": headings **Evidence vs assumptions**, **User and problem**, **Metric**, **Options**, **Riskiest assumption and test**, **Scope**, **Decision**. Keep each to a few lines. Say what outside signal (a number, a user, a test result) would show the decision was right. When the user wants it recorded, offer to add it to `PRODUCT.md` or the decision log through `project-docs`.
