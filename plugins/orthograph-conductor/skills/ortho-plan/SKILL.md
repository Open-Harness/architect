---
name: ortho-plan
description: The conductor's planning stage for an Orthograph app. Turns what the owner wants into one page they agree, before anything is described to the framework. Use it when the conductor's state says the stage is plan, or when the owner has a new idea for the app.
---

# Plan it

Before anything is described to the framework, you talk the system through with the owner until it fits on one page.
The page is what they argue with. The blueprint and the code come later.

**Who does it:** you, the conductor, as the designer. Planning is a conversation with the owner, so it is not handed to a
worker. You are given the problem in the owner's words, and you read the app as it stands (its `blueprint/` folder, if
there is one). You read nothing about how the idea might be built.

**Done when:** one page names the things, who may do what, what must stay true, what waits, where two places must
agree, and the doubts; every doubt is marked spike or blank; and the owner has agreed the page.

## How

1. **Say the idea back**, as strongly as you can, in two or three sentences, and say what it is not. Ask: is that it?
2. **Draw the page** in `.orthograph/conductor/plan.md`, with these parts in this order:
   - **The idea, said back.**
   - **Things**: each with the states it can be in, and the existing things it touches.
   - **Who may do what.**
   - **What must stay true**: rules in plain words, each one the owner could say yes or no to.
   - **What waits**: anything that takes time or another party, written as a thing in a state and what it waits for.
   - **Where two places must agree**: every join between two places that hold the same fact.
   - **Doubts**: each one question, marked **Spike** (something nobody can answer by thinking; try it in throwaway
     code) or **Blank** (a decision only the owner can make).
   - **First question**: the one you would ask first, with why.

   Name things and rules, never files, tables or functions. Mark every guess with "(guess)".
3. **Walk the owner through it one question at a time**, starting with the first question. Log each question as `open`
   and each answer as `decision`, and change the page to match. When they say "I don't know", that line becomes a
   blank. When they reject something, start that part again from the facts.
4. **Ask for their yes on the whole page.** Log the check, then `stage.done`. The next stage is spike if any doubt is
   marked spike; otherwise log spike as done with a note ("no doubts to try") and enter describe.

## What a page looks like

This one was drawn for "people should be able to pay each other by name" in an app where people already claim a
handle and keep a page of links:

```txt
The idea, said back
A claimed @name becomes a place money can be sent. Every claimed handle has one wallet, and anyone
who knows the name can pay its holder without knowing anything else about them.
It is NOT a bank, a shop checkout, an exchange or a way to ask for money. One currency (guess).

What must stay true
- A name has at most one open wallet, and it belongs to whoever holds the name now.
- Money sent to @name reaches the person who held the name when it was sent, never a later one.
- A payment is counted once, however many times the sender presses send.
- A balance is exactly the settled payments in, minus the withdrawals and returns out.
- A balance never goes below zero.

What waits
- A wallet in opening waits for the money provider to say the wallet exists.
- A payment in started waits for the provider to confirm the sender's money.

Where two places must agree
- The app's balance and the money the provider really holds for that wallet.

Doubts
- Is the money real, and who holds it: a provider, a chain, or points inside the app? Blank.
- Can a provider open a wallet per person and reliably tell us when money lands? Spike.
- What happens to the money when a name is released: withdrawn first, returned, kept? Blank.

First question
Is this real money, and if so who holds it while it sits in a wallet?
Why: every thing, wait and join above changes shape with the answer, and so does the law on us.
```

The second rule is one an owner might never have said aloud, and it decides what happens when a name changes hands
with a payment on its way. Finding rules like that is what the page is for.

## What goes wrong

A plan for a feature, not a system: a feature hides its joins. If the page has no part for what waits and none for
where two places agree, it is not done. A page that names files has stopped being something the owner can argue with.
A doubt settled by guessing: a guess that loses its mark becomes a decision nobody made.
