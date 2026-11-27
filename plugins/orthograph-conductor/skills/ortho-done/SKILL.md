---
name: ortho-done
description: The conductor's stage that says what done means for an Orthograph app. Has journey stubs written while planning, an author worker fill them as stories that fail on purpose, and the owner agree them, before anyone builds. Use it when the conductor's state says the stage is done, or when a worker was started as the author.
---

# Say what done means

An agent can write a handler in minutes, so the question is never whether it can build this; it is how the owner will
know it is right. Say what done means before anyone builds, and have someone other than the builder say it.

**Who does it:** you, the conductor, make the stubs and brief the author. One worker in the author role (touches journeys
and their starting worlds, and nothing else) writes them. The owner reads them as stories. Whoever builds later is a
different worker and never edits a journey.

**Done when:** every thing has its journey stubs, filled in by the author, with no journey blank left (`ortho check`);
`ortho prove --empty` is red, and every green step is marked `proved by the description`; and the owner has read the
journeys as stories and agreed them.

## Done is a story

A journey is a short story with a cast, told through real calls to the real system. Each step is a sentence the owner
can say yes or no to; under it is the call, then what must be true once it returns: the answer, the event, the state
and the spans of the trace.

```ts
s.step(
  "aaron claims the free name",
  s.aaron.run(claim, { name: "firstpage" }),
  expect((a) => a.handle).toMatch(/^hdl_[0-9a-z]+$/),
  emits(HandleClaimed, { handle: s.last.handle, name: "firstpage" }),
  machine.isIn(s.last.handle, "claimed"),
  spans({ present: ["handle.claim", "handle.claim.record", "handle.claim.commit"] }),
),
```

## For the conductor

1. **Make the stubs**, one command per thing. It keeps any journey already written.

   ```sh
   $ ortho add journeys handle
   wrote blueprint/journeys/handle-claim-created-in-claimed.ts
   wrote blueprint/journeys/handle-release-refused-from-released.ts
   wrote blueprint/journeys/handle-claim-refused-anonymous.ts
   wrote blueprint/journeys/handle-claim-refused-handle-taken.ts
   ...
   ```

   There is a stub for each path through the thing's states, each role, each error an operation declares, and each
   refusal a rule gives. A stub already knows who may call and who is turned away; what it cannot know it leaves blank,
   and `ortho check` lists each blank with its file and line (`a starting world where handle.claim can run`,
   `handle.claim's payload: name`). Use `ortho add journeys <thing>`, not `ortho add journey <name>`: the single form
   writes a stub with a blank cast that stops every command that reads the model (`ortho check` prints only `exit 1`)
   until the cast is filled.
2. **Start the author worker** (`CONTRACT.md` in the conductor skill): role author; skill `ortho-done`; task, the things
   and the plan page; may touch `blueprint/journeys/` and their starting worlds only; done when `ortho check` lists no
   journey blank and `ortho prove --empty` fails as it should; hand back the usual shape.
3. **When it returns, re-run `ortho prove --empty` yourself** and log what it printed. It should be red, journey by
   journey:

   ```sh
   $ ortho prove --empty
   journey claim a handle ✘ 0/8 steps
   journey release a handle ✘ 1/13 steps
   ...
   prove ✘ 50 failing
   ```

   Every red line must say what it expected (`--only "<journey>"` shows one journey's steps):

   ```sh
     ✘ "an unclaimed name has no public page": BlankReached: refuse ProfileNotFound when?; expected refused with ProfileNotFound, failed with 500
   ```

   A green step is fine only when it is marked like this, because the runtime turns the caller away before any handler
   runs:

   ```sh
     ✔ "bob cannot move aaron's link, and the handler never runs": proved by the description
   ```

   Any other green step cannot fail and proves nothing: send it back to the author.
4. **Count the refusals.** Stories drift towards the path where everything works. Every refusal the blueprint declares
   needs a step that causes it; send back any that has none.
5. **Read the journeys' step names to the owner as stories**, one journey at a time. A wrong sentence or a missing
   story goes back to the author. If a story shows the description is missing something, log `stage.reopened` for
   `describe`. This is the cheapest moment to change their mind: say so.
6. With the owner's yes, log the checks and `stage.done`.

## For the worker (the author)

Start from the stubs. Read the declarations, never a handler. Fill each blank, and write the stories the stubs could
not guess: the move that works, each refusal, each caller turned away. Each step is a call and what must be true after
it. Run `ortho prove --empty`: every step must fail and name what it expected, except those marked proved by the
description. Never write a handler. Hand back in the contract's shape, with the run's output as evidence.

## Rough edges to expect

`ortho check` lists journey blanks only inside `blueprint/`; journeys kept elsewhere are still run. Adding stubs turns
the check red (right, while they are blanks) and reports drift until `ortho generate` runs again. Nothing in a new app
stops a builder editing a journey: keep the split by how you hand out the work.
