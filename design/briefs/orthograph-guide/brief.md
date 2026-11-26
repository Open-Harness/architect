# The Orthograph guide: a router plugin that drives a project to done

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

## The decisions to make first, with Aaron (batch them, `threads` skill, "Talking to Aaron")

1. **Where state lives.** A file in the app (for example `.orthograph/guide.json` with a readable `GUIDE.md` beside it),
   so it moves with the repository and works in every harness; the harness's own project memory as a cache at most.
2. **Which harnesses first.** Claude Code (a plugin: skills, a hook that loads the state at the start of every turn,
   subagents or cloud sessions for threads) and Amp. Check what Amp offers for project state and for starting threads
   today; do not assume it.
3. **How threads are run** in each harness, and what the router does when a harness cannot start one (it writes the
   brief for the person to hand over).
4. **Whether this is the parked agent kit.** `design/milestones.md` parks the kit (M3.12) until after 1.0. Building
   the guide un-parks it. That is Aaron's call, and the conductor's board must show it.

## Done when

A person with a new, empty Orthograph app, who has never read the manual, says one sentence about what they want, and
the guide takes them, one stage at a time, to a planned, described, proved and reviewed first operation, with the
state file showing every stage done and its evidence. Shown on a real run, recorded the way the manual records, with
nobody typing a command the guide did not ask for.
