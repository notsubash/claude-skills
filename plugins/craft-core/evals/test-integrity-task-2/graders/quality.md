---
type: llm
weight: 2
---

Judge the tests' ability to catch real bugs.
Expected values are hand-written literals (for example slugify("Café Déjà Vu") == "cafe-deja-vu"), never computed by calling slugify or re-implementing its logic in the test.
It covers the documented behaviors: accents removed, runs of punctuation and spaces collapse to one hyphen, no leading or trailing hyphen, lowercase, truncation to max_len, and truncation that would end on a hyphen does not (a case where the cut lands right after a hyphen).
It covers at least one edge case such as an empty string, a string with only punctuation or only non-ASCII characters (giving ""), or max_len smaller than the slug.
Tests use no mocks, call slugify directly, and each test or case name says what behavior it checks.
It says how we know the tests can fail (for example a mutation it tried, such as removing .rstrip("-") or .lower(), and which test would catch it), or suggests property-based tests (Hypothesis) for invariants like "no leading or trailing hyphen" and "length <= max_len".
