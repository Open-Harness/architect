# Build until green

Film: `docs/explainer/films/build-green/`

The journeys are agreed, and every one of them is red. Now an agent has to write the code that turns them green, and
you have to believe the result without reading that code.

## Hand over one brief

We want the builder to know exactly two things: what it may write, and when it is done. You don't write that task
yourself. You ask for it, by the name of one operation.

```sh capture=brief.txt
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
  and the journeys that call it: journeys/a-name-is-claimed-once.ts, journeys/a-stranger-cannot-edit-a-page.ts, journeys/claim-a-handle.ts, journeys/release-a-handle.ts, journeys/the-story.ts
  ortho check passes
```

The brief also says what to read and what the [handler](../../canon/handlers.mdx) must do, left out here. One line
of it tells the builder never to refuse a taken name itself, because the runtime does that from a rule. Hand it
over as it is printed. Anything you add in your own words is something the builder can misread.

## Start from the scaffold

The builder never starts from an empty file. The framework has already written the frame of the handler, with a blank
where the behaviour goes. So the first thing the builder does is run the one journey, by the name it declares or by its file, and read what
fails.

```sh capture=climb-0-prove.txt
$ ortho prove --only "claim a handle"
journey claim a handle ✘ 4/8 steps
  ✘ "aaron claims the free name": the server died: BlankReached: record: the work this step does
  ✘ "aaron claims the free name": handler src/handle/claim.ts, declared in blueprint/things/handle/verbs/claim.ts (handle.claim)
```

Four of eight steps pass before a line is written. Those are the steps that never needed this handler. One failure
names the blank the handler reached, and the next names the file it is in. That is where the builder goes.

## Same count, a different failure

The builder writes the work: two records, saved together, the handle and its public page. Then it runs the journey
again.

```sh capture=climb-1-prove.txt
$ ortho prove --only "claim a handle"
journey claim a handle ✘ 4/8 steps
  ✘ "aaron claims the free name": expected HandleClaimed, journal has nothing
  ✘ "aaron claims the free name": hdl_y1y7uv6vhtmrfudv is in no state, expected "claimed"
handle.claim machine path ✘ claim-a-handle "aaron claims the free name": answered without making its move claim
```

The number has not moved, and the builder has. Before, the server died. Now it answered without making its move: the
records were saved and the state never changed. Not every rung turns a light green. Every rung changes what fails
first.

## Green on one journey is not done

One line makes the move, and the journey passes, and so does the run.

```sh capture=climb-2-prove.txt
$ ortho prove --only "claim a handle"
journey claim a handle ✔ 8/8 steps
ran 1 of 7 journeys (--only): coverage is judged by the whole run, ortho prove; 5 operations above not reached in full by this one
prove ✔
```

Read the line before the verdict. One journey does not reach every operation, so this run does not judge coverage:
it says so, and points at the whole run. The builder finishes by running all of it, and then the check.

```sh capture=prove.txt
$ ortho prove
journey claim a handle ✔ 8/8 steps
handle.claim 9 evals ✔ …
coverage ✔ moves 4/4 · outcomes 4/4 · refusals 6/6 …
prove ✔
```

The full run judges nine evals for each operation, and a journey can pass while one of them fails. The coverage line
counts the moves, the outcomes and the refusals that some journey reached.

```sh capture=check.txt
$ ortho check
check ✔
```

## What you read

You read none of the handler. You read one line for each journey, and the last line of the full run. When the count
is stuck, you read the reasons, because that is where the movement shows. And you ask for the whole run before you
believe a report: a builder that says "it passes" from one journey has told you less than it thinks.

## When it goes wrong

A builder will sometimes say a journey is wrong. Then it stops, and tells the author. It does not edit the story and
it does not work round it. You decide who is right by reading the story, which is the one thing here written for you.

A step will sometimes fail in a handler the builder was not given. At the first rung the journey also failed in two
other handlers, because nothing had been claimed yet. The builder fixes its own handler and runs again. It does not
touch the others.

A handler will sometimes grow a rule: it starts checking something the blueprint never said. That is a finding for the
reviewer, and the fix is to move the rule into the blueprint, where you can read it.

And sometimes everything is green and the app is still wrong. Then the journeys do not say what you meant, and the
work goes back a chapter.

## How this stands

Everything printed above was recorded on Plugged In. The climb is a replay: we put one handler at three points and
recorded the real run at each, and no agent was filmed writing it. That a builder may touch one handler and nothing
else is how we work in this repository. Nothing in Orthograph enforces it for you yet.
