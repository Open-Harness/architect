# More than one agent

Film: `docs/explainer/films/agents/`

So far one agent has worked on Plugged In at a time: a designer, then an author, then a builder with one brief. Pay
by name is bigger than that. You will want several agents building at once, and two agents in the same files undo each
other's work without either of them noticing.

Orthograph has no command for this yet. So this chapter leaves Plugged In, and shows how this repository builds
Orthograph itself with many agents at once. Three things do the work: a claim, one rule for collisions, and a list
that may only shrink.

## Every line of work has one owner

We want each line of work to belong to one agent you can name. Here that owner is called a goal: one long-running
agent that manages other agents, with a brief of its own. We asked the file that lists the goals which of
them run.

```sh capture=agents-goals.txt
$ grep '^| 1' design/goals/map.md | cut -d'|' -f2,3
 18 · The framework | framework, always running 
 16 · Capxul core | app, the north star 
 19 · The lander | landing, always running 
```

Three run. One builds the framework and one builds an app on it. The third builds nothing new: it brings the app's
finished work into the shared branch.

## Claim before you build

We want an agent to learn that work is taken before it starts, and not when two changes meet. So a goal writes its
claim down first, on the [status page](../../canon/status.md), which keeps one row for each piece of work. A claim is
two cells of that row: the lane, which names the goal, and the paths the goal will change.

```md file=docs/canon/status.md lines=224-224
| gap-wide-things | Wide things: things past D1's 100 columns | spiked | Capxul | beta | books | goal-16 | `packages/host-cloudflare/src/modules/store`, `packages/compiler` | erpnext-scaffolder | #742, item 4; five doctypes are wider (Sales, Purchase and POS invoices; Sales and Purchase orders) |
```

Find `goal-16`, and the two folders after it. Goal 16 holds this piece and has said where it will work. Any other
agent that needs those folders reads this first. We counted the claims held today.

```sh capture=agents-claims.txt
$ grep -o '| goal-[0-9]* |' docs/canon/status.md | sort | uniq -c
     13 | goal-16 |
      1 | goal-18 |
```

Thirteen rows are held by the app's goal and one by the framework's. On every other row the lane says none, and that
work is free to take.

## One rule when two agents want the same thing

An agent building an app keeps finding gaps in the framework under it. We want it to know at once whether a gap is
its own to fix, without asking you. The same file answers with three cases.

```md file=design/goals/map.md lines=29-36
An app goal owns every gap it finds, big or small. Before starting one, it reads the claims on the board:

1. **A running goal has claimed it, or it is in a slice a running goal has scheduled.** Wait for it, or take the part
   that has landed. A stopped goal's slice is not scheduled: the app goal that needs it takes it.
2. **It would change paths another running goal has claimed.** Settle it through Goal 18: one of them does it, or they
   split it.
3. **Neither.** Claim it (the `lane:goal-<n>` label on its issue, and a "Touches" line naming the paths) and build it
   in this goal's own slice.
```

Only the second case needs a decision, and the rule names the one agent that makes it. In the
other two an agent reads the board and knows what to do: wait, or claim it and build.

## A list that may only shrink

Journeys and checks are written before the build, by a different agent. With many agents that means red checks sit
in the shared branch before the code that passes them. We want the shared branch to stay a gate anyway. So each
failure we know about is written in a list, and the build fails on any failure that is not listed. Here is one whole
list, about Plugged In's own journeys.

```txt file=e2e/stage1/expected-failing/01-plugged-in-journeys.txt lines=1-2
# `--env test` refuses `--report` ("--json and --report require --env local", exit 2), so the test half of the check can only read prove's lines. This test requires the report in test; when a builder gives test one it passes, and this entry comes off.
stage1/01-plugged-in-journeys.test.ts > --env test > `--env test` reports its run as data
```

One line says why the entry is there and when it comes off. The other names the one check that may fail. A builder
may delete a line from such a list and may never add one: a script in this repository's CI
refuses a builder's pull request that does. So the lists are what is promised and not yet built, and you can count
them.

```sh capture=agents-ratchets.txt
$ for d in e2e/*/expected-failing packages/*/expected-failing; do echo "$(ls $d | wc -l) $d"; done
2 e2e/m1/expected-failing
3 e2e/m2/expected-failing
8 e2e/m7/expected-failing
4 e2e/m8/expected-failing
5 e2e/on-chain/expected-failing
1 e2e/stage1/expected-failing
10 e2e/superagent/expected-failing
5 e2e/ui-layer/expected-failing
2 packages/compiler/expected-failing
4 packages/language-effect/expected-failing
```

Ten lists. The smallest holds one file, the one quoted above. You read these numbers the way you read red steps in
a climb: over time they go down.

## When it goes wrong

Two agents change the same file anyway. A claim is a cell in a table, and nothing locks the paths it names. Here one
goal reads the claims every round, looking for two goals on one path, and settles each overlap as a decision. What it
misses arrives as a merge conflict, a cost this repository accepts for running more at once.

A claim goes stale. The rule is that a goal which stops sets its lanes back to none. That relies on the goal doing
it, so a row can stay held by an agent that is no longer running.

A builder wants a check changed. It stops and asks the check's author. An author's branch may add to a list, with
its reason; a builder's may only take away.

And the tools around this are rough. The script that prints each list's numbers failed where we recorded, because
it needs the network, so we counted files in plain shell. The dry run that prints overlapping claims needs GitHub and
did not run there either, so we have no recording of an overlap being found.

## How this stands

All of this is this repository's practice, and none of it is a command. The three recordings were made on 26
November 2026 by reading the repository's files; nothing was run on Plugged In. No command of Orthograph's claims work, reads a board, settles a collision or keeps a list of known failures.
The list and the guard on a builder's pull request are scripts in this repository's own CI, and a new app gets neither.

The product's answer is designed and not built. It is called the factory, a board of work that agents build from,
and the status page marks it as spiked. Until it exists, what you can copy is small: one file of claims, one rule,
and one list that only shrinks.
