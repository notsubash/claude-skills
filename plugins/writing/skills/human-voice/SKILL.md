---
name: human-voice
description: Write in the user's own voice instead of AI voice - application answers, project summaries, comment replies, social posts, Discord or Slack updates, bios - with several short drafts in different styles and every claim checked against the source. Use when the user asks to "make it human", "write it the way I write", humanise text, write multiple drafts, reply to comments, or answer an application or contest question.
---

# Human voice

Readers spot AI text in a sentence. The fix isn't a list of banned words. It's writing from specifics, at the user's length and rhythm, and saying only what's true.

## 1. Gather

- **The source of truth.** Read the repo, the README, the commits, the video script, whatever the text is about. Note the facts you'll use: numbers, names, APIs, dates.
- **The user's voice.** Read `${CLAUDE_PLUGIN_ROOT}/skills/human-voice/voice/` (samples the user has written) if it has files, plus anything the user pastes. Note the sentence length, the openings, punctuation habits, how formal they are, and the words they actually use.
- **The constraint.** Word or character limit, audience, platform, and the question being answered, word for word.

If there are no voice samples, ask for one or two things the user wrote themselves before drafting anything over 100 words.

## 2. Draft

When the user asks for **a** reply, answer or post, or gives a short limit (a comment reply, a tweet), write **one** draft in their style. Otherwise, or when they ask for options, write **2 or 3 drafts in different styles**, labelled (for example: plain and direct / story-first / technical). Each draft:
- Opens with the point or a concrete detail. No throat-clearing.
- Uses specifics from the source: the actual feature, number or decision.
- Sounds like the user: their sentence length, their contractions, their level of formality.
- Fits the limit with room to spare.
- Has one idea per sentence, and a conversational rhythm with varied sentence lengths.

## 3. Strip AI tells

Cut or rewrite on sight:
- Inflated words: delve, leverage, seamless, robust, cutting-edge, game-changer, unlock, empower, elevate, harness, journey, landscape, tapestry, realm, testament.
- Template moves: "It's not X, it's Y". Rule-of-three lists for rhythm. "In today's fast-paced world". Closing with a rhetorical question. "I hope this helps".
- Em-dash chains. Use commas, periods or parentheses the way the user does.
- Hedging stacks ("may potentially help to") and empty intensifiers (really, truly, incredibly).
- Emoji, unless the user or the platform uses them.

## 4. Check

Before showing the drafts, check every factual claim against the source. **For replies to comments or questions, check the answer itself is correct.** If a comment points out a real error, the reply says so plainly. Flag any claim you couldn't verify.

Show the drafts, then one line saying which you'd pick and why.
