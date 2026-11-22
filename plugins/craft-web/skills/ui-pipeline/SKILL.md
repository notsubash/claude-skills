---
name: ui-pipeline
description: Run the user's UI pipeline on a page, screen or app - ground it in real reference products, set direction and critique (impeccable), build product visuals (stageshow), remove the AI look (charles-unslop), then finish the details (emil-design-eng), verified with before and after screenshots in a real browser. Use when the user asks to design, redesign or polish a whole page, screen, landing page, dashboard or app, or says the UI looks generic, bland, AI-made or "slop". Not for a single component fix, one style tweak or a bug in UI code; edit those directly.
---

# UI pipeline

Order matters: decide the direction before styling, remove the slop before polishing, and polish before motion details.

## 0. Ground it in the real product

- Read the product brief (`PRODUCT.md`, `DESIGN.md`, `CLAUDE.md`) and the current UI code. Screenshot the current state with `playwright-cli` (or the browser tools you have) at desktop and mobile widths, in each theme the app supports.
- **Collect real references.** Find 3-5 shipped products with the same values or audience and capture real screenshots. Write one line on what each does that we should borrow.
- Write the direction in five lines: who it's for, the personality, the palette (the user's colors when given), the type, and the one memorable moment this product could own.

## 1. Direction and critique

- **If impeccable is installed:** run `/impeccable critique` (or `audit`) on the current screens, then `shape` the direction from step 0. With no design context file yet, use `/impeccable init`. Decline its account sign-in prompt unless the user wants it.
- **If not:** critique it yourself. Name the primary action and check it's the most prominent element. Check reading order, information architecture, empty, error and loading states, contrast and copy. List the problems before changing anything.

Fix hierarchy, layout, information architecture and copy here, before any decoration.

## 2. stageshow: product visuals

Where the page shows the product (heroes, feature cards, how-it-works, demos), build those visuals with stageshow from the real UI, not stock illustrations. Animated demos use its cursor walkthroughs.

## 3. charles-unslop: remove the AI look

Run its audit: name every AI tell (gradient text, glows, pill badges, centered hero plus three cards, emoji icons, uneven spacing, generic copy) and fix them in its order: delete, then spacing, color, icons, copy, type, layout and details. Then add the one memorable moment from step 0.

## 4. emil-design-eng: finish

Apply it to the details: hover, press and focus states, easing and duration, interruptible animations, reduced motion, optical alignment, tabular numbers, no layout shift. For a deeper pass on a working screen, follow with `charles-polish`.

## 5. Verify, then show

- Re-screenshot the same views as step 0 and put before and after side by side.
- Check the console for errors, keyboard-only navigation, contrast (WCAG AA) and `prefers-reduced-motion`.
- Run the project's tests (e2e if they exist).
- Show the before and after, list what each stage changed, and ask which direction to push next. The screenshots are the evidence; don't call it done on code alone.

If a stage's skill isn't installed, say which one and continue with the others. Don't fake its output.
