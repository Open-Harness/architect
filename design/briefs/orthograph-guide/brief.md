# The Orthograph guide: a router plugin that drives a project to done

Renamed on 27 November 2026, on Aaron's word: the guide is now the conductor and its workers, `plugins/orthograph-conductor/`.

Brief for a 📐 designer thread, then a 🔨 builder. Written 26 November 2026 by the thread that wrote the manual
(`docs/manual`), from Aaron's words in that thread. Read `AGENTS.md` first.

## What Aaron asked for, in his words

"a special kind of statefull plugin. essentially its a router skill that understands orthograph. it understands what
the user wants. takes them through stages of whats missing keeps a log ect. it has special skills it uses for running
other threads. every harness has this claude projects type thing now."

"the router is essentially a router of different skills. it has different skills for differertnt parts of the
orthograph pipeline. it also keeps state between turns and guides the user towards completing the proect. it should
feel like the agent is driving not the user is prompting and pushing the conversation forward. it should not assume the
user knows what the process is. it shoiuld keep clear definition of done and a roadmap and remind the user and guide
through the priocess"

He confirmed this reading ("thats it"):

1. **One router skill** the user always talks to. Behind it, one skill per stage of the pipeline. The router decides
   which the moment needs and hands over.
2. **The agent drives.** The user does not have to know the process. Each turn the agent says where they are, what
   comes next and why, and asks for one thing at a time.
3. **State between turns**, in a file in the project: the roadmap, the current stage, what is decided, what is open,
   and a log. Every turn starts by reading it.
4. **A clear definition of done** for each stage, which the agent can check, and one for the project. The agent shows
   the roadmap, ticks off what is done with its evidence, and reminds the user what is left.
5. **It runs other threads.** Some stages hand work to another agent in a role (author, builder, reviewer, spike). The
   router briefs that thread, reads back its result, and records it.

Then, on how it works (his words):

"how it does this is important. it creates other threads with tasks and invokes the skills. so they are essentially
subagents. even if they are threads they use these skills so they should encode the protocol for how to work together
with clear contracts and expected outcomes"

"this is the main agents goal. it uses the threads to do that. it plans and has an understnding of its workflow. it knows
where it is and nhow to get to the next thing. it gets around blockers within its permissions repanning to get to where
it needs to get to"

So:

6. **The router hands over by starting threads.** For a stage's work it starts another thread (a subagent, or a
   thread in the harness), gives it a task, and that thread invokes the stage's skill. Every stage skill therefore
   encodes the protocol for working together: a contract for what the thread is given (its inputs, the one thing it
   may touch), what it must hand back (its outputs, in a fixed shape the router can read), and its expected outcome
   (the check that says it is done). A thread that cannot meet its contract says so in that same shape.
