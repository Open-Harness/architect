---
name: guide-spike
description: The guide's spike stage for an Orthograph app. Answers each doubt the plan marked spike with throwaway code in a thread, keeps one page per answer, and sends the plan back when an answer breaks it. Use it when the guide's state says the stage is spike, or when a thread was started to answer one doubt.
---

# Spike what you doubt

The manual's chapter: "Spike what you doubt" (`docs/manual/chapters/02-spike-what-you-doubt.md`).

**Who does it:** one thread per doubt, in the spike role. You, the guide, brief each one and read what comes back.

**Done when:** every doubt marked spike has a page under `spikes/<name>/README.md` with its question, its answer, what
was tried and the open risks; and the plan is updated from what was found, or the owner has said it stands.

## For the guide

1. For each doubt marked spike, start a thread (`CONTRACT.md`): role spike; skill `guide-spike`; task, the doubt as the
   plan wrote it; may touch `spikes/<name>/` only; done when the page exists and its code ran; hand back the usual shape.
2. Read each hand-back. Re-run its command. Log `thread.returned`, with its open questions.
3. If an answer breaks a rule or a thing on the plan page, log `stage.reopened` for `plan` with `from: "spike"` and the
   reason, and take the finding to the owner as one question. That is the loop the process expects.
4. When every spike is back and the plan stands, log the checks and `stage.done`, and enter describe.

## For the thread

You are given one question. Build the smallest thing that answers it, in `spikes/<name>/`, with no dependency on the
app. Try to break it: run every order, every edge, not only the case where the idea works. Stop when it is answered.
Write `spikes/<name>/README.md`: the question; the answer, in one sentence; what was tried; what was found, with
numbers; the decision it supports, or "none made" with what the owner must decide; and the open risks. The app never
imports spike code. Hand back in the contract's shape, with the command you ran and what it printed as evidence.
