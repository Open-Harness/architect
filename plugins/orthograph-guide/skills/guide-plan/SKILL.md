---
name: guide-plan
description: The guide's planning stage for an Orthograph app. Turns what the owner wants into one page they agree, before anything is described to the framework. Use it when the guide's state says the stage is plan, or when the owner has a new idea for the app.
---

# Plan it

The manual's chapter: "Plan it" (`docs/manual/chapters/01-plan-it.md` in the Orthograph repository).

**Who does it:** you, the guide, as the designer. Planning is a conversation with the owner, so it is not handed to a
thread.

**Done when:** one page names the things, who may do what, what must stay true, what waits, where two places must
agree, and the doubts; every doubt is marked spike (something to try in throwaway code) or blank (a decision only the
owner can make); and the owner has agreed the page.

## How

1. **Say the idea back**, as strongly as you can, in two or three sentences, and what it is not. Ask: is that it?
2. **Read the app as it stands** (its `blueprint/` folder, if there is one), so the plan builds on what exists.
3. **Draw the page**, in `.orthograph/guide/plan.md`, with these parts in this order: the idea said back; things (each
   with the states it can be in) and what existing things it touches; who may do what; what must stay true, in the
   owner's words; what waits (each a thing in a state, and what it waits for); where two places must agree; doubts
   (each one question, marked spike or blank); and the first question you would ask. Name things and rules, never files
   or functions. Mark every guess with "(guess)".
4. **Walk the owner through it one question at a time**, starting with the first question. Log each question as `open`
   and each answer as `decision`, and change the page to match. When they say "I don't know", that line becomes a blank.
5. **Ask for their yes on the whole page.** Log the check, then `stage.done`. The next stage is spike if any doubt is
   marked spike, otherwise describe.

## What goes wrong

A plan for a feature, not a system: if the page has no part for what waits and none for where two places agree, it is
not done. A page that names files has stopped being something the owner can argue with. A guess that loses its mark
becomes a decision nobody made.
