---
name: ortho-validate
description: The conductor's validating stages for an Orthograph app, review and trace. A reviewer worker that wrote none of the change proves it again and reports findings, then the owner runs the app, tries to break it, and every surprise is explained from a trace and a line of the blueprint. Use it when the conductor's state says the stage is review or trace, or when a worker was started as a reviewer.
---

# Validate it: review it, then run it and break it

A green run is a builder's claim until someone with nothing to defend has checked it, and the owner has used the app
and believed it. Validation is two stages, in this order: **review** (a reviewer worker proves the change again and
reads what it touched) and **trace** (the owner runs the app, tries to break it, and every surprise is read from a
trace, never guessed from code).

## Review

**Who does it:** one worker in the reviewer role (touches nothing: it reads; is given the change and the brief it was
made from; is checked by having written none of what it reviews). Never the builder, never the author. Independent
changes can be reviewed by separate reviewers in parallel.

**Done when:** the reviewer has run `ortho impact`, `ortho prove` (whole) and `ortho check` itself and handed back its
findings; every finding marked blocking is fixed (by the builder or the author, as the finding says) and the fix
reviewed again; and nothing is stale.

### For the conductor

1. Start the reviewer (`CONTRACT.md` in the conductor skill): role reviewer; skill `ortho-validate`; task, the change
   (the files or commits) and the brief it was made from (what `ortho brief <operation>` printed, or the owner's words
   for a change to the blueprint); may touch nothing; done when it has handed back findings with evidence.
2. Read its findings. Each names a file and a line, what is wrong, and what would make it right. Send each blocking one
   to whoever owns that file: a handler to its builder, a journey to its author, a rule or a declaration to you and the
   owner (describe reopens). The reviewer fixes nothing itself.
3. When the fixes are back, review again with a fresh reviewer or the same one, then log the checks and `stage.done`.

### For the worker (the reviewer)

Work in this order; the order matters.

1. **Ask what the change unproved, before you prove anything.** A full proof writes a new record, so a reviewer that
   proves first and asks second is told nothing is stale.

   ```sh
   $ ortho impact
   changed operation handle.claim: budget, description
   stale handle.claim
   proven handle.release, handle.resolve, link.add, link.order, link.remove, profile.get
   ```

   The first line names the declaration that changed, and what in it; `stale` names each operation whose proof no
   longer holds. `stale` with no `changed` line means code moved and the blueprint did not: that is the one time you
   read a handler, looking for a decision made in code that belongs in the blueprint. On a fresh checkout there is no
   record to compare with and every operation shows as unproven; say so rather than read it as a finding.
2. **Read the part the owner can read first**: the blueprint's diff (`git diff -- blueprint`). Then list every file the
   change touched (`git diff --stat`) and hold the list against the brief's "Write" and "Don't touch" lines. A builder
   that touched a journey, the blueprint or `generated/` is a blocking finding.
3. **Run the proof yourself, whole**, then the check:

   ```sh
   $ ortho prove
   journey claim a handle ✔ 8/8 steps
   handle.claim performance ✔ p50 18ms p95 33ms budget p95 100ms
   ...
   prove ✔
   $ ortho check
   drift ✔
   check ✔
   ```

   `drift ✔` is what lets everyone skip the generated files: each is exactly what the blueprint makes. If the check
   says `drift ✘` ("differs from what the blueprint generates: never edit generated/, run ortho generate"), the change
   was handed over before generating, or a generated file was edited: report it and send it back. Do not run the
   command to tidy up.
4. **Read the numbers, not only the marks.** The performance eval never fails; a p95 well over the budget still shows
   ✔. Report a p95 over the budget as a finding. Count the coverage line (moves, outcomes, refusals): every refusal the
   blueprint declares should be reached by some journey.
5. **Look for rules in code.** A handler that checks something the blueprint never said has grown a rule: the finding
   is to move it into the blueprint, where the owner can read it.
6. Run `ortho impact` once more: it should answer `stale none`. Hand back in the contract's shape: each finding in
   `did` as "blocking:" or "nit:", with file:line, what is wrong and what would make it right; the commands and their
   last lines in `evidence`; `touched` empty.

## Trace: run it, break it, read the trace

**Who does it:** the owner tries the app; you, the conductor, read the traces. Explaining a surprise is not a worker's
job unless it turns into a fix.

**Done when:** the owner has used the app on their machine for the stories that matter to them, tried at least the
refusals they care about, and every surprise is explained by a trace and a line of the blueprint, and is either
accepted as right or sent back as a finding.

### How

1. **Run the app locally**: `ortho dev` (add `--port <n>` to pick one). It runs with a local world and no cloud account.
   Show the owner how to call it: the generated command line tool, named after the app, has a subcommand per thing
   and operation (`<app> handle claim --name firstpage`), or the screens, if the app has them.
2. **Ask the owner to try it and to try to break it**: the stories in order, then the things that should be refused.
   "I asked for a second name and it said no" is enough for you to act on; they never need to know if it is a bug.
3. **Find the one call.** Every answer carries its trace's id in the `x-trace-id` header. The generated tool prints a
   refusal's code, not its id, so make the same call over HTTP and keep the id:

   ```sh
   HTTP/1.1 422 Unprocessable Entity
   x-trace-id: 6586442f3b59173fa3fa4d9a1e3b62cf
   {"_tag":"HandleAlreadyOwned","code":"HN-002"}
   ```

4. **Print that trace and read it**:

   ```sh
   $ ortho telemetry trace 6586442f3b59173fa3fa4d9a1e3b62cf
   handle.claim  20 ms  refused HandleAlreadyOwned  move claim → claimed
     · handle.oneNamePerPerson: another instance already holds this key
     handle.claim.record  1.0 ms  step database
   ```

   The first line is the operation, how long it took and how it ended. The line under it is the cause, a rule by its
   name in the blueprint. What is missing matters too: here there is no commit, so the rule was checked after the work
   and before anything was saved. An answered call ends with a `<operation>.commit` step.
5. **Take the owner to the line that gave it**: open the rule in `blueprint/` (here `oneNamePerPerson` in the handle's
   invariants) and ask the real question, one at a time: should a person hold only one name? If yes, the app is right
   (perhaps the message needs work: a finding for describe). If no, the rule changes: reopen `describe`, then `done`
   for the journey, then build again.
6. Log each surprise as `open` until it is decided, and its answer as `decision`. When nothing is left open from the
   owner's tries, log the checks and `stage.done`.

### When it goes wrong

- **A refusal is not a defect.** Refused means a declared answer, with a code. A defect is the server failing; it is
  marked ✘ in the trace and goes to the builder of that handler, with the trace id.
- **An explanation that does not name a line of the blueprint** (an agent explaining a refusal from the handler) is a
  guess. Ask for the trace.
- **No trace yet**: traces are written a moment after the call; wait a few seconds and print it again. A trace recorded
  before the app was stopped still prints afterwards.
- **No command signs a test person in to a local app.** If the owner's tries need a signed-in caller, use the local
  world's sign-in the way the journeys do, and say that this is a gap.
