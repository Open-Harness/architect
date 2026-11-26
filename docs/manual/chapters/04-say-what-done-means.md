# Say what done means

Film: `docs/explainer/films/say-done/`

An agent can write a handler in minutes. So the question is never whether it can build this. The question is how you
will know it is right. The answer is to say what done means before anyone builds, and to have someone other than the
builder say it.

## Done is a story

In Orthograph, done is a [journey](../../canon/orthograph.mdx): a short story with a cast, told through real calls to
the real system. Each step is a sentence you can say yes or no to, and under the sentence is a call and what must be
true once it returns.

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

The first line under the name is the call. After it come the answer, the [event](../../canon/operations.mdx), the
[state](../../canon/machines.mdx) and the spans of the [trace](../../canon/traces.mdx). You do not check the code
against this. You read the sentence, and decide whether it is what you meant.

## Stubs are made while planning

We want a story to exist for every path before anyone thinks about building, so adding them belongs to planning. The
designer does it, with one command for each thing in the blueprint. The command keeps any journey already written.

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

Seven files: one for each path through the handle's states, one for each role, and one for each error an operation
declares. A stub already knows who may call and who must be turned away. What it cannot know, it leaves blank, and
the check lists every blank as a question, with its file and its line. A blank is a question for you, never a default.

```sh capture=stubs-check.txt
$ ortho check
journeys/handle-claim-created-in-claimed has 4 blanks
  blueprint/journeys/handle-claim-created-in-claimed.ts:14  a starting world where handle.claim can run
  blueprint/journeys/handle-claim-created-in-claimed.ts:18  handle.claim's payload: name
  blueprint/journeys/handle-claim-created-in-claimed.ts:19  HandleClaimed's fields: handle, name
  blueprint/journeys/handle-claim-created-in-claimed.ts:20  the handle's id
```

## An author fills them in

A second agent, the author, fills the blanks and writes the stories the stubs could not guess. It is a different
agent from the one that will build, and that is the point: a builder who also writes the stories writes down what its
code does, not what you meant. A builder adds nothing here, and never edits a journey.

## The first run is red on purpose

Then the author has to show something odd: that its journeys can fail. It runs every one of them on handlers that do
nothing.

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

Seven journeys, fifty-six steps, fifty of them red. That is the result you want, because a check that cannot fail
proves nothing. And every red line says what it expected.

```sh capture=prove-empty-one.txt
$ ortho prove --empty --only "claim a handle"
journey claim a handle ✘ 0/8 steps
  ✘ "an unclaimed name has no public page": BlankReached: refuse ProfileNotFound when?; expected refused with ProfileNotFound, failed with 500
```

Six steps are green already, and they are marked.

```sh part capture=prove-empty.txt
  ✔ "bob cannot move aaron's link, and the handler never runs": proved by the description
```

The blueprint already says who may call, so the runtime turns a stranger away before any handler runs. Nobody has to
build those.

## What you read

Before a single handler exists, you hold two things. You hold the stories, which you read as sentences from top to
bottom and agreed. And you hold a red run, which shows they bite. This is the cheapest moment in the whole life of the
system to change your mind.

## When it goes wrong

A journey that is green on the empty run, and is not marked as proved by the description, cannot fail. It proves
nothing, and it goes back to the author.

A stub is sometimes left as it was written. The check keeps listing its blanks, and `ortho model` shows the file as
unfinished, until someone answers them.

Stories tend to cover the path where everything works. Count the refusals: every one the blueprint declares needs a
step that causes it. The full run counts them for you, on its coverage line, in the next chapter.

The journey commands are rough in four places today, and they are being fixed. A refusal that a rule gives, such as a
name already taken, gets no stub, so the author writes that story unprompted. The check lists blanks only inside the
blueprint's folder; Plugged In keeps its finished journeys in a folder of their own beside it, and both are read.
Adding stubs turns the check red, which is right while they are blanks, and it also reports drift in what was
generated until that is made again. And adding one journey by name writes a stub with a blank cast, and every command that reads the
model then stops with an error, where it should ask a question, until the cast is filled in.

```sh capture=stub-one-check.txt
$ ortho check
exit 1
```

## How this stands

Every command here runs today, and everything printed was recorded on Plugged In on 26 November 2026. That a different
agent writes the stories is how we work in this repository. No command starts an agent in a role, and nothing in a new
app stops a builder editing a journey: you keep the split by how you hand out the work.
