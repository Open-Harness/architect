# Working with your agents

You decide the system. Agents build it. This page is how that works without you reading the code: who does what, what
you hand each of them, and how you know the work is right.

**How it stands.** The commands on this page run today. The roles are how this repository builds Orthograph itself, every
day. Orthograph does not yet hand them to a new app: you copy [the agent kit](kit/README.md) in.

## The idea

An agent can write a handler in minutes. What it cannot give you is a reason to trust it. So trust is never asked for.
It is arranged, by three things:

1. **You read the description, not the code.** What the system is lives in the [blueprint](../canon/blueprint.mdx).
   Nothing important may live only in a handler.
2. **Done is said before the work starts, by someone else.** A [journey](../canon/orthograph.mdx) is a story through real
   operations. One agent writes the journeys. A different agent builds until they pass. The builder cannot change them.
3. **Every role has one thing it may touch.** An agent that may only write one handler cannot quietly change what the
   system is.

## The roles

| Role | May touch | Is given | Is checked by |
|---|---|---|---|
| designer | the plan, the blueprint and the journey stubs | the problem, in the owner's words | the owner reads the blueprint, and every blank `ortho check` lists is a question the owner has seen |
| author | journeys and their starting worlds, and nothing else | the blueprint, and one operation or one finding | each journey step fails on empty handlers or is marked proved by the description, and each failure names what was expected |
| builder | the one handler its brief names | one brief, from `ortho brief` | `ortho prove` and `ortho check` pass, each run whole, with no flags |
| reviewer | nothing: it reads | the change and the brief it was made from | it wrote none of what it reviews |
| spike | throwaway code under `spikes/` | one question | one page with the answer and what was tried |

One agent takes one role at a time. The same model can be the author in one session and the builder in another. What
matters is that the builder of a handler never wrote, and cannot edit, the journeys that judge it.

## What you do, and what you read

| When | You | You read |
|---|---|---|
| Something new is wanted | say the idea to a **designer**, in one sentence | one page: the things, who may do what, what must stay true, what waits, and its doubts |
| The page is agreed | ask the **designer** to describe it | the blueprint it changed, the journey stubs it added, and the blanks `ortho check` lists as questions |
| You are unsure it can work | give a **spike** one question | one page: the answer, and what is still at risk |
| The description is agreed | ask an **author** to fill the journey stubs the designer left | the journeys, as stories, and a first run that is red on purpose |
| The journeys are agreed | hand a **builder** one brief at a time | which journeys are green, and what is still red |
| A change is ready | give it to a **reviewer** that wrote none of it | its findings, and what `ortho impact` says went stale since the last full proof on that machine |

You never have to read a handler to do any of this. If you find you must, something is in the code that belongs in the
blueprint, and that is the finding.

## The brief

`ortho brief <thing>.<verb>` prints everything a builder needs for one handler, and nothing else: the one file to write,
the files to read, what the handler must do, what the runtime already does for it, the paths it must not touch, and what
must pass. Hand it over as it is. A builder given only its brief has no room to wander.

## The climb

Building is climbing. The builder runs the journeys, reads the first failure, fixes the handler, and runs them again.
`ortho prove --only "<journey's name>"` runs one journey, by the name it declares or by its file. `ortho prove` runs them
all, and only that run means done: a run of one journey does not judge coverage, and says so on the line before its
verdict. `ortho prove --empty` runs them on empty handlers, which is how an author shows a journey can fail. You
watch one number go down: the steps that are still red.

## When it goes wrong

- **A builder says a journey is wrong.** It stops and tells the author. It does not edit the journey, and it does not
  work round it. You decide which of them is right, by reading the journey.
- **Everything is green and the app is still wrong.** The journeys do not say what you meant. That is the author's work,
  and the fix starts with a new journey that fails.
- **A handler grew a rule.** If behaviour depends on a decision you never saw, it belongs in the blueprint as a rule, a
  role or a state. A reviewer looks for exactly this.
- **An agent reports success you cannot see.** Ask which journeys ran. "It passes" with no run is not a report.

## What Orthograph does not do for you yet

- It does not put the kit into a new app.
- The journey commands are rough, and are being fixed (26 November 2026). `ortho check` lists a blank only under
  `blueprint/`, and `ortho add journey <name>` writes a stub that stops the commands that read the model. The add commands write journeys to
  `blueprint/journeys/`, and Plugged In keeps its own in `journeys/`; both are read.
- It has no command that starts an agent in a role, or that stops a builder editing a journey. This repository enforces
  that for itself in its own CI; an app has to keep the rule by how it hands out work.
- It has no board of work that many agents build from. That is designed, and not built.
