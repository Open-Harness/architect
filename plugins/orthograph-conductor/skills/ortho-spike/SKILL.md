---
name: ortho-spike
description: The conductor's spike stage for an Orthograph app. Answers each doubt the plan marked spike with throwaway code in a worker, keeps one page per answer, and sends the plan back when an answer breaks it. Use it when the conductor's state says the stage is spike, or when a worker was started to answer one doubt.
---

# Spike what you doubt

Some doubts on the plan nobody can answer by thinking harder. If you describe the system now, you build it on a guess,
and find out which guess was wrong after the journeys are written. A spike gets the answer first, cheaply.

**Who does it:** one worker per doubt, in the spike role (touches throwaway code under `spikes/`; is given one
question; is checked by one page with the answer and what was tried). You, the conductor, brief each one and read what
comes back.

**Done when:** every doubt marked spike has a page at `spikes/<name>/README.md` with its question, its answer, what was
tried and the open risks; and the plan is updated from what was found, or the owner has said it stands.

## For the conductor

1. For each doubt marked spike, start a worker (`CONTRACT.md` in the conductor skill): role spike; skill `ortho-spike`;
   task, the doubt as the plan wrote it, word for word; may touch `spikes/<name>/` only; done when the page exists and
   its code ran; hand back the usual shape. Spikes are independent, so start them together.
2. Read each hand-back. Re-run its command yourself and compare what it printed. Log `worker.returned`, with its open
   questions.
3. If an answer breaks a rule or a thing on the plan page, log `stage.reopened` for `plan` with `from: "spike"` and the
   reason, and take the finding to the owner as one question, with the spike's own example. That loop is the process
   working, not a failure: say so.
4. When every spike is back and the plan stands, log the checks and `stage.done`, and enter describe.

## For the worker

You are given one question. Build the smallest thing that answers it, in `spikes/<name>/`, with no dependency on the
app and nothing the app will import. Then try to break it: if the question is about order, play every order the events
can happen in; if it is about a provider, call it with the edge cases, not only the case that works. Hold what you find
against the plan's rules, by name, and count how often each one breaks. Stop when the question is answered.

For example, "can a late reversal be mirrored without a balance going below zero?" was answered with no wallet and no
provider: a small ledger for one wallet, eight events, all 2520 orders. It found that in 225 of the 840 late orders the
holder had already withdrawn, and that each of three ways of mirroring the reversal broke a different rule: the
answer was a new thing (a shortfall) and two rules reworded, which only the owner could agree.

Write `spikes/<name>/README.md`, in this order: **Question** (as given); **Answer** (one or two sentences); what was
tried; what was found, with the counts and one example the owner can read; the decision it supports, or "none made"
and what the owner must decide; what was not tried; and the open risks. Hand back in the contract's shape, with the
command you ran and what it printed as evidence.
