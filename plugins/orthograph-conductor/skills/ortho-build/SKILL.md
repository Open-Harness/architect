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
   it over exactly as printed. Anything you add in your own words is something the builder can misread. A brief has
   five parts, in this order (shortened here):

   ```sh
   $ ortho brief handle.claim
   brief handle.claim

   Write   src/handle/claim.ts, and nothing else.

   Read
     blueprint/things/handle/verbs/claim.ts  the declaration: payload, answer, move, steps, errors
     generated/api/src/handle/claim.handler.ts  what the handler is given and may return
     ...
   Do
     run step handle.claim.record (database) through steps.record(...)
     make the move with move(): claim, emitting HandleClaimed
     never refuse HandleTaken or HandleAlreadyOwned or NotAllowed yourself: the runtime does, before the handler runs
     ...
   Don't touch
     blueprint/**
     journeys/**
     generated/**
     ...
   Done when
     ortho prove --env local passes, with handle.claim's 9 evals: answer shape, declared errors, machine path, events, who may call, steps, performance, coverage, explainability
     and the journeys that call it: journeys/a-name-is-claimed-once.ts, journeys/claim-a-handle.ts, ...
     (to run one of them alone: ortho prove --only journeys/a-name-is-claimed-once.ts)
     ortho check passes
   ```

   Its "Write" line is the worker's "may touch". Its "Done when" is the stage's done; a builder working beside
   unbuilt siblings has its own done, below.
3. **Make one integration branch for the build** (for example `build/<goal>`), from the main branch. Every builder's
   branch starts from it and is merged back into it; the whole proof is judged there, and the integration branch
   lands as one pull request (or as a stack, one builder's pull request on the next, when the owner wants each
   reviewed alone; then only the top of the stack, which holds every builder's work, is held to the whole proof). A builder's pull request never goes straight against the main branch: alone, it cannot pass a
   whole proof while its siblings are blank.
4. **Start the builders together**, one worker per brief, each in its own checkout (`CONTRACT.md` in the conductor
   skill: in Claude Code a subagent with worktree isolation; elsewhere a separate worktree, `git worktree add`), on its
   own branch from the integration branch: role builder; skill `ortho-build`; task, the brief as printed. Briefs write
   different files, so their branches never conflict. Log each `worker.started`.
5. **When a builder returns, check it yourself, in its checkout.** List what it changed against the base it started
   from (`git diff --stat build/<goal>...HEAD`): anything beyond its one handler is sent back. Re-run its operation's
   journeys (`ortho prove --only <journey file>`, each named in its brief). Log `worker.returned` with what you ran and
   saw, then merge its branch into the integration branch.
6. **Judge the whole build on the integration branch**, once every builder's work is merged: `ortho prove`, run whole,
   then `ortho check`. A failure there goes back to the builder whose handler it names, with a new worker id. When both
   pass, log the checks and `stage.done`. Say to the owner, in a sentence, what is now true: every story passes, run
   whole, and nobody changed a story to get there.

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

   Finish with `ortho prove`, run whole, and then `ortho check`. The whole run judges nine evals per operation, and a
   journey can pass while one of them fails (performance against the budget, say).
6. **Your done, beside unbuilt siblings.** Other builders are working at the same time, so the whole run can still fail
   in their handlers (`BlankReached` in a file that is not yours). You are done when: every journey your brief names
   passes, or fails only in a handler that is not yours; nothing in the whole run fails in your file; your operation's
   evals that the run reaches pass; and `ortho check` shows nothing wrong in your file. Hand back `done` if the whole
   run is green, otherwise `partial`, listing each failure left and the handler it is in. The conductor judges the
   whole proof once every builder's work is in.
7. Hand back in the contract's shape, with the runs' last lines as evidence and the one file in `touched`.

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
