---
name: ortho-build
description: The conductor's build stage for an Orthograph app. Turns agreed, red journeys green by handing one builder worker one brief per operation, in parallel where the operations are independent, and checking each against the whole proof. Use it when the conductor's state says the stage is build, or when a worker was started as a builder.
---

# Build until green

The journeys are agreed and every one of them is red. Now workers write the code that turns them green, and the owner
has to believe the result without reading that code.

**Who does it:** one builder worker per operation (touches the one handler its brief names; is given one brief, from
`ortho brief`; is checked by `ortho prove` and `ortho check` passing, each run whole, with no flags). You, the
conductor, hand out the briefs, run the builders in parallel where you can, and run the whole proof yourself. The
builder is never the worker that wrote the journeys.

**Done when:** every operation in the blueprint has a handler; `ortho prove` passes, run whole, with every operation's
evals and the coverage line green; `ortho check` passes; and no journey, blueprint file or generated file was changed
by a builder.

## For the conductor

1. **Make sure every handler has its scaffold.** `ortho generate` writes one for each operation that has none, and
   leaves the ones that exist:

   ```sh
   $ ortho generate
   created src/handle/claim.ts (scaffold: yours from now on)
   ```

2. **Get one brief per operation.** Never write a builder's task yourself; ask for it by the operation's name and hand
   it over exactly as printed. Anything you add in your own words is something the builder can misread.

   ```sh
   $ ortho brief handle.claim
   brief handle.claim
   Write   src/handle/claim.ts, and nothing else.
   Don't touch
     blueprint/**
     blueprint/journeys/**
     blueprint/starting-worlds/**
     journeys/**
     generated/**
     test/**
   Done when
     ortho prove --env local passes, with handle.claim's 9 evals: answer shape, declared errors, machine path, events, who may call, steps, performance, coverage, explainability
     and the journeys that call it: journeys/claim-a-handle.ts, journeys/release-a-handle.ts, ...
     ortho check passes
   ```

   The brief goes on to say what to read and what the handler must do. Its "Write" line is the worker's "may touch";
   its "Done when" is the worker's "done when".
3. **Start the builders together**, one worker per brief (`CONTRACT.md` in the conductor skill): role builder; skill
   `ortho-build`; task, the brief as printed. Briefs write different files, so they never collide. Order matters only
   for which journey goes green first: an operation whose journeys start from another's result (a release needs a
   claim) shows failures in the other handler until that one is built, and that is expected. Log each
   `worker.started`.
4. **When a builder returns, check it yourself.** Re-run `ortho prove` whole and `ortho check`; a builder's word, or a
   green `--only` run, is not done. Then list the files it touched (`git status`, `git diff --stat`): anything beyond
   its one handler is sent back. Log `worker.returned` with what you ran and saw.
5. **When the whole run is green**, log the checks and `stage.done`. Say to the owner, in a sentence, what is now true:
   every story passes, run whole, and nobody changed a story to get there.

## For the worker (the builder)

You have one brief. Write only the file it names. Never edit a journey, the blueprint or anything generated.

1. **Run your journey first, and read what fails.** Name it as the journey declares it, or by its file:

   ```sh
   $ ortho prove --only "claim a handle"
   journey claim a handle ✘ 4/8 steps
     ✘ "aaron claims the free name": the server died: BlankReached: record: the work this step does
     ✘ "aaron claims the free name": handler src/handle/claim.ts, declared in blueprint/things/handle/verbs/claim.ts (handle.claim)
   ```

   Steps that never needed your handler already pass. The failure names the blank your handler reached and the file it
   is in.
2. **Read the scaffold's header.** It says who may call, the payload, the answer, the refusals, the budget, the
   machine with this call marked, and **what the runtime does, so the handler doesn't**: it refuses callers who may
   not call, refuses what a rule forbids, mints the new id, sets the state and writes the event once you answer. Do not
   do any of those yourself. A refusal the header marks "the runtime's" is never checked in the handler.
3. **Fill the blanks.** The scaffold has a `Handlers.blank("...")` wherever behaviour goes, and the moves already
   called. Write the work inside the steps it names, for example:

   ```ts
   const claim: Handler = ({ name }, { principal, steps, move, id }) =>
     Effect.gen(function* () {
       const who = acting(principal);
       if (!who) return yield* Effect.die(new Error("reached without a signed-in person"));
       const records = yield* Records;
       const profile = yield* Ids.of(Profile.fields.id);
       yield* steps.record(
         Effect.gen(function* () {
           yield* records.insert(Handle, { id, name, owner: who.person as never });
           yield* records.insert(Profile, { id: profile, handle: id, links: [] });
         }),
       );
       yield* move();
       return { handle: id };
     });
   ```

   Everything is Effect: no `async`, `await`, `try`, `throw`, `Date.now` or timers in a handler.
4. **Climb.** Run the journey again after each change. The count will not always move, but what fails first will:
   from "the server died" to "expected HandleClaimed, journal has nothing" to "answered without making its move" to
   green. Read the reasons, not only the count.
5. **Green on one journey is not done.** A green `--only` run says so itself:

   ```sh
   journey claim a handle ✔ 8/8 steps
   ran 1 of 7 journeys (--only): coverage is judged by the whole run, ortho prove; 5 operations above not reached in full by this one
   prove ✔
   ```

   Finish with `ortho prove`, run whole, and then `ortho check`. Both must pass. The whole run judges nine evals per
   operation, and a journey can pass while one of them fails (performance against the budget, say).
6. Hand back in the contract's shape, with the whole runs' last lines as evidence and the one file in `touched`.

## When it goes wrong

- **The builder thinks a journey is wrong.** It stops and hands back `blocked`, naming the step and why. It never edits
  the story or works round it. The conductor takes it to the author, and to the owner if the story itself is in
  doubt; if the description is missing something, the stage reopens (`stage.reopened` for `describe` or `done`).
- **A step fails in another handler.** Fix your own and run again; never touch the other. If the other is not built
  yet, that failure is expected.
- **The handler grows a rule**: it starts checking something the blueprint never said. That rule belongs in the
  blueprint, where the owner can read it. Hand back `partial` with the rule in `open`; the conductor moves it to
  describe and asks the owner.
- **Everything is green and the app is still wrong.** Then the journeys do not say what the owner meant: reopen `done`.
- **A builder touched more than its file.** Revert what is not its handler and send it back with the brief again.
