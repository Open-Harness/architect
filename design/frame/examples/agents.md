# Building agents with Orthograph

A worked example in the frame ([`../README.md`](../README.md)). Proposed, 17 November 2026. It shows the agents
feature, `@orthograph/agents`, built the way any feature is built. The factory ([`factory.md`](factory.md)) mounts it,
and so can any app that wants an agent working on its behalf.

Words are used as the frame's glossary defines them. Two names are new since that glossary was written: the framework
is **Orthograph** (command `ortho`, packages under `@orthograph/*`), and what was called a target is now a **language**
(`@orthograph/language-effect`, `language-solidity`, `language-noir`, `language-python`). Blueprint stays the name of what
you write.

## The idea

An agent run is one model working one brief, with tools, inside a budget, until it is done, out of turns, out of money,
or stopped. It can run for twenty minutes and cost dollars, so it must survive a crash, a deploy and an eviction
without losing a turn or paying for one twice.

In Orthograph that splits cleanly into three parts:

1. **The run's lifecycle is declared.** A `Run` thing with a machine, and operations to start, steer, cancel and read
   it. Roles, refusals, spans, the SDK, the CLI, the MCP tools and the nine evals all come from that, as for any thing.
2. **The loop is an export, written once per host.** `Agent.open` runs Pi Durable behind an Effect seam (H1.1). On
   `Host.worker` it lives in one SQLite Durable Object per run. On `Host.node` it lives in one SQLite file per run.
3. **The outside is adapters.** Each model provider is an adapter, with its own secrets, contract and stand-in. The
   agent's tools are the app's own operations, called as an `agent` principal through the generated SDK.

The boundary H1 drew stays: Pi owns the transcript; the blueprint's machine owns the lifecycle (H1 section 11).

## The description

```ts
// @orthograph/agents/blueprint/things/run/thing.ts
import { Blueprint } from "orthograph";
import { AgentName, Brief, Cents, ModelRef } from "../../values/agents.ts";

export const Run = Blueprint.thing({
  description: "One agent working one brief: which agent, which model, what budget.",
  fields: {
    id: Blueprint.id("run"),
    agent: AgentName,          // a declared agent: its instructions, skills and tools (below)
    model: ModelRef,           // `anthropic/claude-sonnet-5-5`, `commandcode/glyph-cluster:free`
    brief: Brief,              // the task text, or a reference such as `allowance.spend` for a builder
    budget: Cents,
    spent: Cents,
    startedBy: Person.fields.id, // from the auth feature: whose run it is
  },
  lives: "database",           // a row, so runs can be listed; the loop lives in its own Durable Object (below)
});
```

```ts
// @orthograph/agents/blueprint/things/run/machine.ts
export const machine = Blueprint.machine(Run, {
  states: ["working", "waiting", "done", "failed", "cancelled"],
  moves: {
    start:  { from: [], to: "working", emits: Events.RunStarted },
    wait:   { from: ["working"], to: "waiting", emits: Events.RunWaiting },    // a stored sleep or a retry backoff
    wake:   { from: ["waiting"], to: "working", emits: Events.RunWoke },
    steer:  { from: ["working", "waiting"], to: "working", emits: Events.RunSteered },
    finish: { from: ["working"], to: "done", emits: Events.RunFinished },
    fail:   { from: ["working", "waiting"], to: "failed", emits: Events.RunFailed },  // turns, budget, crash loop, model
    cancel: { from: ["working", "waiting"], to: "cancelled", emits: Events.RunCancelled },
  },
});
```

```ts
// @orthograph/agents/blueprint/things/run/verbs/start.ts
export default Blueprint.operation(Run, {
  description: "Start an agent on a brief. It runs until done, out of budget, or cancelled.",
  payload: { agent: Run.fields.agent, model: Run.fields.model, brief: Run.fields.brief, budget: Run.fields.budget },
  answer: { run: Run.fields.id },
  move: machine.moves.start,
  errors: [AgentUnknown, ModelRefused, OverBudget],
  allowed: [signedIn.via(Via.session, Via.key)],     // a person starts this run; under K40 an agent is its own thing instead
  steps: {
    open: Blueprint.step.use(Agent.open),            // the loop, in the run's own Durable Object
  },
  idempotent: "request",
  budget: { p95: "250 millis" },                     // starting, not running: the run itself is not in the budget
});
```

