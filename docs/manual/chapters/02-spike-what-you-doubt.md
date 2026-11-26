# Spike what you doubt

Film: `docs/explainer/films/spike/`

The plan for "pay by name" fits on one page, and the page lists seven doubts. Five are decisions only you can
make. Two are questions nobody can answer by thinking harder. If you describe the system now, you build it on a guess,
and you find out which guess was wrong after the journeys are written.

## Give one agent one question

We want an answer before the design depends on it, and we want it cheaply. So one agent takes the
[spike](../working-with-your-agents.md) role and is given one line of the page, as it is written there.

```txt part capture=plan-page.txt
- Can a late reversal be mirrored without a balance going below zero? Spike.
```

That sentence is the whole task. The agent may write throwaway code in a folder of its own under `spikes/`, and it
may touch nothing in the app. It builds the smallest thing that answers the question, and then it tries to break it.

## Play every order, and count what breaks

A late reversal is a question about order: the money came in, some of it left, and then the provider took the payment
back. So the spike builds no wallet and calls no provider. It keeps a small ledger for one wallet and plays the same
eight events in every order they can happen.

```sh capture=spike-run.txt
$ node spikes/pay-by-name-reversal/spike.mjs
question: can a late reversal be mirrored without a balance going below zero?
played: 8 events on one wallet, in every order they can happen: 2520 orders
  pay A 50 · A clears · pay B 30 · B clears · withdraw 40 · withdraw 30 · the provider reverses A · the notice comes again
in 1680 orders the reversal comes before A clears: every rule is kept, whatever the app does
in 840 orders the reversal is late: A had already cleared
in 225 of those the holder had already withdrawn, and what is left cannot cover it
```

Two thirds of the orders are safe, because a payment that is still held can simply be returned. The doubt lives in
the other 840, and inside those, in the 225 where the holder has already taken money out.

## Each way of mirroring breaks a different rule

The spike then tries three things the app could do with a late reversal, and holds each to rules copied from the
plan page. The plain one is to take the money out of the balance.

```sh part capture=spike-run.txt
mirror it at once
  broken in 225 of 840: a balance never goes below zero
    for example: pay A 50 → 0, A clears → 50, withdraw 30 → 20, the provider reverses A → -30
```

Read the example as the owner. Nothing in it is unusual: a payment, a withdrawal, a reversal. Refusing to mirror the
reversal keeps the balance above zero, and makes it untrue.

```sh part capture=spike-run.txt
refuse to mirror it
  broken in 840 of 840: the app's balance and the money the provider really holds agree
```

The third way takes what is in the wallet and writes the rest down beside it.

```sh part capture=spike-run.txt
take what is there, and write the rest down as a shortfall
  kept in all 840: a balance never goes below zero
  broken in 225 of 840: a balance is exactly the settled payments in, minus the withdrawals and returns out
  kept in all 840: the same two rules, with the shortfall counted
  the shortfall: in 225 orders, 40 at most, and still owed at the end in 150
```

The balance holds, and two rules break as they are written: the one quoted, and the agreement with the provider, in
the same 225 orders. Both hold again once the shortfall is counted in them. And in 150 orders somebody is still owed
money when the events run out.

## One page is kept

The spike ends by writing one page, and the page opens with the question and the answer.

```md part capture=spike-readme.txt
**Question.** Can a late reversal be mirrored without a balance going below zero?
**Answer.** Not with the rules as the plan page has them. Once the holder has withdrawn, a late reversal breaks one of three rules, and the app only chooses which. A balance can be kept at zero or above if a new thing, a shortfall, carries the rest and two rules are reworded to count it.
```

Below that it says what was tried, what was found with the count beside each finding, and what was not tried. It
decides nothing. It says what you now have to decide, before the [blueprint](../../canon/blueprint.mdx) is written.

```md part capture=spike-readme.txt
- The rule "a balance never goes below zero" cannot stand beside "a payment that has settled can still be reversed"
  unless something else carries the difference. Either settled is final, or the page gains a thing.
```

The code is thrown away. It stays in its folder as the evidence for the page, and the app never imports it.

```sh capture=spike-files.txt
$ ls spikes/pay-by-name-reversal
README.md
spike.mjs
```

## What you read

The page, and nothing else. You read the answer, then the open risks, and you take both back to the plan. Here the
plan changes in one of two ways, and which one depends on the question the designer asked you first: who holds the
money.

## When it goes wrong

The spike answers a different question. An agent that finds a more interesting one will chase it. The page must open
with the sentence it was given, and a better question goes into the page as a note for you.

The spike only shows that the idea works. One order of events, mirrored at once, with the reversal arriving early,
would have printed nothing broken. Ask what it did to break the idea, and send it back if the answer is nothing.

The code gets kept. It works, so someone copies the ledger into the app. It was written to answer a question and was
never proved against a journey, and it should be written again from the blueprint.

The answer gets read as a decision. This page says a shortfall would work. It does not say the app should have one.
That is still yours to say.

And a spike can be too small to trust. This one played one wallet and one reversal, with no provider. Its page says
so, under open risks, and the plan should carry those risks forward and not the comfort.

## How this stands

Spiking is this repository's practice, and no command runs one: nothing in Orthograph starts a spike, names its
folder or checks its page. The spike above is real and small. An agent ran it on 26 November 2026 for this chapter,
and its run and its page are printed as recorded. It was run on a design nobody has agreed, because the plan page's
first question is still unanswered, so it supports no decision yet.

The page's other spike, whether a provider can open a wallet for each person, was not run. And nothing in Orthograph
stops an app importing spike code. That it never does is a rule we keep by hand.
