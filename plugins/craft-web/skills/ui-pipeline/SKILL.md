---
name: ui-pipeline
description: Run the user's UI/UX pipeline on a screen, page or app - direction and critique with impeccable, product UI and demos with stageshow, remove the AI look with charles-unslop, then finish with Emil Kowalski's design-engineering details - working from real reference products and verifying in a real browser. Use for any UI design, redesign, landing page, dashboard or component work, or when the user says the UI looks generic, bland, AI-made or "slop", or asks for better animations, theming, icons or polish.
---

# UI pipeline

Order matters. Decide the direction before styling, remove the slop before polishing, and polish before motion details. Each stage hands the next a better screen.

## 0. Ground it in the real product

- Read the product brief (`PRODUCT.md`, `DESIGN.md`, `CLAUDE.md`) and the current UI code. Take screenshots of the current state with `playwright-cli` (or the browser tools you have) at desktop and mobile widths, in light and dark themes.
- **Collect real references.** Find 3–5 shipped products with the same values or audience and capture actual screenshots of them. Text descriptions of "good design" don't count. Write one line on what each reference does that we should borrow.
- Write the direction in five lines: who it's for, the personality, the palette (with the user's colors when they give them, and both light and dark), the type, and the one memorable moment this product could own.

## 1. impeccable: direction and critique

impeccable is opt-in. Its hooks run a prebuilt binary, so it isn't in the web bundle.
- **If it's installed:** run `/impeccable critique` (or `audit`) on the current screens, then `shape` the direction from step 0. If the project has no design context file yet, use `/impeccable init`. Decline its account sign-in prompt unless the user wants it.
- **If not:** do the critique yourself. Name the primary action and check it's the most prominent element. Check the reading order, the information architecture, empty, error and loading states, contrast and copy. Write the problems down as a numbered list before changing anything.

Either way, fix the hierarchy, layout, information architecture and copy here, before any decoration.

## 2. stageshow: product UI and demos

Where the page shows the product (heroes, feature cards, how-it-works, demos), build those visuals with stageshow from the real UI, not stock illustrations. Follow its framing and cropping rules. Animated demos use its cursor walkthroughs.

## 3. charles-unslop: remove the AI look

Run charles-unslop's audit: name every AI tell (gradient text, glows, pill badges, centered hero plus three cards, emoji icons, uneven spacing, generic copy) and fix them in its order: delete, then spacing, color, icons (one consistent icon set), copy, type, layout and details. Then add the one rich moment from step 0.

## 4. Emil Kowalski: finish

Apply emil-design-eng to the details: hover, press and focus states, easing and duration, interruptible animations, reduced motion, optical alignment, tabular numbers, no layout shift. For a deeper pass on a working screen, follow with `charles-polish`.

## 5. Verify, then show

- Re-screenshot the same views as step 0 and put before and after side by side.
- Check the browser console for errors, run keyboard-only navigation, and check contrast (WCAG AA) and `prefers-reduced-motion`.
- Run the project's tests (e2e if they exist).
- Show the user the before and after, list what each stage changed, and ask which direction to push next. **Don't call it done on code alone.** The screenshots are the evidence.

If a stage's skill isn't installed, say which one is missing and continue with the others. Don't fake its output.
