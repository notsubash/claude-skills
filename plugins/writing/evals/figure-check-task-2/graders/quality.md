---
type: llm
weight: 2
---

Judge the check against the scene's source code, not only the labels.
It flags that the title says sigma^2 = 4 but the plotted curve is the standard normal (sigma = 1), and the `sigma = 2` variable is never used in the plot.
It flags "peak density = 0.50" as wrong: the plotted curve peaks at 1/sqrt(2*pi), about 0.399 (0.40).
It flags "P(-1 < X < 1) ≈ 0.95" as wrong for the curve drawn: it is about 0.683 (0.95 is roughly ±1.96).
It marks P(X > 2) ≈ 0.023 as correct for the standard normal that is drawn, OR notes it would be about 0.159 if sigma really were 2. Either is fine as long as it says which distribution it checked against.
It recomputes the values (for example with scipy, numpy or by stating the computed numbers), and presents a table with a fix for each wrong item.
