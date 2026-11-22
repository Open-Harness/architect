# Building the factory with Orthograph

A worked example in the frame ([`../README.md`](../README.md)). Proposed, 17 November 2026. The factory is the system
that builds Orthograph apps, Orthograph included. It is itself a Orthograph app: `examples/work` (F5), which becomes `apps/work`
when it is deployed. Names as in [`agents.md`](agents.md): Orthograph, `ortho`, `@orthograph/*`, and "language" for what
was called a target.

## The idea

You give the factory a mission: "allowances to production". It asks you what it needs to know, works out every task
from your blueprint, starts agents on the tasks, and waits for proof. It moves a task to done only when a fact says so:
an eval row, a verdict, a release. It stops and asks you for the few things that are yours: a promote, money, a
credential, a question it can't answer. When production drifts or a measure gets worse, that becomes a new task.

> **Partly superseded by [K11](../../decisions/K11-work-board.md) (18 November 2026).** Work items are stored and
> arrive through an inbox; the derived tasks below are one source the manager files items from. Rule 2 holds for
> agents; an authority in person may also close an item, recorded as an `accepted` verdict. Missions are K11's goals.

Three rules make it trustworthy:

1. **Tasks are worked out, never stored.** Each is a kind over a subject, `build:allowance.spend`, put in a column by
   the facts (F5 call 2). Nobody can mark one done by hand, including the agent that did the work.
2. **Only a fact moves a card.** A run can say it pushed a branch. It can't close its own task. CI proves it, and the
   verdict closes it (F5 call 5).
3. **The scorer is trusted and separate.** Builders never see journeys. `check` and `prove` judge their work outside
   their sandbox (H1.7, H2.7).

## The description

