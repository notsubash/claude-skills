---
name: test-integrity
description: Write tests that would catch a real bug, and make failing tests pass by fixing the code, never by weakening the test. Tests the public behavior with real dependencies where they're cheap, reproduces a bug in a failing test before fixing it, proves each new test can fail, and treats skipping, deleting, loosening or special-casing a test as off limits without the user's OK. Ends by running check-test-diff.mjs on the branch. Use when the user asks to add or write tests, raise coverage, add a regression test, fix a bug with a test, fix failing or flaky tests, "make the tests pass" or "get CI green", review tests that feel brittle, over-mocked or fake, or asks whether tests are any good. Not for setting up CI pipelines or test infrastructure from scratch.
---

# Test integrity

A test is only worth something if it would fail when the code is wrong. Agent-written tests tend to fail that bar in two ways. They're written to pass: they mock everything, assert on what the code just did, and copy the output in as the expected value. Or, when the code is wrong, the test gets changed instead of the code. The rules below stop both.

**The rule above all others.** Tests check the code. They don't define it. When a test fails, assume the code is wrong. Never do any of these to get a pass without the user's explicit OK, given after you've explained why the test is wrong:
- skip, `xfail`, `.only` or comment out a test, or delete or rename it out of the suite
- remove or loosen an assertion, widen a tolerance, or change an expected value to match the output
- exclude tests in config, lower a coverage threshold, add `continue-on-error`, `|| true` or `--no-verify`
- catch and swallow the error, or add `@ts-ignore`, `# noqa` or `eslint-disable` to silence it
- write code that recognizes the test's inputs (`if input == "the-test-value"`) or hard-codes the expected outputs

If a test really is wrong (the spec changed, or it asserted a bug), say which test, quote the line, explain why, and ask. If a task can't be done without breaking a test, stop and say so. A clear "I couldn't make this pass, and here's why" is worth more than a green run that lies.

The craft-core test guard hook enforces this: a weakening edit or command asks the user first (`CRAFT_TEST_GUARD=enforce` blocks it, `=warn` only tells you, `=off` turns it off).

## 1. Look first

- Find the test command, the framework, the fixtures and helpers, and how CI runs the tests (`package.json`, `pyproject.toml`, `Makefile`, `.github/workflows/`). Use the project's patterns. Don't add a second framework.
- Run the suite once before changing anything and note the result. You need to know which failures are yours.
- Read the code under test and its callers. Test what callers rely on.

## 2. What to test

- **Behavior through the public interface.** Call it the way callers do: the function, the endpoint, the CLI command, the component as a user sees it. A refactor that keeps behavior must not break the test. A behavior change must.
- **Each test names the bug it catches.** The test name or a one-line comment says what breaks if it fails ("rejects an expired token", not "test_validate_2"). If you can't name the bug, don't write the test.
- **The risky cases, not just the happy path**: boundaries (0, 1, max, empty, unicode), invalid input, error paths, concurrency, time zones, and the cases the bug report or spec mentions.
- **Don't test the framework, constants or the language.** A test that asserts a config value equals itself only gets in the way of change.

## 3. How to write it

- **Real over fake.** Use the real code, in-memory implementations, temp directories, and a real database or queue in a container (Testcontainers) or a local instance. Mock only what you can't afford or control: paid third-party APIs, the network, the clock, randomness. Keep fakes faithful to the real contract.
- **Don't assert that mocks were called** unless the call is the behavior (an email is sent; a payment is charged once).
- **Expected values are literals you worked out independently**, from the spec, by hand, or from a trusted source. Never compute them with the code under test, and never paste in whatever the code returned. Otherwise the test just checks the code agrees with itself.
- **Arrange, act, assert, flat.** No loops, branches or helpers that compute expected values in a test. Duplication in tests is fine; cleverness isn't.
- **Assert what the user sees**: the returned value, the saved record read back, the message on screen (by role, label or text, not CSS class or test id), the exit code and output. Not internal state or call order.
- **Deterministic.** Fixed seeds, a controlled clock, no sleeps (wait for a condition), no order dependence, no shared state between tests.
- **Characterization tests for legacy code**: before changing code with no tests, pin its current behavior with tests first (mark the ones that pin known bugs), then change it.
- **Property-based tests** for wide input spaces (parsers, serializers, money, sorting, round-trips): fast-check, Hypothesis, proptest, jqwik.
- **UI flows** in a real browser (Playwright). Unit tests of components don't show a flow works.

## 4. A bug fix

1. Write a test that reproduces the report. Run it. **Watch it fail, for the reason in the report**, not an import error or a typo.
2. Fix the code, the smallest change that fixes the cause.
3. Run the test (now passing) and the whole suite.
If you can't reproduce it in a test, say what you tried before touching the code.

## 5. Prove the tests can fail

A test you've never seen fail proves nothing. For each new test, do at least one:
- it was red before the fix (bug fixes), or
- break the code on purpose (flip a condition, return early, off-by-one), see the test fail, then revert. Say which mutation you tried, or
- run a mutation tester on the module (Stryker, mutmut, PIT, cargo-mutants) and add tests for surviving mutants that matter. Report the score.

## 6. Failing or flaky tests

- **Read the failure, then decide who's wrong.** Is the code wrong (the usual case), the test wrong, or the environment? Say which, with the evidence.
- **Flaky means a real bug somewhere**: a race, order dependence, time, leaked state, or an unawaited promise. Find it. Retries or longer timeouts aren't a fix. If you must quarantine a test, that needs the user's OK, a tracking issue and a named owner.
- **Don't hard-code to the tests.** The fix must work for inputs the tests don't use. If you find yourself writing a branch for one test's input, stop: the design is wrong, or the test is.

## 7. Verify

Run the whole suite and report the exact command and its result: counts, not "tests pass". Then check the branch for weakened tests:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/test-integrity/scripts/check-test-diff.mjs"
```

It compares with where the branch left `main` (pass another base as an argument). It fails on deleted or disabled tests, skips, `.only`, removed assertions, excluded tests, lowered coverage and masked exit codes. It lists for review: changed expected values and tolerances, swallowed errors and suppressions, and conditions in the code that compare with a literal the tests use (possible special-casing). Explain every finding to the user. A finding you can't justify means the change is wrong.

## Reviewing tests

For each test, ask: would it fail if the behavior broke? Does it break on a refactor that keeps behavior? Is the expected value independent of the code? Is anything mocked that could be real? Is it deterministic? Report the worst first, quoting the line. [references/review.md](references/review.md) has the full checklist, the smells and where the rules come from.
