---
schema_version: "1.1"
tags: ["task", "figure-check"]
runs: 3
max_turns: 15
allowed_tools: ["Skill", "Read", "Glob", "Grep", "Write", "Bash"]
---

Before I render this Manim scene, check that every label and value on screen matches what's actually drawn. Give me a table.

```python
from manim import *
import numpy as np

class NormalArea(Scene):
    def construct(self):
        axes = Axes(x_range=[-4, 4, 1], y_range=[0, 0.5, 0.1])
        sigma = 2
        curve = axes.plot(lambda x: np.exp(-x**2 / 2) / np.sqrt(2 * np.pi), color=BLUE)
        title = MathTex(r"X \sim \mathcal{N}(0,\ \sigma^2 = 4)").to_edge(UP)
        peak = Text("peak density = 0.50").scale(0.5).next_to(axes.c2p(0, 0.4), UP)
        area = axes.get_area(curve, x_range=[-1, 1], color=BLUE, opacity=0.4)
        area_label = MathTex(r"P(-1 < X < 1) \approx 0.95").next_to(area, DOWN)
        tail = MathTex(r"P(X > 2) \approx 0.023").to_edge(RIGHT)
        self.add(axes, curve, title, peak, area, area_label, tail)
```
