---
name: design-board
description: How to work a design question through with Aaron on a board he can argue with, and how to land what he decides (a worked example as files, options graded on one rubric, every problem with its standing, then a decision record, the canon and the supersedes guard). Use it when Aaron thinks aloud about how something should work, rejects a proposal, asks you to poke holes or steel-man him, or says "note the delta" or "update the canon".
---

# The design board

A board is one page that holds a design argument: what was asked, what the repository already says, the options,
and what was decided. The model is `docs/explainer/films/capxul-lite/board/board.html`, and what it led to is
`design/decisions/K46-things-last.md`.

## Working the question

1. **Say it back first.** Repeat what he means in your own words, as strongly as you can put it, before you judge
   it. If he says "steel-man what I mean", that is the whole first section.
2. **Check the repository before you answer.** Read the canon page, the decision records and `docs/canon/status.md`
   for every idea in play. Say what runs today, what is decided and not built, and what nobody has decided. Never
   call a thing new until you have looked for it; never call a thing a workflow, an actor or a plugin if the
   repository's own meaning of the word does not fit.
3. **Work it on a small, whole example.** A feature hides the joins; a small system shows them. Write the example
   as files, as if the framework existed, with each proposed line marked. The questions that find the strain: who
   has the last word on each fact, who has to say yes, what waits, what happens on no and on silence, and what a
   change costs once it is live.
4. **When he rejects a proposal, start again from the facts.** List what nothing can change. Give three solutions
   that differ in kind, each with its code, and grade them on one rubric that includes what each gives the rest of
   the framework and what it costs to build. Recommend one and say why. Say what you would drop.
5. **When he corrects you, he is usually pointing at a confusion in your argument.** Find it, name it on the board,
   and fix every place it touched. Do not defend the old sentence.

## What the board holds

- His notes, each answered against the repository, with where it is dealt with.
- The options, the rubric, and what else falls out of each.
- Every problem either of you found, who raised it, what was proposed, and how it stands: runs today, decided,
  proposed, or open. One colour for each, the same everywhere.
- A short list of decisions for him, batched, each with your recommendation. He answers in a line.
- After he answers: what he decided, in his words, and what follows from each.

Write it as a page, publish it, and keep the file in the repository. Tell him the result in a form he can listen
to: short sentences, no tables, the link at the end.

## Landing what he decides

Do this only when he says to ("note the delta", "update the canon").

1. **A decision record**, `design/decisions/K<n>-<slug>.md`, taking the next free K for a call that crosses goals.
   Quote each call in his words with the date. Keep three things apart: what he decided, what is only your sketch of
   how it might be spelled, and what stays open. Say who builds it, and if nobody does, say so.
2. **`## Supersedes`**, one line for each live phrase the calls replace (`- <doc>: "<old>" → "<new>"`). Rewrite
   the live docs. Dated records keep their words and gain "(Superseded by K<n>, <date>: …)" beside them.
3. **The canon**: change the sentences that are now wrong, and add a `<Note kind="decision">` on the page that owns
   each idea. A designed code fence needs a slice, so with no slice the page says it in words and points at the
   record. Add the record to each page's `decisions`.
4. **`design/later.md`**: one line for what is decided as a design and has no slice, with what it must be decided
   before.
5. **Run both guards**: `node docs/canon/check.mjs` and `tools/ci/supersedes.sh`.
6. **Leave other goals' work to them.** Do not rename code, edit another goal's paths, add rows to the status page
   or slices to the milestones. Record what you left and for whom; open a Decision issue when another goal has to
   carry a rename or answer a disagreement with its own record.

## What to avoid

- Marking something as a proposal that already exists, or as existing when it is only decided.
- A recommendation with no rubric, or a rubric that leaves out the cost.
- Treating "a person should not have to read this" as "this should not be declared". The test for the blueprint is
  whether the framework needs to know it.
- Recording your own spelling of an idea as if he had agreed the spelling.
