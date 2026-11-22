---
name: test-integrity
description: Write tests that would catch a real bug, and make failing tests pass by fixing the code, never by weakening the test - public behavior, real dependencies where cheap, a failing reproduction before a fix, proof each new test can fail, and check-test-diff.mjs on the branch at the end. Use when the user asks to write or add tests, raise coverage, add a regression test, fix failing or flaky tests, "make the tests pass" or get CI green, or review whether tests are any good. Not for setting up CI or test infrastructure from scratch.
---

# Test integrity

A test is only worth something if it would fail when the code is wrong. Agent-written tests miss that bar in two ways: they're written to pass (everything mocked, the output pasted in as the expected value), or the test gets changed when the code is wrong.

**The rule above all others.** Tests check the code; they don't define it. When a test fails, assume the code is wrong. Never do any of these to get a pass without the user's explicit OK, given after you've explained why the test is wrong:
- skip, `xfail`, `.only` or comment out a test, or delete or rename it out of the suite
- remove or loosen an assertion, widen a tolerance, or change an expected value to match the output
- exclude tests in config, lower a coverage threshold, add `continue-on-error`, `|| true` or `--no-verify`
- swallow the error, or add `@ts-ignore`, `# noqa` or `eslint-disable` to silence it
- write code that recognizes the test's inputs or hard-codes its expected outputs

If a test really is wrong (the spec changed, or it asserted a bug), name it, quote the line, explain why, and ask. If the task can't be done without breaking a test, stop and say so. "I couldn't make this pass, and here's why" beats a green run that lies. The craft-core test guard hook asks the user before a weakening edit goes through.

## 1. Look first

- Find the test command, framework, fixtures and helpers, and how CI runs them. Use the project's patterns. Don't add a second framework or new test infrastructure unasked.
- Run the suite once before changing anything and note the result, so you know which failures are yours.
- Read the code under test and its callers. Test what callers rely on.

## 2. What to test

- **Behavior through the public interface**, called the way callers do: the function, endpoint, CLI command, or component as a user sees it. A refactor that keeps behavior must not break the test; a behavior change must.
- **Each test names the bug it catches** ("rejects an expired token", not "test_validate_2"). If you can't name the bug, don't write the test.
- **The risky cases**: boundaries (0, 1, max, empty, unicode), invalid input, error paths, concurrency, time zones, and the cases the bug report or spec mentions.
- Don't test the framework, constants or the language.

## 3. How to write it

- **Real over fake.** Use the real code and whatever real dependencies the suite already uses (in-memory implementations, temp directories, a local or containerized database). Mock only what you can't afford or control: paid APIs, the network, the clock, randomness. Keep fakes faithful to the real contract.
- **Don't assert that mocks were called** unless the call is the behavior (an email is sent; a payment is charged once).
- **Expected values are literals worked out independently**, from the spec or by hand. Never compute them with the code under test or paste in what it returned.
- **Arrange, act, assert, flat.** No loops, branches or helpers computing expected values. Duplication in tests is fine.
- **Assert what the user sees**: the returned value, the saved record read back, the text on screen (by role, label or text, not CSS class), the exit code and output. Not internal state or call order.
- **Deterministic.** Fixed seeds, a controlled clock, no sleeps (wait for a condition), no order dependence or shared state.
- **Legacy code with no tests:** pin current behavior with characterization tests first (mark the ones that pin known bugs), then change it.
- Wide input spaces (parsers, serializers, money, round-trips) suit property-based tests if the project has a library for them.

## 4. A bug fix

1. Write a test that reproduces the report. Run it. **Watch it fail for the reason in the report**, not an import error or a typo.
2. Fix the code with the smallest change that fixes the cause.
3. Run the test and the whole suite.

If you can't reproduce it in a test, say what you tried before touching the code.

## 5. Prove the tests can fail

For each new test, do at least one:
- it was red before the fix (bug fixes), or
- break the code on purpose (flip a condition, return early, off-by-one), see it fail, revert, and say which mutation you tried, or
- run a mutation tester the project has (Stryker, mutmut, PIT, cargo-mutants) and report the score.

## 6. Failing or flaky tests

- **Read the failure, then decide who's wrong**: the code (usually), the test, or the environment. Say which, with the evidence.
- **Flaky means a real bug somewhere**: a race, order dependence, time, leaked state, an unawaited promise. Reproduce it (loop it, randomize order, add load) and fix it. Retries and longer timeouts aren't fixes. Quarantining needs the user's OK, a tracking issue and an owner.
- **The fix must work for inputs the tests don't use.** If you're writing a branch for one test's input, stop: the design or the test is wrong.

## 7. Verify

Run the whole suite and report the exact command and counts, not "tests pass". Then check the branch for weakened tests:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/test-integrity/scripts/check-test-diff.mjs"
```

It compares with where the branch left `main` (pass another base as an argument). It fails on deleted or disabled tests, skips, `.only`, removed assertions, excluded tests, lowered coverage and masked exit codes, and lists changed expected values, swallowed errors, suppressions and possible special-casing for review. Explain every finding to the user; one you can't justify means the change is wrong.

## Reviewing tests

For each test: would it fail if the behavior broke? Does it break on a behavior-preserving refactor? Is the expected value independent of the code? Is anything mocked that could be real? Is it deterministic? Report the worst first, quoting the line. Full checklist and smells: [references/review.md](references/review.md).
