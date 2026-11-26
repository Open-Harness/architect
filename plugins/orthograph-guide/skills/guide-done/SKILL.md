---
name: guide-done
description: The guide's stage that says what done means for an Orthograph app. Has journey stubs written while planning, an author thread fill them as stories that fail on purpose, and the owner agree them, before anyone builds. Use it when the guide's state says the stage is done, or when a thread was started as the author.
---

# Say what done means

The manual's chapter: "Say what done means" (`docs/manual/chapters/04-say-what-done-means.md`).

**Who does it:** you, the guide, make the stubs and brief the author. One thread in the author role writes the
journeys. The owner reads them as stories. Whoever builds later is a different thread and never edits a journey.

**Done when:** every thing has its journey stubs, filled in by the author, with no blank left (`ortho check`);
`ortho prove --empty` is red, and every green step is marked `proved by the description`; and the owner has read the
journeys as stories and agreed them.

## For the guide

1. For each thing, run `ortho add journeys <thing>`: a stub for each path through its states, each role, each declared
   error and each refusal a rule gives.
2. Start the author thread (`CONTRACT.md`): role author; skill `guide-done`; task, the things and the plan page; may
   touch the journeys and their starting worlds only; done when `ortho check` lists no journey blank and
   `ortho prove --empty` fails as it should; hand back the usual shape.
3. When it returns, re-run `ortho prove --empty` yourself and log what it printed. A step that is green and is not
   marked `proved by the description` cannot fail: send it back.
4. Read the journeys' step names to the owner as stories, one journey at a time. Each sentence is something they can
   say yes or no to. A wrong sentence or a missing story goes back to the author. If a story shows the description is
   missing something, log `stage.reopened` for `describe`.
5. With the owner's yes, log the checks and `stage.done`. The next stage, build, is in the manual's chapter 5 until its
   skill is written.

## For the thread (the author)

Start from the stubs. Read the declarations, not any handler. Fill each blank, and write the stories the stubs could
not guess: the move that works, each refusal, each caller turned away. Each step is a call and what must be true after
it: the answer, the event, the state, the spans. Run `ortho prove --empty`: every step must fail with what it expected,
except those the runtime refuses before any handler runs. Never write a handler. Hand back in the contract's shape.
