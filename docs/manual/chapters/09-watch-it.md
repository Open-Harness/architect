# Watch it

Film: `docs/explainer/films/watch/`

Plugged In is running somewhere, and people are calling it. Nobody is running journeys against those calls. So the
question changes: is it healthy, and what changed this week? You want that answer on one screen, and you still do not
want to read the code.

## The budget is already written down

We want "fast enough" to be a number you agreed to, not a feeling. It already is. Every operation in the blueprint
carries a [budget](../../canon/operations.mdx), and the page a visitor reads has one too.

```ts file=examples/plugged-in/blueprint/things/profile/verbs/get.ts lines=19-20
  steps: { load: Blueprint.step.database({ writes: [] }) },
  budget: { p95: "150 millis" },
```

The proof has been holding the app to that number since chapter 5. A full run prints one such line for each
operation.

```sh part capture=watch-prove.txt
profile.get performance ✔ p50 20ms p95 30ms budget p95 150ms
```

Those are the journeys' own calls. They say the app can be fast enough. They say nothing about this week.

## Watch judges what an environment recorded

One command reads the calls an environment recorded and judges them. Before the environment has run, it has nothing
to read, and it says so.

```sh capture=watch-nothing.txt
$ ortho watch --env test
watch couldn't run: test has recorded no telemetry (.ortho/environments/test/telemetry is not there): `ortho env up test`, send it some traffic, then watch
exit 2
```

So we start the test environment on this machine, which stays up until we stop it and keeps what it records.

```sh capture=watch-up.txt
$ ortho env up test --port 4629
test up http://127.0.0.1:4629
```

Then we use it, as in chapter 7. We claim a name, ask for a second and are refused, and read the public page three
times. Now there is something to watch.

```sh capture=watch-healthy.txt
$ ortho watch --env test
watch test  last 1h  from files .ortho/environments/test/telemetry
handle.claim p95 50ms (budget 150ms) ✔
profile.get p95 22ms (budget 150ms) ✔
calls: handle.claim 2  profile.get 3
refusals: HandleAlreadyOwned 1 (HN-002)
defects: none
evals: answer shape ✔  declared errors ✔  steps ✔  explainability ✔ …
drift none
```

Read it from the top. Each operation that was called has its own line, measured against its own budget. Then the
calls are counted, and the refusals by name and code. One refusal is not a problem, because a refusal is the app
saying no on purpose. Defects are the app breaking, and there are none. The evals line is the proof again, on real
calls. Speed is the lines above it. Four more evals can be judged from what a call leaves behind, and the line ends by
naming the four that only the proof can judge. The window is the last hour unless you ask for another with `--since`.

## The same calls, over a budget

Nothing on our machine was slow. To see what slow looks like, we tightened one budget in the blueprint, from 150
milliseconds to 10, read the page twenty-five more times, and watched again.

```sh capture=watch-drift.txt
$ ortho watch --env test
profile.get p95 22ms (budget 10ms) ✘
calls: handle.claim 2  profile.get 28
task .ortho/tasks/drift-test-profile.get.md
drift profile.get
```

The operation is marked, and named again on the drift line. And watch wrote a file: a task, ready to hand to a
builder.

```md capture=watch-task.md.txt
# .ortho/tasks/drift-test-profile.get.md
# profile.get is over its budget in test
- p95 22ms against a budget of 10ms (p50 16ms, over 28 calls in the window).
- The slowest calls, to read as a tree: `ortho telemetry trace 5e49b6d870591f22e4e030a0bb73c8b9 --env test`, …
- What it must do, and what it must not touch: `ortho brief profile.get`. Its handler is `src/profile/get.ts`.
- The budget is the operation's `budget` in its declaration. Make the handler faster; loosening the budget is a decision that makes the operation's verdicts stale.
```

Everything the earlier chapters taught is on that page. The slowest calls are named by their
[trace](../../canon/traces.mdx), so the builder reads one before it guesses.

```sh capture=watch-slowest.txt
$ ortho telemetry trace 5e49b6d870591f22e4e030a0bb73c8b9 --env test
profile.get  25 ms
  profile.get.load  15 ms  step database
```

In that trace the load step ran three times, and one of them took most of the time. The work is asked for with a brief, as in chapter 5. And the last line is for you: making the handler faster is a
builder's job, and loosening the budget is your decision. We put the budget back, and the same twenty-eight calls
were healthy again.

```sh capture=watch-back.txt
$ ortho watch --env test
profile.get p95 22ms (budget 150ms) ✔
drift none
```

## What you read

One screen. You read the mark beside each operation and the drift line. Then you read the counts, because they are
where a week shows: an operation nobody calls, or a refusal that was rare and is now most of the traffic. Watch does
not judge a count. It prints it, and you decide what it means.

## When it goes wrong

Calls made to the app under `ortho dev` are not watched. We made three before the recording above, and watch counted
none of them. It read the proof's own folder and left the proof's calls out, as it should.

```sh capture=watch-local.txt
$ ortho watch --env local
watch local  last 1h  from files .ortho/prove-telemetry  (68 traces from prove runs left out)
no calls in the window
```

On a checkout where the proof had never run, the same command could not run at all when we tried it by hand, and it
told us to start an environment called local. That advice is wrong.

```sh capture=watch-local-up.txt
$ ortho env up local
"local" is not kept running: it is what `ortho dev` and `ortho prove --env local` start
exit 2
```

An environment runs a revision that was committed. With one stray file in the folder, ours would not start.

```sh capture=watch-up-uncommitted.txt
$ ortho env up test --port 4629
refused: the working tree differs from 7e760974: commit or stash what changed before building a deployable bundle
exit 2
```

A few calls are not a pattern. With the tight budget and only three reads, watch said the operation was over and
would not call it drift. It needs twenty calls. The operation's own line still carried a tick, so read the thin line.

```sh part capture=watch-thin.txt
thin: profile.get p95 22ms is over its budget of 10ms but 3 calls are too few to call drift (20 needed)
drift none
```

And watch judges against the blueprint in your folder, not the one the environment is running. That is how we moved
a budget without restarting anything. It also means an uncommitted edit changes the verdict.

## How this stands

Everything above was recorded on 26 November 2026 on Plugged In, in the test environment on one machine. That is not
a real address, and the traffic was ours: two claims and twenty-eight reads. The drift was staged. Nothing was slow,
so we tightened a budget in the blueprint for the length of the recording and put it back. We read in watch's own
notes (`packages/cli/src/modules/watch/README.md`) that an eval failing on real calls fails the watch, and that
`--source axiom` reads a hosted store. We recorded neither: no eval failed on our calls, and Axiom was not available
to us.

Two things are missing. Watch prints one window and compares it with nothing, so "what changed this week" is you
reading this week's screen beside last week's. And nothing runs it for you: no schedule, and no message when an
operation drifts. Someone has to ask.
