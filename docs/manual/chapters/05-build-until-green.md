# 5 · Build until green

Film: `docs/explainer/films/build-green/` · App: `examples/plugged-in`

**How it stands.** Every command here runs today, and every line of output was recorded by `docs/manual/capture.sh`.
The climb on this page is a replay: the script puts one handler at three points and records the real run at each. No
agent was filmed writing it. That a builder may touch one handler and nothing else is this repository's practice.

## What you do

You hand over one brief at a time, as it is printed. You do not explain the task again in your own words: anything you
add is something the builder can misread.

```sh capture=brief.txt
$ ortho brief handle.claim
brief handle.claim
Write   src/handle/claim.ts, and nothing else.
Don't touch
  blueprint/**
  journeys/**
  generated/**
Done when
  ortho check passes
```

## What your agent does

The builder writes the one [handler](../../canon/handlers.mdx) the brief names, runs the journey, reads the first
failure, fixes it, and runs it again. On Plugged In's `handle.claim` the climb has three rungs.

**Rung 0: the scaffold.** Four of eight steps pass before a line is written: they are the steps that never needed
this handler. The first failure names the blank the handler reached, and the file it is in.

```sh capture=climb-0-prove.txt
$ ortho prove --only "claim a handle"
journey claim a handle ✘ 4/8 steps
  ✘ "aaron claims the free name": the server died: BlankReached: record: the work this step does
  ✘ "aaron claims the free name": handler src/handle/claim.ts, declared in blueprint/things/handle/verbs/claim.ts (handle.claim)
```

**Rung 1: the records are written, and the move is forgotten.** The count does not change. The reasons do.

```sh capture=climb-1-prove.txt
$ ortho prove --only "claim a handle"
journey claim a handle ✘ 4/8 steps
  ✘ "aaron claims the free name": expected HandleClaimed, journal has nothing
  ✘ "aaron claims the free name": hdl_rec9a826nfjzxocb is in no state, expected "claimed"
handle.claim machine path ✘ claim-a-handle "aaron claims the free name": answered without making its move claim
```

**Rung 2: the move is made.** The journey is green.

```sh capture=climb-2-prove.txt
$ ortho prove --only "claim a handle"
journey claim a handle ✔ 8/8 steps
prove ✘ 5 failing
```

The last line is still red, and it is right to be: one journey does not reach every operation, so coverage fails.
The builder finishes with the whole proof and the check.

```sh capture=prove.txt
$ ortho prove
journey claim a handle ✔ 8/8 steps
handle.claim 9 evals ✔ …
prove ✔
```

```sh capture=check.txt
$ ortho check
check ✔
```

## What you read

- **Which journeys are green, and how many steps of each.** That line is the report. You never open the handler.
- **The reasons, when the count is stuck.** Between rung 0 and rung 1 the number stayed at four of eight, and the
  builder was still moving: "the server died" became "answered without making its move".
- **The nine evals for the operation**, on the full run: answer shape, declared errors, machine path, events, who may
  call, steps, performance, coverage and explainability. A journey can pass while an eval fails.
- **The last line of the full run.** `prove ✔` on `ortho prove`, with no flags, is the only thing that means done.

## What goes wrong

- **The builder reports green from `--only`.** One journey passed. Ask for the full run.
- **A step fails in another handler.** At rung 0 the journey also failed in `src/handle/resolve.ts` and
  `src/profile/get.ts`, because nothing had been claimed yet. The builder fixes its own handler first and runs again.
  It does not touch the others.
- **The builder says a journey is wrong.** It stops and tells the author. It does not edit the journey and it does not
  work round it. You decide who is right by reading the story.
- **The handler grows a rule.** The brief says never to refuse `HandleTaken` yourself. If a handler checks something
  the blueprint does not say, that is a finding for the [reviewer](../working-with-your-agents.md).
- **Green, and the app is still wrong.** Then the journeys do not say what you meant. Go back to chapter 4.
