---
name: guide-describe
description: The guide's describe stage for an Orthograph app. Turns the agreed plan page into a blueprint, filling only what the plan answers and leaving every undecided thing as a blank the check lists. Use it when the guide's state says the stage is describe.
---

# Describe it

The manual's chapter: "Describe it" (`docs/manual/chapters/03-describe-it.md`).

**Who does it:** you, the guide, as the designer, or one thread in the designer role for a large plan. The owner
answers the blanks.

**Done when:** the blueprint declares every thing and operation the plan names; `ortho check` lists no blank the plan
already answers, and every blank it lists is logged as an open question for the owner; `ortho generate` has run, so
`ortho check` shows no drift.

## How

1. **Declare what the plan names**: `ortho add thing <name>` for each thing, `ortho add operation <thing>.<verb>` for
   each act on the page. The framework writes the frame, with a blank (`Blueprint.todo("...")`) wherever a decision goes.
2. **Fill only what the plan answers**, in the plan's words: what a thing is, its states, who may do what, the rules.
   Never guess. A line the plan does not answer stays a blank.
3. **Run `ortho check`.** Log it (`check.ran`, with what it printed). Each blank it lists is a question: log it as
   `open` for the owner, and ask them one at a time, with your recommendation. Fill each answer, run the check again.
4. **Run `ortho generate`**, then `ortho check` again: types, rules and drift pass. Blanks left are only those still
   waiting on the owner.
5. When the owner has answered what this first operation needs, log the checks and `stage.done`, and enter done.

If filling a blank shows the plan was wrong or missing something, log `stage.reopened` for `plan` with `from:
"describe"`, and take it to the owner as one question.

## What goes wrong

Generating before a thing's states are filled writes types that do not compile; the check says so, and filling the
states fixes it. The check cannot tell a decision from a guess: when the count of blanks drops, say which line of the
plan each answer came from.
