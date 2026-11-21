---
name: figure-check
description: Verify every number, label, formula, axis, caption and factual claim in content before it's published - Manim scenes and other videos, charts, slides, docs, posts, comment replies - by recomputing each one in code from the definition or the data and listing anything wrong. Use when the user asks to make sure values, calculations, labels or formulas are accurate, "grounded in truth", factually correct, to check the labels and values in a Manim scene against what it actually draws, or to check a video, chart or reply for false information.
---

# Figure check

Readers trust a chart or a video until they find one wrong number. After that they trust nothing in it. Check every figure. Don't spot-check.

## 1. Inventory

List every checkable item in the content, with where it appears (file and line, scene, or timestamp):
- numbers shown on screen or in text, and the units
- formulas and their notation
- axis ranges, ticks, labels and scales (linear or log)
- data points, bars, curves and their shapes (should it peak here? should it be skewed?)
- captions and terminology (the right technical term, used correctly)
- claims about the world (dates, names, "X is the most common...")

Read the source that generates the content: the Manim scene, the chart code, the data file, the script. Don't check only the rendered output.

## 2. Recompute

For each item, recompute it independently in code. Use Python (`python -I -c` or a scratch script) with numpy, scipy or sympy, or Node. Recompute from the definition or the raw data, not by re-reading the content's own code. For example: compute the p-value from the test statistic, re-derive the formula symbolically, re-sample the distribution with a fixed seed, recompute IoU from the box coordinates.

- Concepts: check the definition against a primary source (the textbook definition, the paper, the official docs). Watch for the classic misreadings, like a p-value being read as P(H0 is true), correlation as causation, or the base-rate fallacy.
- Visual shapes: check that the plotted function matches the claimed one (sample it and compare a few points).
- Rounding: displayed values match the computed ones at the shown precision.

## 3. Report

| # | Where | Shown | Correct | Status | Fix |
|---|---|---|---|---|---|

Status is one of ✅ correct, ❌ wrong, ⚠️ misleading or imprecise, ❓ unverifiable. Put every ❌ and ⚠️ first. Give the check script's path so the user can re-run it.

Fix the ❌ items when the user asked for fixes, re-render or rebuild if that's cheap, then run the check again. Say "all N items verified" only when that's true. Otherwise give the counts.
