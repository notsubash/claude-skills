# Reviewing tests

## The four questions (Khorikov's pillars)

1. **Protection against regressions.** Would it fail if the behavior broke? Does it exercise real code paths, or mostly mocks?
2. **Resistance to refactoring.** Would it survive a refactor that keeps behavior? Tests coupled to internals are false alarms waiting to happen, and false alarms teach people to ignore red.
3. **Fast feedback.** Fast enough to run on every change?
4. **Maintainability.** Can someone read it in 30 seconds and know what broke?

You can't max all four. Never give up 2 (resistance to refactoring). Trade between 1 and 3 by choosing unit, integration or end-to-end deliberately.

## Smells

| Smell | What it looks like | Why it's bad |
|---|---|---|
| Mirror test | Expected value computed with the code under test, or pasted in from its output | Always passes; checks the code agrees with itself |
| Mock zoo | Most collaborators mocked, assertions on `toHaveBeenCalledWith` | Tests your guess about the dependencies, not the code |
| Change detector | Asserts a constant, a config value or the exact structure of private data | Breaks on every legitimate change, catches no bugs |
| Implementation peek | Calls private methods, checks internal state or call order | Breaks on refactor |
| Assertion-free | Runs code with no assertion, or only `expect(x).toBeDefined()` | Only catches crashes |
| Logic in test | Loops, ifs, helpers computing expected values | The test can be wrong in the same way as the code |
| Swallowed failure | `try/except: pass` around the act step, `expect(...).not.toThrow()` hiding a real result | Turns failures into passes |
| Sleep | `sleep(2)` before asserting | Slow and flaky; wait for a condition |
| Shared state | Tests depend on order or on data another test created | Flaky, and fails in parallel |
| Giant test | Many behaviors in one test | First failure hides the rest; name can't say what broke |
| Snapshot dump | Huge snapshots accepted with `-u` without reading | Nobody reviews the diff; regressions get approved |
| Special-cased source | Code branches on a value only the tests use | Passes the tests, fails real input |

## Test desiderata (Kent Beck)

Isolated, composable, deterministic, fast, writable, readable, behavioral (sensitive to behavior changes), structure-insensitive (not sensitive to structure changes), automated, specific (a failure points at the cause), predictive (passing means it works in production), inspiring (passing gives confidence). Some of these pull against each other, for example predictive vs fast. Say which ones you're trading.

## Where the rules come from

- Anthropic, *Prompting best practices*: "avoid focusing on passing tests and hard-coding". Write a general solution, don't hard-code values for specific test inputs, and report incorrect tests instead of working around them.
- Kent Beck, *Test Desiderata*; *Test-Driven Development: By Example*: red, green, refactor.
- Vladimir Khorikov, *Unit Testing Principles, Practices, and Patterns*: the four pillars; mock only unmanaged out-of-process dependencies; observable behavior vs implementation details.
- Titus Winters et al., *Software Engineering at Google*, chapters 11–14: test via public APIs, test state not interactions, prefer real objects and fakes to mocks, DAMP not DRY in tests.
- Michael Feathers, *Working Effectively with Legacy Code*: characterization tests.
- Mutation testing (Stryker, PIT, mutmut) and property-based testing (QuickCheck, Hypothesis, fast-check).
- Jesse Vincent's superpowers `test-driven-development`, which craft's core bundle pins: watch the test fail first, and derive expected values independently.
- Guard ideas reviewed in karanb192/claude-code-hooks `protect-tests` (MIT) and Arnav66692/testguard: skip markers, deletions and assertion counts. The craft hook is a fresh implementation that also covers `.only`, config and coverage changes, masked exit codes and special-casing.
