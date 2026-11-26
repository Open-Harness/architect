# Plan it

Film: none yet

Before anything is described to the framework, you talk the system through with an agent until it fits on one page.
The page is what you argue with. Code comes later, and so does the blueprint.

## Say the idea in one sentence

We want the plan to start from what you mean, in your words, and not from a feature list. Plugged In already lets a
person claim a name and keep a page of links. Its next stage began as one sentence from its owner: people should be
able to pay each other by name, a handle gets a wallet, and anyone can send money to that name.

That is all the designer is given. It reads the app as it stands, and it reads nothing about how the idea might be
built.

## The agent says it back, as one page

The first thing a designer does is say your idea back, as strongly as it can, and say what it is not.

```txt capture=plan-page.txt
# the first page an agent drew for "pay by name", before any answer from the owner
The idea, said back
A claimed @name becomes a place money can be sent. Every claimed handle has one wallet, and anyone
who knows the name can pay its holder without knowing anything else about them.
It is NOT a bank, a shop checkout, an exchange or a way to ask for money. One currency (guess).
```

Then it draws the system, and only the system: the things and the states each can be in, who may do what, and what
must stay true. It names no file and no function. Here is what it said must stay true.

```txt part capture=plan-page.txt
What must stay true
- A name has at most one open wallet, and it belongs to whoever holds the name now.
- Money sent to @name reaches the person who held the name when it was sent, never a later one.
- A payment is counted once, however many times the sender presses send.
- A balance is exactly the settled payments in, minus the withdrawals and returns out.
- A balance never goes below zero.
```

Read those as the owner. The second one is a rule you might never have said aloud, and it decides what happens when a
name changes hands with a payment on its way. That is what the page is for.

## What waits, and where two places must agree

Two parts of the page are where real systems go wrong, and a good plan makes them plain. The first is anything that
takes time or another party. On the page, something that waits is a thing in a state, and it says what it is waiting
for.

```txt part capture=plan-page.txt
What waits
- A wallet in opening waits for the money provider to say the wallet exists.
- A payment in started waits for the provider to confirm the sender's money.
```

The second is every join between two places that hold the same fact.

```txt part capture=plan-page.txt
Where two places must agree
- The app's balance and the money the provider really holds for that wallet.
```

## It ends with doubts, not answers

A plan is finished when it says what it does not know. Each doubt is one question, and each is sorted: something to
try in throwaway code, which is the next chapter, or a decision only you can make, which stays a blank until you
make it.

```txt part capture=plan-page.txt
Doubts
- Is the money real, and who holds it: a provider, a chain, or points inside the app? Blank.
- Can a provider open a wallet per person and reliably tell us when money lands? Spike.
- What happens to the money when a name is released: withdrawn first, returned, kept? Blank.
```

And it asks you one question first, with its reason.

```txt part capture=plan-page.txt
First question
Is this real money, and if so who holds it while it sits in a wallet?
Why: every thing, wait and join above changes shape with the answer, and so does the law on us.
```

## What you read

One page, and nothing else. If you cannot see the whole system on it, it is not planned yet. You answer one question
at a time, and you say "I don't know" when you don't. When something on the page is wrong, you reject it and say why,
and the designer starts again from the facts.

## When it goes wrong

The agent plans a feature and not a system. A small whole thing shows its joins, and a feature hides them. If the
page has no part for what waits and no part for where two places must agree, send it back.

The page says how, and not what. A plan names things and rules. The moment it names a file, a table or a function, it
has stopped being something you can argue with.

A doubt gets settled by guessing. On this page the agent marked its guesses, each with the word. A guess that loses its
mark becomes a decision nobody made.

## How this stands

This is how we plan in this repository, and it is practice: no command runs a planning session, and nothing in
Orthograph draws the page. The page above is real. An agent drew it on 26 November 2026 from the one sentence and the
app as it stands, and it is printed as it was written. It is the first half of a session only: the owner has not yet
answered its first question, so nothing on it is decided, and this chapter has no film until that conversation has
happened.
