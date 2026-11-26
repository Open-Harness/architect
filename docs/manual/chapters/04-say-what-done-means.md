# 4 · Say what done means

Film: `docs/explainer/films/say-done/` · App: `examples/plugged-in`

**How it stands.** Every command here runs today, and every line of output was recorded by `docs/manual/capture.sh`.
That a *different* agent writes the journeys is this repository's practice: no command starts an agent in a role, and
nothing in a new app stops a builder editing a journey. The journey commands are rough in four places, the four items
marked "rough" under "What goes wrong", and are being fixed (26 November 2026): this page shows what ran on the day it was
recorded.

## What you do

You agree the stories, and you do it before anyone builds. Adding them is part of planning: the **designer** leaves a
stub for each story, and an **author** fills them in. A builder adds nothing. Read back what the author writes: each [journey](../../canon/orthograph.mdx) is a short story with a cast, and
each step is a sentence you can say yes or no to.

```ts file=examples/plugged-in/journeys/claim-a-handle.ts lines=37-44
    s.step(
      "aaron claims the free name",
      s.aaron.run(claim, { name: "firstpage" }),
      expect((a) => a.handle).toMatch(/^hdl_[0-9a-z]+$/),
      emits(HandleClaimed, { handle: s.last.handle, name: "firstpage" }),
      machine.isIn(s.last.handle, "claimed"),
      spans({ present: ["handle.claim", "handle.claim.record", "handle.claim.commit"] }),
    ),
```

The first line under a step's name is the call. Every line after it is something that must be true once the call
returns: the answer, the [event](../../canon/operations.mdx), the [state](../../canon/machines.mdx), the
[spans](../../canon/traces.mdx).

## What your agent does

The designer makes the stubs while planning. One command writes a journey for each path through a thing's machine,
each role and each error an operation declares, and keeps the ones already written.

```sh capture=stubs.txt
$ ortho add journeys handle
wrote blueprint/journeys/handle-claim-created-in-claimed.ts
wrote blueprint/journeys/handle-release-claimed-to-released.ts
wrote blueprint/journeys/handle-release-refused-from-released.ts
wrote blueprint/journeys/handle-claim-refused-anonymous.ts
wrote blueprint/journeys/handle-release-refused-not-handleOwner.ts
wrote blueprint/journeys/handle-resolve-allowed-anyone.ts
wrote blueprint/journeys/handle-resolve-refused-handle-not-found.ts
```

A stub knows who may call and what must be refused. What it cannot know is a blank, and `ortho check` lists every
blank as a question, with its file and line.

```sh capture=stubs-check.txt
$ ortho check
journeys/handle-claim-created-in-claimed has 4 blanks
  blueprint/journeys/handle-claim-created-in-claimed.ts:14  a starting world where handle.claim can run
  blueprint/journeys/handle-claim-created-in-claimed.ts:18  handle.claim's payload: name
  blueprint/journeys/handle-claim-created-in-claimed.ts:19  HandleClaimed's fields: handle, name
  blueprint/journeys/handle-claim-created-in-claimed.ts:20  the handle's id
```

The author fills the blanks and writes the stories the stubs could not guess. Then it shows that every journey can
fail: it runs them on handlers that do nothing.

```sh capture=prove-empty.txt
$ ortho prove --empty
journey a name is claimed once ✘ 1/5 steps
journey a stranger cannot edit a page ✘ 4/8 steps
journey add, order and remove a link ✘ 0/12 steps
journey anyone reads a public page ✘ 0/5 steps
journey claim a handle ✘ 0/8 steps
journey release a handle ✘ 1/13 steps
journey a person claims a page and shares it ✘ 0/5 steps
prove ✘ 50 failing
```

## What you read

- **The journeys, as stories.** Read the step names top to bottom. If a sentence is wrong, or a story is missing, say
  so now. This is the cheapest moment to change your mind.
- **The red run.** Fifty of fifty-six steps fail, and that is the result you want. Each failure says what it expected:

```sh capture=prove-empty-one.txt
$ ortho prove --empty --only "claim a handle"
journey claim a handle ✘ 0/8 steps
  ✘ "an unclaimed name has no public page": BlankReached: refuse ProfileNotFound when?; expected refused with ProfileNotFound, failed with 500
```

- **The six that pass.** They are marked `proved by the description`: the blueprint already says who may call, so the
  runtime refuses a stranger before any handler runs. Nobody has to build those.

```sh part capture=prove-empty.txt
  ✔ "bob cannot move aaron's link, and the handler never runs": proved by the description
```

## What goes wrong

- **A journey is green on the empty run and is not marked `proved by the description`.** It cannot fail, so it proves
  nothing. Send it back to the author.
- **The author is also the builder.** Then the journeys say what the handler does, not what you meant. Use two
  sessions. Nothing enforces this for you yet.
- **A stub is left as it was written.** `ortho check` keeps listing its blanks, and `ortho model` shows the file as
  unfinished. A blank is a question for you, never a default.
- **Rough: A refusal has no stub.** A refusal that a rule gives, such as a name that is taken, gets none today. The author
  writes that journey unprompted, and you check it is there.
- **Rough: A blank is not listed.** `ortho check` lists blanks only under `blueprint/`. The stubs are written there; Plugged
  In keeps its finished journeys in `journeys/` at the root, and both places are read.
- **Rough: Adding stubs turns the check red.** That is right while they are blanks, and the same run also reports drift in
  `generated/` until `ortho generate` is run again. Nobody builds until the author has filled them.
- **Rough: A single new journey breaks the check.** `ortho add journey <name>` writes a stub with a blank cast, and the
  commands that read the model then stop with an error, not a question, until the cast is filled in:

```sh capture=stub-one-check.txt
$ ortho check
exit 1
```
- **The stories only cover the happy path.** Count the refusals: every declared refusal needs a step that causes it.
  The full run's coverage line counts them for you (chapter 5).
