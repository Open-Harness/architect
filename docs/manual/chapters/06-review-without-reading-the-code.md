# Review without reading the code

Film: `docs/explainer/films/review/`

A change has come back. You asked for two small things about claiming a name: say what it does more plainly, and hold
it to a hundred milliseconds where it had a hundred and fifty. Nine files changed. Is this what you asked for, and
nothing more? You should not have to read nine files to find out.

## Give it to someone who wrote none of it

We want the change judged by an agent with nothing to defend. So the reviewer is a fresh agent that had no part in
the work, and it is given two things: the change, and the brief the change was made from. Here the brief is your two
sentences. Had the change been a handler, the brief would be what `ortho brief` printed in the last chapter, and one
line of it would be the reviewer's first test.

```sh part capture=brief.txt
Write   src/handle/claim.ts, and nothing else.
```

The reviewer touches nothing. It reads, it runs commands, and it reports.

## Start with the part you can read

The reviewer opens the blueprint's part of the change first, because that is the part you will read.

```sh capture=review-diff.txt
$ git diff -U0 --relative -- blueprint
-  description: "Claim a free name and make it the address of your public page, with its profile.",
+  description: "Claim a free name. It becomes the address of your public page.",
-  budget: { p95: "150 millis" },
+  budget: { p95: "100 millis" },
```

Two lines out and two lines in, in one operation's declaration. Those are the two things you asked for. Then it lists
every file the change touched.

```sh capture=review-stat.txt
$ git diff --stat --relative
 blueprint/things/handle/verbs/claim.ts |  4 ++--
 generated/docs/handle/claim.md         |  4 ++--
 9 files changed, 23 insertions(+), 23 deletions(-)
```

One file is the blueprint's and the other eight are under `generated/`. No handler is in the list, and no journey.
Nobody reads the eight. A check, further down, says whether they are exactly what the blueprint makes.

## Ask what the change unproved

We want to know how far the change reaches, and one command says. It needs a machine that ran the whole proof before
the change arrived, because it compares with the record that proof left. Before the change it had nothing to report.

```sh capture=review-impact-before.txt
$ ortho impact
stale none
proven handle.claim, handle.release, handle.resolve, link.add, link.order, link.remove, profile.get
```

With the change in place, it says this.

```sh capture=review-impact.txt
$ ortho impact
changed operation handle.claim: budget, description
stale handle.claim
proven handle.release, handle.resolve, link.add, link.order, link.remove, profile.get
```

The first line names the declaration that changed, and what in it. The second names the one operation whose proof no
longer holds, and it is [stale](../../canon/orthograph.mdx) until it is proved again. The other six stand.

## Run the proof yourself

A report that says "it passes" is a claim. So the reviewer runs the whole proof, and then the check.

```sh capture=review-prove.txt
$ ortho prove
journey claim a handle ✔ 8/8 steps
handle.claim performance ✔ p50 18ms p95 33ms budget p95 100ms
prove ✔
```

Every journey passes, and claim is now measured against the new budget.

```sh capture=review-check.txt
$ ortho check
drift ✔
check ✔
```

The drift line is what lets everyone skip the eight generated files: each is exactly what the blueprint generates.
Asked once more, `ortho impact` answers `stale none`, as it did before the change.

## What you read

You read four lines of blueprint, and the reviewer's findings. A finding names a file and a line, what is wrong, and
what would make it right. The reviewer fixes nothing itself. What the commands show here is a change that did what was
asked: two declared lines, one operation unproved and proved again, and nothing outside the blueprint and what it
generates.

## When it goes wrong

A change is handed over before `ortho generate` was run. Then the check fails, and names every file that is behind.

```sh part capture=review-check-early.txt
drift ✘ 8
  generated/docs/handle/claim.md  no-edited-output: differs from what the blueprint generates: never edit generated/, run ortho generate
check ✘
```

The reviewer reports it and sends the change back. It does not run the command to tidy up.

An operation goes stale and no line says what changed. After the proof above, we added one comment line to
claim's handler and left the blueprint alone.

```sh capture=review-impact-handler.txt
$ ortho impact
stale handle.claim
```

The blueprint did not move, and the code did. That is the one time the reviewer reads a handler, looking for a
decision made in code that belongs in the blueprint.

The record is missing, or already overwritten. On a fresh checkout `ortho impact` has nothing to compare with, and
lists every operation as unproven. And a full proof writes a new record, so a reviewer that proves first and asks
second is told nothing is stale. Ask first.

A budget is not a gate. The performance eval never fails: its own notes (`packages/prove/src/modules/evals/README.md`)
say a p95 over one and a half times the budget adds a review line and still passes. We did not record one. The
reviewer reads the numbers on that line, not only the mark.

## How this stands

Every command above runs today and was recorded on Plugged In on 26 November 2026. It was staged. The recording made
the change itself, two edits and one `ortho generate`, and added the comment line to the handler; no agent wrote the
change and no reviewer was filmed reading it. The example was put back afterwards.

That the reviewer wrote none of the change, and that a builder never edits the journeys that judge it, is how we work
in this repository. No command checks who wrote what; the reviewer reads the list of files. `ortho brief` prints a
brief for one handler only, so a change to the blueprint has no printed brief to be held against. The record
`ortho impact` reads sits in a folder git ignores, so it does not travel with a change or reach CI. And after this
change, the comment at the top of claim's handler still quotes the old description and the old budget, and nothing
says so.
