---
type: llm
weight: 2
---

Item 1 is marked correct (mean 50, SD = sqrt(100*0.5*0.5) = 5).
Item 2's p-value is checked (the exact binomial P(X>=60) is about 0.028; the normal approximation with continuity correction gives about 0.029) AND the interpretation "2.8% chance the coin is fair" is flagged as wrong.
Item 3 is flagged wrong: the standard error is sigma / sqrt(n), not sigma / n.
Item 4 is marked correct.
Item 5 is flagged wrong: a 99% interval is wider than a 95% one.
The result is presented as a table with a fix for each wrong item.