`steer` takes a note and hands it to the live loop (Pi's steering). `cancel` stops it at the next safe point. Both are
allowed to the run's owner, `Blueprint.role(Run, { rule: (run, p) => run.startedBy === p.person })`, through a session,
a key or an agent acting for them.
`finish`, `fail`, `wait` and `wake` are called by the loop itself, as the `system` principal, never by a caller:

```ts
// @orthograph/agents/blueprint/things/run/verbs/finish.ts
export default Blueprint.operation(Run, {
  payload: { run: Run.fields.id, outcome: Outcome, spent: Run.fields.spent },
  move: machine.moves.finish,
  allowed: [Blueprint.system],                       // only the run's own loop
  steps: { record: Blueprint.step.database() },
});
```

An agent is declared too, so its prompt, skills and tools are part of the model and its hash goes in every run record:

```ts
// your app: blueprint/agents/builder.ts (an agent's name comes from its path)
export default Blueprint.agent({
  instructions: "./builder.md",                      // a template; the brief is filled in per run
  skills: [skills.fillABlank, skills.debugAFailingEval],  // SKILL.md folders (H1.6), loaded on demand; names from generated/agents/skills.ts
  tools: Tools.project("read", "list", "write_file", "check"),  // H1.5 (a): project tools, a denied-paths list
  operations: [],                                    // H1.5 (b): the app's operations it may call, as tools
  limits: { maxTurns: 40, maxUsd: 1, wall: "20 minutes" },
});
```

An operator agent lists operations instead of project tools:
`operations: [allowance.get, allowance.spend]`. Each becomes a tool whose parameters are the operation's payload
schema, and whose call goes through the generated SDK as the agent principal. Roles, refusals and typed errors are the
real server's (H1.5). This is the same mapping the MCP projection makes, shared as one function.

## Journeys: prose first, then executable

A journey author writes the story in plain words before any code exists. These are the agents feature's own:

1. Ada starts a builder on a brief with a one-dollar budget. The run is working. She reads it back and sees the agent,
   the model and nothing spent.
2. Ada steers it with a note. It is still working, and the transcript has her note.
3. Ada cancels it. It is cancelled, and its tools stop answering.
4. A run whose budget is spent fails with `OverBudget`, and the spend it records is not more than the budget.
5. The run's Durable Object is evicted mid-turn. The run resumes from its last checkpoint, finishes under the same id,
   and its usage total carries on rather than starting again.
6. Bob, who is signed in but not Ada, cannot steer or cancel Ada's run.
7. An agent cannot call an operation its person couldn't call: Olga's operator agent is refused
   `allowance.revoke` exactly as Olga is.

Then the same author turns each into code. Number 5, executable:

```ts
// @orthograph/agents/journeys/a-run-survives-eviction.ts (journey author's file)
export default Blueprint.journey("a run survives eviction", {
  cast: { ada: signedIn },
  steps: (s) => [
    s.step("ada starts a run",
      s.ada.run(start, { agent: "builder", model: Models.standIn, brief: "list the files", budget: 100n }),
      emits(RunStarted), machine.isIn(s.answer.run, "working")),
    s.step("the world evicts its object mid-turn",
      s.world.evict(Run, s.answer.run, { during: "agent.turn" })),          // the world door, proposed
    s.step("it resumes and finishes",
      s.world.until(machine.isIn(s.answer.run, "done")),
      spans({ present: ["agent.run", "agent.turn", "pi.durable.phase"], oneTrace: true }),
      usage.continues(s.answer.run)),
  ],
});
```

**What a journey can prove when the model is not deterministic.** The lifecycle, the roles, the budget, durability
and the evidence are deterministic, so journeys prove those. They assert on states, events, refusals, spans and
usage, never on what the model said. Whether a model is *good* at a brief is a different question, answered by
benchmarks: tasks times configs times repeats, scored by `check` and `prove`, with an oracle that must solve every task
and a null runner that must solve none (H2.1, H2.6).

## Blanks and handlers

The handlers are short, because the work is in the export:

```ts
// @orthograph/agents/src/run/start.ts (scaffolded, then written)
const start: Handler = ({ agent, model, brief, budget }, { steps, ids }) =>
  Effect.gen(function* () {
    const run = ids.run();
    yield* steps.open({ run, agent, model, brief, budget });   // hands the run to its Durable Object, returns at once
    return { run };
  });
```

The export has one implementation per host, written once in the feature:

```ts
// @orthograph/agents/src/exports/open.worker.ts (Host.worker)
export const open = Agent.open.implement(Host.worker, ({ run, agent, model, brief, budget }) =>
  Effect.gen(function* () {
    const object = yield* RunObjects.get(run);                  // one SQLite Durable Object per run
    yield* object.submit({ agent: yield* Agents.get(agent), model, brief, limits: { usd: budget } });
  }),
);
```

Inside the object, the seam from H1.2 runs Pi: `now` is our `Clock`, timers are `Timers`, `onWake` sets the object's
alarm, provider retries are zero so all waiting is Pi's stored `sleepUntil` (H1.3). When Pi reports a phase ending,
the seam calls `run.wait`, `run.wake`, `run.finish` or `run.fail` as `system`, so the row and the transcript never
disagree for longer than one call.

The blanks the feature leaves for an app are only its choices: which agents exist, their instructions and their tools.

## Adapters and secrets

Each model provider is an adapter ([`../adapters.md`](../adapters.md)):

```ts
// blueprint/adapters/anthropic.ts
export default Blueprint.use(anthropic, (a) => [a.include(a.calls.messages.create)]);
```

```ts
// blueprint/adapters/commandcode.ts: OpenAI Chat for the open models, Anthropic Messages for Claude (H1 section 6)
export default Blueprint.use(commandcode, (c) => [c.include(c.calls.chat.completions.create), c.include(c.calls.models.list)]);
```

The agents feature names what it needs: `needs: [auth, Blueprint.need(modelProvider, { atLeast: 1 })]`. In the
harness, each adapter's call becomes a `pi-ai` provider, so Pi's loop is unchanged (H1.4).

Secrets follow [`../secrets.md`](../secrets.md). Each provider adapter declares `apiKey`. Mounted as
`blueprint/adapters/anthropic.ts`, its name is `ANTHROPIC_API_KEY`; as `commandcode.ts`, `COMMANDCODE_API_KEY` (H2.4).
The kind depends on who runs the agent:

- An app whose deployed Worker runs agents for its users holds the key as **runtime**, in the Worker's secret store.
- The factory's builders, run from a developer's machine or CI, hold it as **builder**, never in a Worker.

Either way only the adapter's layer reads the value, as `Redacted`, and every transcript, log and trace is scrubbed by
exact match before anything is written (H2.4).

**Stand-ins for a model, on the frame's ladder.** Our own fakes and recordings are out (Q1). Locally a world uses a
small open model served by protocol-compatible real software, an OpenAI-compatible local server (the second rung). In
staging, the free Command Code models are the provider's own service (the fourth rung). Pi's `faux` provider is our own
fake, so it is allowed only inside the harness's own unit tests of crash mechanics, as H1 section 9 already says, never
in a journey.

## Where data lives

| What | Where | Why |
|---|---|---|
| The `Run` row: agent, model, brief, budget, spent, state | the database (D1) | runs are listed and filtered; a list read needs the database (F5 call 3) |
| The transcript, task checkpoints, tool outputs, usage | the run's own SQLite Durable Object, through Pi's storage with a table prefix | one owner per run, atomic commits, resume on alarm (H1 section 3) |
| Waits: a sleep, a retry backoff | the same object's alarm, through `Timers` | waiting is stored, not held in memory (H1.3) |
| The run record, for benchmarks | R2, with a D1 index for comparing | large, immutable, read by suites (H1 section 11) |
| Traces | the telemetry sink, by trace id | the same place as every handler's evidence |

**Where Effect Cluster and Workflow fit.** A run's object is exactly what Effect calls a workflow execution: one
Durable Object per execution, with steps remembered in its SQLite (`CloudflareWorkflowEngine`, H1 section 8). Under
the new three-day rule, `@effect/platform-cloudflare` 4.1.3 can be used now, with `effect` raised to 4.1.3. That
doesn't change H1's call for the loop: Pi already gives the transcript, partial answers, compaction and steering, which
a Workflow would make us write. What it does change is the rest. A process that spans runs or waits for days (the
factory's mission, a payment waiting on a webhook) is declared as a workflow on the same engine. If Pi ever trips one
of H1's switch triggers, a run moves onto that engine too, behind the same seam, with every model call an activity so a
replay never pays twice.

## Projections and what gets generated

Mount the feature and these appear, with no further code:

```text
$ acme run start --agent builder --model anthropic/claude-sonnet-5-5 --brief allowance.spend --budget 100
run run_7Hq2   working
$ acme run watch run_7Hq2
turn 1  read src/allowance/grant.ts                    1.2s   $0.004
turn 2  write src/allowance/spend.ts                   3.8s   $0.011
turn 3  check   types ✔ rules ✔ drift ✔                 2.1s   $0.002
done    3 turns  $0.017  14.6s
$ acme run steer run_9Kx1 --note "use the remaining field, not limit minus spent"
$ acme run cancel run_9Kx1
```

- **SDK:** `client.run.start({ agent, model, brief, budget })`, `client.run.watch(id)` as a stream.
- **MCP:** tools `run.start`, `run.get`, `run.list`, `run.steer`, `run.cancel`. An outside agent can start our agent
  only if its person's role allows it.
- **Docs and portal:** a run page from the model; the portal shows the transcript, turns, cost and the trace.
- **Spans:** `run.start` as an operation span; inside the object, `agent.run`, `agent.turn`, `agent.tool.<name>` and
  Pi's `pi.durable.*`, joined by `traceparent` into one trace, with `gen_ai.*` attributes and never any content
  (H1.8).

## Proof

- The seven journeys above, in a world with the local model stand-in, through the API, the SDK, the CLI and MCP.
- The nine evals on every operation. "Who may call" is where the `agent` and `system` principals are proved.
- The harness's own planted checks: a run killed mid-turn resumes and scores the same; a record's cost equals the sum
  of its turns; a run over its dollar limit ends `budget` (H1 section 12, build plan A1 to A5).
- Benchmarks, separately: the oracle solves every task, the null runner none, in CI with no key (H2.1).

## Today and proposed

| | Today | Proposed |
|---|---|---|
| An agent run | check 4 only: the Agent SDK with `tools: []`, four tools of ours, `maxBudgetUsd: 5` (`origin/layer/3:e2e/layer1/04-agent-writes-a-handler.test.ts:90`), denied paths at `:18` | the agents feature, with a declared `Run` |
| The harness | an agent package designed (H1, H2), not built; steps A0 to A9 (`design/build-plan.md:149-166`) | the same seam, shipped inside `@orthograph/agents` |
| Pi version | 1.5.0, the newest under the two-week rule (H1.1) | 1.5.2 (10 November) is allowed under the three-day rule; bumped only when wanted |
| Effect Workflow on Cloudflare | 4.1.3 not allowed until 24 November (H1 section 8) | allowed now; used for processes that span runs |
| An agent as a caller | `Principal` is `anonymous` or `person` (`origin/layer/3:packages/orthograph/src/modules/roles/types.ts:6-8`); an agent looks like its person (F5 section 4) | `agent`, through `Via.agent`, and `system` for the loop |
| A run in the factory | `run` is a row in `examples/work` (F5 call 3), its Durable Object is design only (W5) | the factory mounts this feature ([`factory.md`](factory.md)) |
| A declared Run | considered for L5.08 (`build-plan.md:224`) | now, as this feature |

## Questions this raised

1. **What makes a run durable?**
   A. Pi Durable in the run's Durable Object behind the seam, as H1 decided.
   B. An Effect Workflow, with every model call and tool call an activity, and Effect AI for providers.
   C. Pi for the loop, but each turn wrapped as a Workflow activity.
   **Recommend A.** Pi already gives the transcript, partial answers and steering. B is the exit if Pi breaks the seam
   twice in a quarter (H1's triggers). C stores every turn twice.
2. **What stands in for a model in a world?**
   A. A small open model on a local OpenAI-compatible server, plus the free Command Code models in staging.
   B. Pi's `faux` provider in journeys.
   C. No journeys run a model; only benchmarks do.
   **Recommend A.** B is our own fake, which Q1 rules out. C leaves durability and roles unproved.
3. **Who may start a run?**
   A. Only a person, through `Via.session` or `Via.key`, Answered by K40 (22 November 2026): an agent is its own thing.
   B. Anyone signed in, agents acting for them included.
   C. Only `system`.
   **Recommend A.** An agent starting agents spends money without a person, so it must be an explicit choice in the
   mount.