Six things are the factory's own: `mission`, `milestone`, `question`, `run`, `attention`, and the board read on
`mission`. Two more come from mounted features instead of being copied: `person` and `session` from auth (the
work-real spike had to copy them in, which is the weakness the frame's mounting fixes), and agent runs from the agents
feature ([`agents.md`](agents.md)).

```ts
// blueprint/features/auth.ts, blueprint/features/agents.ts: mounted, not copied
export default Blueprint.use(auth, (a) => [a.choose(a.choices.signIn.passkey)]);
export default Blueprint.use(agents, (a) => [a.narrow(a.operations.start, { allowed: [manager] })]);
```

The mission's machine is unchanged from `origin/main:examples/work/blueprint/things/mission/machine.ts`:

```ts
states: ["intake", "running", "paused", "done", "stopped"],
moves: {
  open:   { from: [], to: "intake" },              // the manager asks its questions first
  start:  { from: ["intake"], to: "running" },     // only when you press Start; refused with MissionHasOpenQuestions
  pause:  { from: ["running"], to: "paused" },     // the day's share of the cap is spent
  resume: { from: ["paused"], to: "running" },
  finish: { from: ["running"], to: "done" },       // every task closed by a fact; refused with MissionHasOpenTasks
  stop:   { from: ["intake", "running", "paused"], to: "stopped" },  // a person's act
},
```

The factory's `run` keeps what only the factory knows (which mission, which task) and points at an agents-feature
run for everything else:

```ts
// blueprint/things/run/thing.ts (today: agent, model and budget live here, F5)
export const Run = Blueprint.thing({
  description: "One agent run, claimed against one task of one mission.",
  fields: { id: Blueprint.id("run"), mission: Mission.fields.id, task: TaskKey, agentRun: agents.Run.fields.id },
});
```

The board is a read with one step that today is a blank:

```ts
// blueprint/things/mission/verbs/tasks.ts (origin/main)
steps: {
  plan: Blueprint.step.database(),   // milestones, questions spiked, runs and attention
  facts: Blueprint.todo("read eval rows, verdicts and compiled revisions from the logbook: a declared dependency (L3.01)"),
},
```

In the frame, "a declared dependency" is an adapter. The logbook is outside the factory: another system with its own
contract. So the blank becomes a call:

```ts
steps: {
  plan: Blueprint.step.database(),
  facts: Blueprint.step.call(logbook.calls.facts.list),   // eval rows, verdicts, compiled revisions, by subject
},
```

and the factory takes the logbook's events in, so a new verdict wakes whatever waits on it:

```ts
// blueprint/things/mission/verbs/notice.ts: wakes every running mission whose plan has this subject
export default Blueprint.operation(Mission, {
  payload: { subject: Subject, revision: Digest },
  allowed: [Blueprint.role(Mission, { service: logbook })],
  on: [Blueprint.on(logbook.events.verdictRecorded, (e) => ({ subject: e.operation, revision: e.revision }))],
  steps: { wake: Blueprint.step.use(Manager.notice) },
});
```

## Journeys: prose first, then executable

The journey author's plain words, before any handler exists (W1):

1. Ada opens a mission with three questions open. She can't start it: `MissionHasOpenQuestions`, open 3.
2. She answers two and spikes one. Now it starts, and the spike is a task of its own.
3. The manager starts a builder on `build:allowance.spend`. The task shows as running.
4. The run finishes and records its branch. The task is **still** running: a run can't close its own task.
5. CI records a passing verdict for `allowance.spend` in test. Now the task is proven.
6. A promote task waits on Ada. Only Ada, in person, can approve it, not her manager acting for her.
7. The mission can't finish while a task is open: `MissionHasOpenTasks`.

Number 4 and 5, executable. The logbook's stand-in is a world of the logbook itself: real software on the first rung,
not a fake.

```ts
// journeys/only-a-fact-moves-a-card.ts (journey author's file)
export default Blueprint.journey("only a fact moves a card", {
  cast: { ada: owner, manager: owner.via(Via.agent) },
  starts: "mission-running",                       // a starting world: open, answered, started, by operations
  steps: (s) => [
    s.step("the manager starts a builder",
      s.manager.run(runStart, { mission: s.world.mission, task: "build:allowance.spend", agent: "builder" }),
      emits(RunStarted)),
    s.step("the run finishes with a branch",
      s.system.run(runFinish, { mission: s.world.mission, run: s.answer.run, branch: "build/allowance-spend" }),
      board.has(s.world.mission, "build:allowance.spend", "running")),          // still running
    s.step("CI records a verdict",
      s.world.adapter(logbook).emit(logbook.events.verdictRecorded, verdict("allowance.spend", "test", "pass")),
      board.has(s.world.mission, "build:allowance.spend", "proven"),
      spans({ present: ["mission.notice", "mission.tasks.facts"] })),
  ],
});
```

## Blanks and handlers

Twenty-six handlers were scaffolded in `examples/work/src` (F5); the spike wrote all of them, and the one that matters
is the board. It is a pure rule over facts, so it is tested like any function and never stored:

```ts
// src/board.ts: the rule the work-real spike wrote, kept pure
export const column = (task: Task, facts: Facts): Column =>
  facts.liveRun(task) ? "running"
  : facts.openAttention(task) ? "waiting"
  : done(task, facts) ? "done"
  : proven(task, facts) ? "proven"
  : "open";
```

```ts
// src/mission/tasks.ts
const tasks: Handler = ({ mission }, { steps }) =>
  Effect.gen(function* () {
    const plan = yield* steps.plan({ mission });                      // milestones × the blueprint's subjects
    const facts = yield* steps.facts({ subjects: plan.subjects });    // the logbook adapter's call
    return { tasks: plan.tasks.map((t) => ({ ...t, column: column(t, facts) })) };
  });
```

**The manager is an agent with the factory's own operations as tools.** It is declared like any agent, with no
project tools, only operations:

```ts
// blueprint/agents/manager.ts
export default Blueprint.agent({
  instructions: "./manager.md",
  operations: [mission.tasks, question.ask, run.start, run.stop, attention.raise],
  limits: { maxUsd: 3, wall: "1 day" },
});
```

Builders are the `builder` agent from [`agents.md`](agents.md), with project tools and a brief, in a copy of the
target project with its journeys taken out.

## Adapters and secrets

| Adapter | Calls out | Events in | Stand-in in a world |
|---|---|---|---|
| `logbook` | `facts.list` | `verdictRecorded`, `releaseRecorded` | a world of the logbook itself (first rung) |
| `github` | push a branch, open a pull request | `pullRequest`, its merged close (K39) | Gitea or a bare local repository (second rung) |
| a model provider, through the agents feature | `messages.create` | none | a local open model (second rung) |
| a sandbox provider, later | start, exec, stop | none | a local Docker container (first rung) |

Secrets, each declared by its adapter: `GITHUB_APP_KEY` (runtime), the provider keys (builder when the factory runs on
a developer's machine; runtime once it runs in its own Worker), and the logbook's read token. The factory never holds
the release secrets CI uses to promote. A promote is an `attention` a person approves, and CI does the promote.

## Where data lives

| What | Where | Why |
|---|---|---|
| missions, milestones, questions, runs, attention | the database (D1) | the board and the sidebar need list reads (F5 call 3) |
| tasks | nowhere: worked out on each read of `mission.tasks` | a stored task can disagree with its facts |
| facts: eval rows, verdicts, compiled revisions, releases | the logbook (its own Durable Object and R2) | only CI writes a verdict, signed (F5 call 4) |
| the manager's loop, one per mission | a workflow on Effect's Cloudflare engine, keyed by the mission id | it waits days on facts, so its waits must be stored |
| each builder's loop | the agents feature's per-run Durable Object, through Pi | [`agents.md`](agents.md) |

**The manager as a workflow.** Its body loops: read the board, start runs for open tasks within today's share of the
cap, raise attention where a person must decide, then wait. The wait is a durable deferred, completed when
`mission.notice` hears a verdict or a merge, or by a durable clock at the end of the day. Each step is an activity, so
a deploy or an eviction replays from the top without starting a second builder or paying for a turn twice. Its
reasoning (which task next, how to phrase a question) is one agents-feature run per decision, not one endless
conversation.

## Projections and what gets generated

Already generated on `main` with no hand-written plumbing (F5 section 5): the `work` CLI, `@work/sdk`, 26 MCP tools
named as the operations (the manager's and the runs' tools), docs and the portal wire. The portal's Work side, the
board, KPIs and the manager's conversation, reads that API (W4).

## The recursion

The factory is a Orthograph app, so it is built and proved by Orthograph. It also builds Orthograph. To keep that from biting its
own tail:

- The factory runs on a **released** Orthograph, pinned exactly (`orthograph@1.4.0`), deployed and promoted like any
  app.
- Its missions target a project at a revision. When the project is Orthograph itself, the builders work on Orthograph's next
  revision, in a copy, and CI proves that revision.
- The factory upgrades to the new Orthograph only after that release passes its gate, through an ordinary promote that
  Ada approves.

So no change ever judges itself: the scorer that proves Orthograph N+1 is the CI of Orthograph N+1, and the factory that
asked for it runs on Orthograph N.

**Drift and ratchets close the loop.** `ortho watch` runs the evals on what production records. A measure that gets
worse (a p95 over budget, a refusal rate up, a defect) is a fact in the logbook. The board shows it as a
`watch:allowance.spend` task, and the manager treats it like any other open task. Ratchets keep it one-way: a budget
can be tightened by a passing verdict, never loosened by one.

## A day in its life

```text
$ work mission open --title "Allowances to production" --target production --blueprint acme
mission ms_41   intake   3 questions from the manager
$ work question list --mission ms_41
q1  Which chains in production?        a) Base  b) Base and mainnet
q2  Daily cap for agent spend?         a) $3  b) $5
q3  Monthly or rolling periods?        a) calendar months  b) rolling 30 days  c) not sure yet
$ work mission start ms_41
refused  MS-001 MissionHasOpenQuestions   open: 3
$ work question answer q1 --letter a && work question answer q2 --letter a && work question spike q3
$ work mission start ms_41
running   19 tasks   today's cap $3.00
$ work mission tasks ms_41
running   spike:allowance.spend
waits     promote:allowance.grant
proven    validate:allowance  prove:allowance.grant  prove:allowance.get  prove:allowance.revoke  prove:allowance.spend
          promote:allowance.get  promote:allowance.revoke  promote:allowance.spend
done      specify:allowance.grant  specify:allowance.get  specify:allowance.revoke  specify:allowance.spend
          machine:allowance  build:allowance.grant  build:allowance.get  build:allowance.revoke  build:allowance.spend
19 tasks   1 running   1 waits on you   8 proven   9 done
$ work attention list --mission ms_41
at_9   promote   allowance.grant to production   staging ✔ 9/9
$ work attention approve at_9
approved   CI promotes 1.4.0 to production
```

This board is the one the work-real spike produced from acme's real facts: 19 tasks, 17 closed by facts (proven or
done), none moved by hand (`origin/spike/work-real:spikes/work-real/README.md`).

## Proof

- W1: the journeys above, by an author who is not the builder, failing on the scaffolded handlers first
  (`design/build-plan.md:187`).
- The nine evals on all 26 operations: the same roles, refusal codes and spans as acme.
- The bench's planted checks hold for the factory's own runs: the oracle solves every task, the null runner none.
- The recursion's own check: a Orthograph release that fails its gate is never offered to the factory as an upgrade.

## Today and proposed

| | Today | Proposed |
|---|---|---|
| The blueprint | on `main`: 6 things, 26 operations, 26 MCP tools, one blank (`mission.tasks`'s `facts` step, F5) | 6 things of its own plus auth and agents mounted |
| Sign-in | none in F5; `person` and `session` copied from acme in the spike (`origin/spike/work-real`) | the auth feature, mounted |
| Facts | a spike-only `fact` thing stood in for the logbook | the logbook as an adapter, events in through `mission.notice` |
| The logbook | a hand-written package (`origin/layer/3:packages/logbook/src/modules/book/`), not a Orthograph app | the same, with a declared contract an adapter can be written against |
| The manager and runs | Durable Objects designed only (F4 8.2, W5) | a workflow per mission; agents-feature runs per builder |
| In person, not an agent | `Principal` can't tell them apart; `attention.approve` is `owner.of("mission")` either way (F5 section 4) | `owner.notVia(Via.agent)` |
| Scoped lists | `mission.list` returns every owner's missions to anyone signed in (F5 section 4) | a list rule, `where: { owner: principal }` |
| A question's answer | not kept: no field for the letter picked (work-real gap 5) | a `picked` field |
| Build steps | W1 to W5 (`design/build-plan.md:187-189` and on) | unchanged in order; W3's blank goes when the logbook adapter exists |

## Questions this raised

1. **How does the factory's run relate to the agents feature's run?**
   A. It references one (`agentRun`), keeping only mission and task.
   B. The agents feature's `Run` gains optional mission and task fields.
   C. The factory keeps its own run and calls Pi directly.
   **Recommend A.** Features never contain each other, and the agents feature stays usable by apps with no missions.
2. **What runs the manager's loop?**
   A. An Effect Workflow per mission, waiting on durable deferreds completed by logbook events.
   B. One long Pi conversation per mission, polling the board.
   C. A keeper alarm each hour that starts a fresh run.
   **Recommend A.** It waits on facts rather than polling, and a replay never starts a builder twice. B pays tokens to
   wait. C is late by up to an hour and has no memory between ticks.
3. **What does the factory run on?**
   A. The last released Orthograph, upgraded by an approved promote.
   B. Orthograph's `main` at its latest commit.
   C. The revision it is building.
   **Recommend A.** B lets a bad merge break the factory that would fix it. C has the change judging itself.
4. **How does the factory read the logbook?**
   A. A hand-written adapter over the logbook's HTTP routes now; generated once the logbook publishes a model.
   B. Rebuild the logbook as a Orthograph app first, then generate the adapter.
   C. Keep the spike's `fact` thing, fed by a script.
   **Recommend A.** It unblocks W3 now, and B can follow without changing the factory. C is our own copy of facts,
   which can drift from the real ones.
