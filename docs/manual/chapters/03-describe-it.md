# Describe it

Film: `docs/explainer/films/describe/`

The plan page is agreed as far as it goes. It names a wallet and its states, and it still has seven doubts on it,
five of them marked blank. Now the page has to become something the framework can check, and the parts you have not
decided must not be decided for you on the way.

## Declare what the page names

We want the framework to hold the plan's nouns, and nothing more than the plan says. The designer does not write the
[blueprint](../../canon/blueprint.mdx) from an empty file. It asks for each [thing](../../canon/things.mdx) and each
[operation](../../canon/operations.mdx) by name, and the framework writes the frame.

```sh capture=describe-add-thing.txt
$ ortho add thing wallet
wrote blueprint/things/wallet/thing.ts
wrote blueprint/things/wallet/machine.ts
wrote blueprint/things/wallet/roles.ts
```

```sh capture=describe-add-operation.txt
$ ortho add operation wallet.open
wrote blueprint/things/wallet/verbs/open.ts
```

The first command wrote seven files and the second wrote one. None of them holds a decision. Where a decision goes,
the frame has a blank, and the blank says in words what is missing.

```ts part capture=describe-0-open.ts.txt
export default Blueprint.operation(Wallet, {
  description: Blueprint.todo("what open does to a wallet, in one sentence"),
  payload: Blueprint.todo("what a caller sends"),
  answer: Blueprint.todo("what open answers"),
  allowed: Blueprint.todo("who may open"),
});
```

## Every blank is a question with an address

We want to see what is undecided as a list, not find it by reading. The check prints each blank with its file and its
line, and counts them.

```sh capture=describe-0-check.txt
$ ortho check
wallet has 7 blanks
  blueprint/things/wallet/machine.ts:6  the states a wallet can be in, the first one where it starts
  blueprint/things/wallet/roles.ts:5  when a person holds this role on a wallet
  blueprint/things/wallet/thing.ts:4  what a wallet is, in one sentence
  blueprint/things/wallet/verbs/open.ts:5  what open does to a wallet, in one sentence
  blueprint/things/wallet/verbs/open.ts:6  what a caller sends
  blueprint/things/wallet/verbs/open.ts:7  what open answers
  blueprint/things/wallet/verbs/open.ts:8  who may open
```

Seven questions, and the designer reports them to you as questions. The model says the same thing more briefly. It
lists the wallet beside the things that are finished, with no states yet, and then says what is not done.

```sh part capture=describe-0-model.txt
thing wallet ()  442d058dd5931be9
unfinished wallet  3 blanks
unfinished wallet.open  4 blanks
```

## Fill only what the page already says

Two of the seven are answered on the plan page, where it names the wallet: a handle's money, one per claimed handle,
with four states. So the designer fills those two, in the words of the page.

```ts part capture=describe-1-thing.ts.txt
  description: "A handle's money, one for each claimed handle.",
```

```ts part capture=describe-1-machine.ts.txt
  states: ["opening", "open", "frozen", "closed"],
  moves: {},
```

The first state is where a wallet starts. The [moves](../../canon/machines.mdx) between them are still empty, and
that is honest: the page says what a wallet in opening waits for, and nobody has yet said who holds the money. The
check now counts five.

```sh capture=describe-1-check.txt
$ ortho check
wallet has 5 blanks
  blueprint/things/wallet/roles.ts:5  when a person holds this role on a wallet
  blueprint/things/wallet/verbs/open.ts:5  what open does to a wallet, in one sentence
  blueprint/things/wallet/verbs/open.ts:6  what a caller sends
  blueprint/things/wallet/verbs/open.ts:7  what open answers
  blueprint/things/wallet/verbs/open.ts:8  who may open
```

The designer stops there. Who may open a wallet depends on the page's first question, and you have not answered it.

## The generated files have fallen behind

The same check has a second complaint, further down. The blueprint changed, so the files made from it are stale.

```sh part capture=describe-1-check.txt
drift ✘ 8
  generated/sdk/src/wallet/types.ts  no-edited-output: is missing: run ortho generate
```

Generating does not wait for the blanks. It writes what it can for the wallet as it stands.

```sh capture=describe-2-generate.txt
$ ortho generate
updated generated/api/src/errors.ts
updated generated/model/model.json
updated generated/sdk/src/index.ts
created generated/sdk/src/wallet/types.ts
updated generated/server/main.ts
updated generated/server/migrations/0001_things.sql
created generated/docs/wallet/index.md
updated generated/portal/blueprint.json
updated blueprint/refusals.lock
```

So the unfinished thing is generated: it gets its types, its page of docs and its table. The unfinished operation is
left out, and no handler is written for it. After this the check has one complaint left.

```sh part capture=describe-2-check.txt
wallet has 5 blanks
types ✔
rules ✔
drift ✔
ratchets 0
check ✘
```

## What you read

You read the blueprint files the designer changed, which here is two lines, and the list of blanks. Each blank is
either a question you can answer now or one of the doubts from the plan. The count is the thing to watch. It goes down
only when you decide something.

## When it goes wrong

Generating too early writes a file that does not compile. We recorded it: with the wallet's states still blank,
`ortho generate` wrote the wallet's types anyway, and the check then failed on them.

```sh part capture=describe-early-check.txt
types ✘ 1
  generated/sdk/src/wallet/types.ts:9  TS1110: Type expected.
```

Fill a thing's states before you generate, or generate again once they are filled.

A designer will sometimes fill a blank the page does not answer. The check cannot tell a decision from a guess: a
blank that is gone is simply gone. So when the count drops, ask which line of the plan each answer came from.

The check fails for as long as one blank is left, and it says `check ✘` whether the blueprint is broken or only
unfinished. Read the parts above that line. Nothing yet tells the two apart for you.

Not everything undecided becomes a blank. The frame wrote the wallet's moves as an empty list and its rules as an
empty file, and the check counts neither. What must stay true on the plan page is not in the blueprint until the
designer writes it.

## How this stands

Adding a thing and an operation, the check's list of blanks, the model's unfinished lines and generating all run
today, and everything above was recorded on Plugged In on 26 November 2026. The two blanks were filled by the
recording itself, in the words of the plan page; no agent was filmed designing, and the wallet was removed from the
example afterwards. That a designer leaves a blank for what you have not decided is this repository's practice.
Orthograph has one kind of blank today. A second kind, for a decision that is yours and not the designer's, is
designed and not built, and so is a check that passes everything but the blanks.