7. **The main agent owns the goal: the project done.** It plans, and keeps the plan as a workflow it understands: it
   knows which stage it is in, what the next thing is, and how to reach it. When it meets a blocker, it gets round it
   within its permissions and replans to reach the same goal, and only comes back to the person for what it truly cannot
   decide or do (the same line `AGENTS.md` draws for this repository's own threads, "Who decides").

## What already exists to build on

- **The stages and their order**: `docs/manual/spine.json` and the eleven chapters in `docs/manual/chapters/`. Each
  chapter is one stage: what you do, what your agent does, what you read, what goes wrong, and how it stands today.
  The router is this manual turned into a procedure. Each chapter's commands are real and recorded in
  `docs/manual/captures/`.
- **The roles and their limits**: `docs/manual/kit/` (an `AGENTS.md` for an app, a skill per role) and
  `docs/manual/kit/roles.json`, the one place a role's limits are written. `docs/manual/check.mjs` holds them in step.
- **What can be checked for done, today**: `ortho check` (blanks left, drift, types, rules), `ortho prove --empty`
  (journeys red on purpose), `ortho prove` (the full verdict), `ortho impact` (what went stale), `ortho brief`,
  `ortho watch`, `ortho env status`. `docs/manual/captures/cli.json` is the command line's own tree.
- **This repository's own threads and skills** (`.agents/skills/threads`, `conductor`, `kanban`, `design-board`) are
  how we already run many agents on Orthograph itself: a router for *this* repository. The guide is the same idea for an
  app built with Orthograph.

## The state (decided with Aaron, 26 November 2026; built 27 November)

"the state must allow for loops of spikes and working but i agree i dont want to hold this up make it and show me"

Aaron renamed the guide on 27 November ("its more of a conductor and workers"): the main agent is the conductor, the
agents it starts are workers, and the plugin is `plugins/orthograph-conductor/`. What follows is what it ships; its own
`skills/conductor/STATE.md` is the full schema.

Stored in the app's own repository, in `.orthograph/conductor/`, committed, so it works in every harness and moves with
the project. Three files:

- `log.jsonl`: one event per line, append-only, never rewritten. The script adds `n` (its number) and `at` to each, and
  replaces any the caller passes. Types: `goal.set`, `stage.entered`, `stage.done`, `stage.reopened` (with `from` and
  `because`), `decision` (`q`, `a`, `by`), `open` (a question, who it waits on, what it blocks), `closed`,
  `worker.started` (`worker`, role, stage, task), `worker.returned` (the hand-back, below), `check.ran` (`cmd`,
  `printed`, `pass`), `blocker`, `replan` (`plan`, and `clears`, the blockers it gets round), `note`. Each type's fields
  are checked before an event is written, and writes take a lock, so a scheduled wake and a live session cannot both
  take one number.
- `state.json`: the snapshot, folded from the log, so the agent reads where it is in one look: `goal` in the owner's
  words, the project's `done_when`, the `stage` and `visit` it is in, the `roadmap`, `decided`, `open`, `workers`,
  `blockers`, `plan`, and `next` (what it does next, and why).
- `ROADMAP.md`: made from the state, for the person: the roadmap with ticks, the loops so far, what is next, and what is
  waiting on them.

**Loops are first-class.** Work is not a line. A spike can send the plan back for another pass; a review finding sends
a change back to the builder; a red journey sends the author or the builder back. So the roadmap is the stages in their
usual order, and each stage holds its `visits`: every time it is entered there is a new visit with why it was entered
(`first`, or the event that reopened it), its checks, its workers, and how it ended. `stage.reopened` is how a loop is
recorded, and the conductor replans after it. The script records checks; it does not refuse a `stage.done` whose
checks did not pass. The conductor's skill holds that rule: done is checked, not claimed.

**One writer.** Only the conductor writes the state. A worker never touches it: it hands back one result in a fixed
shape, which the conductor checks against the stage's done checks and then logs:
`{ "worker", "role", "stage", "outcome": "done" | "blocked" | "partial", "did": [], "evidence": [{ "cmd", "printed" }],
"touched": [paths], "open": [questions], "suggest": "what it would do next" }`.

**Done is checked, not claimed.** Each stage's `done_when` is a list of checks, each a real command where one exists
(`ortho check` with no blanks left, `ortho prove --empty` red with only steps proved by the description green, the full
`ortho prove` green, `ortho impact` showing nothing stale), or a named reader's yes (the owner agreed the plan page). The
evidence is what the command printed, kept in the log.

**Proactive, in parallel, landed.** `due` says whether there is work the conductor can do without the owner; the
conductor schedules its own wake with the scheduler of the harness it runs in (Aaron, 27 November: no script outside
the harness). It starts independent workers together, lands their work as small pull requests (stacked where they
depend on each other, through a merge train when CI is slow), and sweeps for staleness every turn.

## The decisions to make first, with Aaron (batch them, `threads` skill, "Talking to Aaron")

1. **Where state lives.** Decided, above.
2. **Which harnesses first.** Claude Code (a plugin: skills, a hook that loads the state at the start of every turn,
   subagents or cloud sessions for threads) and Amp. Check what Amp offers for project state and for starting threads
   today; do not assume it.
3. **How threads are run** in each harness, and what the router does when a harness cannot start one (it writes the
   brief for the person to hand over).
4. **The parked agent kit.** `design/milestones.md` parks the kit (M3.12) until after 1.0. Aaron said to make the guide
   now ("make it and show me", 26 November 2026): tell the conductor (Goal 18) so the board shows it, and do not edit
   `design/milestones.md` yourself.

## Done when

A person with a new, empty Orthograph app, who has never read the manual, says one sentence about what they want, and
the guide takes them, one stage at a time, to a planned, described, proved and reviewed first operation, with the
state file showing every stage done and its evidence. Shown on a real run, recorded the way the manual records, with
nobody typing a command the guide did not ask for.
