---
name: deepen
description: Turn a request into a deeper version of itself before doing it - what a top professional would add, the raw material they'd start from, their methods and tools, and what outside check proves the result right - then rewrite the prompt. Use when the user says "deepen this", "make this prompt deeper", "what would a pro do here", or passes a prompt to sharpen.
disable-model-invocation: true
argument-hint: "[the prompt to deepen]"
---

# Deepen

The goal is a deeper version of the task, not a bigger one. Keep the user's goal and scope. Change the depth.

Take the prompt in `$ARGUMENTS`, or the user's latest request if that's empty, and answer these four questions specifically for this task:

1. **What would a top professional in this field do here that I'm not asking for?** Name the person ("a staff security engineer", "a motion designer for math explainers") and two or three concrete moves. Leave out generic advice like "write tests".
2. **What is the rawest material they would start from,** instead of what has already been digested for me? For example: the spec instead of a blog post, the logs instead of a summary, the transcripts instead of a list of popular items, the source instead of the README.
3. **Which specific methods and tools would they use?** Name them: the technique, the command, the library, the checklist.
4. **What, other than you or me, would show the result is right?** A test suite, a validator, a benchmark, a real user, CI on a clean machine, a third-party reviewer, a metric with a threshold.

Then **rewrite the prompt** to ask for exactly that, in the user's voice, as one fenced block they can copy. Keep it about as long as the original plus what the four answers add. Don't pad it.

Finish with one line asking the user whether to run the rewritten prompt, edit it, or keep the original. **Don't start the task until they answer.**

## Automatic mode

The craft-core `UserPromptSubmit` hook applies this to the first substantial prompt of each session. `!raw` at the start of a prompt skips it for the session; `CRAFT_DEEPEN=off` turns it off.
