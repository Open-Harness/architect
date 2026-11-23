# The story: one allowance, from an idea to production and back

Part of the frame ([`README.md`](README.md)). Written 17 November 2026. This is the spine: one example followed the
whole way round, so every other frame document has a place to hang. Where another document goes deeper, this one links
to it and moves on.

Names: the framework is **Orthograph** (command `ortho`, npm org `@orthograph`). **Blueprint** stays the name of what you
write: the `blueprint/` folder and the `Blueprint.*` API. The packages are mapped in `decisions/M0-packages.md`; plugin
packages named below don't exist yet.

## The example, and why it

Acme lets an organisation give a member an **allowance**: money they may spend, up to a limit each month. The owner
grants it, the member spends from it, the owner can revoke it.

It is the right example because it already exists on `origin/layer/3`, all the way through: a thing, a machine with two
outcomes, roles, events, three declared errors, starting worlds, six journeys, handlers, and a generated server, SDK,
CLI, MCP endpoint and docs (`examples/acme/`). So every "today" below is real code, and every "proposed" is a short
step from it. It is small enough to hold in your head and has the parts that matter: a rule about who may call, a
refusal that depends on data, a state that ends things, and a retry that must not spend twice.

## 1. The idea

It starts as a conversation with your agent, in chat, on a diagram, or in Figma.

```text
you    Members should be able to spend company money without asking each time. Up to a limit, monthly.
agent  So a new thing, an allowance: one organisation, one member, a limit, what's been spent.
       Who can grant one? Only the owner?
you    Yes. And they can revoke it.
agent  States, then: active, exhausted when it's all spent, revoked. Can a revoked one come back?
you    No.
agent  What happens if a spend is more than what's left?
you    Refuse it, and say how much is left.
agent  And a phone that retries the same spend after a timeout?
you    Spends once.
```

What comes out is not code yet. It is three kinds of fact, each with a place in `blueprint/`:

| From the conversation | Becomes |
|---|---|
| "an allowance has a limit and what's spent" | a **thing**, with fields |
| "active, exhausted, revoked; revoked is final" | a **machine**: states and moves |
| "only the owner grants", "say how much is left", "spends once" | **operations**, with roles, errors and `idempotent` |
| "the owner revokes, then the member can't spend" | a **journey**, written as a story |

A state diagram drawn in FigJam or as UML is the machine. Three boxes and three arrows are exactly `states` and
`moves`. Orthograph can draw the machine back as the same diagram ([`projections.md`](projections.md), the docs
projection), so the picture and the code are the same thing seen twice.

Anything you don't know yet stays a **blank**: `Blueprint.todo("what happens at the month's end")`. A blank is a
question, not a gap. It is written down, it shows in the model, and it becomes a task.

> **Today.** Blanks exist: `Blueprint.todo` (`packages/orthograph/src/index.ts:35`), found by the compiler
> (`compiler/src/modules/model/internal/describe.ts:44-48`). There is no tool that turns a conversation or a diagram
> into a blueprint. The agent writes the files by hand.
> **Proposed.** The planning agent writes straight into `blueprint/` through the builder's `bp.write`
> ([`builder.md`](builder.md)), and `ortho check` answers in the same turn. A FigJam or Mermaid state diagram is read
> as a machine, and drawn back from one.

## 2. The description

The facts become declarations. Each is a file, and the name comes from the path.

```ts
// blueprint/things/allowance/thing.ts
export const Allowance = Blueprint.thing({
  description: "Money a member may spend from their organisation, up to a limit each month.",
  fields: { id: Blueprint.id("alw"), organization: Organization.fields.id, member: Person.fields.id, limit: Amount, spent: Amount },
});
```

```ts
// blueprint/things/allowance/machine.ts
export const machine = Blueprint.machine(Allowance, {
  states: ["active", "exhausted", "revoked"],
  moves: {
    grant:  { from: [], to: "active", emits: Events.AllowanceGranted },
    spend:  { from: ["active"], to: ["active", "exhausted"], emits: Events.AllowanceSpent }, // two outcomes
    revoke: { from: ["active", "exhausted"], to: "revoked", emits: Events.AllowanceRevoked },
  },
  notFrom: { exit: 40 }, // generates AllowanceNotActive, carrying the state it was in
});
```

```ts
// blueprint/things/allowance/verbs/spend.ts
export default Blueprint.operation(Allowance, {
  description: "Spend from what is left of this month's allowance.",
  payload: { allowance: Allowance.fields.id, amount: Amount, memo: Memo },
  answer: { remaining: Amount },
  move: machine.moves.spend,
  errors: [AllowanceExceeded],                       // carries { remaining }
  allowed: [grantee],                                // a rule: allowance.member is the caller
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  idempotent: "request",                             // retried with the same request key, it spends once
  budget: { p95: "150 millis" },
});
```

`grant` and `revoke` are the same shape, allowed to `owner.of("organization")`. A thing also says where it lives. The
allowance lives in the database (the default), because the owner will want to list them. A thing that needs one writer
at a time and no lists would say `lives: "actor"`: one Durable Object per allowance, as an Effect Cluster entity.

This is the whole contract. Everything else in the story is made from these files or judged against them.

> **Today.** All of this compiles on `origin/layer/3` (`examples/acme/blueprint/things/allowance/`). Principals are only
> anonymous or a person (`blueprint/src/modules/roles/types.ts:6-8`), so "an agent spending for olga" can't be said yet.
> **Proposed.** `agent`, `service` and `system` principals ([`README.md`](README.md), principals), and data **views**
> for lists over things that live as actors ([`delta.md`](delta.md), data).

## 3. Journeys as stories first

A journey is a short story through real operations, played by a cast, starting from a named world. The first version is
**prose only**. It is written during the idea, by you and your planning agent, before anything can run.

```ts
// journeys/revoke-then-spend.ts: a story, not executable yet
export default Blueprint.journey("revoke then spend", {
  cast: { ada: "owns the organisation", olga: "has an allowance of 500" },
  starts: "funded",
  story: [
    "ada revokes olga's allowance. It is revoked, and that is recorded.",
    "olga tries to spend 1. She is refused because it is revoked, and nothing is recorded.",
    "olga tries to revoke it herself. She is refused because she isn't allowed.",
  ],
});
```

A story is a blank with a shape. The compiler counts it, the portal shows it, and it says what the system must do in
words anyone can check. It is also what you hand a person who is not technical: they can read the journeys and say
"that's not what I meant" before a line of behaviour exists.

Starting worlds begin the same way: `funded` is "from founded, ada has granted olga 500".

> **Today.** Journeys are always executable. There is no prose stage; the planning happens in chat and is lost
> (`examples/acme/journeys/*.ts`). The model leaves journeys out altogether (`describe.ts`, [`delta.md`](delta.md)).
> **Proposed.** `story:` as the first form of a journey, in the model, each unwritten step a blank.

## 4. Making the journey executable

A **different agent from the builder** turns each story into checks. That rule is what makes the checks honest: the
agent that fills a handler never wrote the test it must pass (`AGENTS.md`, "Journeys and checks come first").

Each sentence becomes a step: a call by one of the cast, and what the evidence must show.

```ts
// journeys/revoke-then-spend.ts: executable. The builder never edits this file.
export default Blueprint.journey("revoke then spend", {
  cast: { ada: owner, olga: grantee },
  starts: "funded",
  steps: (s) => [
    s.step("ada revokes it",
      s.ada.run(revoke, { allowance: s.world.allowance }),
      emits(AllowanceRevoked, { allowance: s.world.allowance }),
      machine.isIn(s.world.allowance, "revoked"),
      spans({ present: ["allowance.revoke", "allowance.revoke.update"] })),
    s.step("olga can't spend",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 1n, memo: "coffee" }),
      refuses(machine.notFrom, { state: "revoked" }),
      noEvents(),
      spans({ absent: ["allowance.spend.record"] })),
    s.step("olga can't revoke it either",
      s.olga.run(revoke, { allowance: s.world.allowance }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["allowance.revoke"] })),
  ],
});
```

The story's sentences become the step names, so the prose survives as the label on every result. A starting world is
made the same way, by running operations, never by writing rows:

```ts
// blueprint/starting-worlds/funded.ts
export default Blueprint.startingWorld("funded", {
  from: "founded",
  cast: { ada: owner, olga: grantee },
  makes: (s) => [s.ada.run(grant, { organization: s.world.organization, member: s.olga.person, limit: 500n })],
  gives: (s) => ({ organization: s.world.organization, allowance: s.last.allowance }),
});
```

Then the rule that proves the checks mean something: **they must fail on empty handlers.** Before any behaviour is
written, the journey author runs them against the scaffolds and every step that needs behaviour must go red.

```text
$ ortho prove --empty --only "revoke then spend"
journey revoke then spend ✘ 1/3 steps
  ✘ "ada revokes it": BlankReached …
  ✘ "olga can't spend": BlankReached …
  ✔ "olga can't revoke it either": proved by the description
prove ✘ 2 failing
```

A step that passes on an empty handler is not a bug: it tells you that part is already guaranteed by the description.
Here the role keeps olga out with no code at all.

The starting world runs its declared setup calls with the real handlers. Journey steps then call the scaffolds
over HTTP, after the same role and machine checks. See [M1 scaffold proof](../decisions/M1-scaffold-proof.md).

## 5. Compile

`ortho check` compiles the blueprint into the **model**: one JSON, every declaration with its hash, every name written
once. Then each mounted projection renders from it ([`projections.md`](projections.md)).

```text
$ ortho check
model 53d0…28de   things 8   operations 17   journeys 11   blanks 2
blanks  allowance: "what happens at the month's end"   journey "month rolls over": 2 steps unwritten
types ✔  rules ✔  drift ✔
```

What one operation becomes, with nothing written by hand:

| Projection | What `allowance.spend` turns into |
|---|---|
| server | a route on the one Worker: decode, check `grantee`, check the state, call the handler, record the move and event, trace it |
| sdk | `client.allowance.spend({ allowance, amount, memo })`, typed, its errors a union you can match |
| cli | `acme allowance spend --allowance alw_… --amount 120 --memo coffee`, exit code 41 on `AllowanceExceeded` |
| mcp | a tool `allowance_spend`, with the payload's schema and the description as its help |
| docs | a page: who may call it, its states, its errors with codes, its budget |
| builder | `bp.operations["allowance.spend"]` in `generated/builder/bp.d.ts`, so an agent can call it typed ([`builder.md`](builder.md)) |

And the **handler frame**: a generated type that says what the handler is given and what it may return, plus a
scaffold, written once into `src/`, that is yours from then on.

```ts
// generated/api/src/allowance/spend.handler.ts
// Generated from the blueprint. Do not edit.
export type Handler<R = Records | SqlClient.SqlClient | Auth> = Of<typeof declaration, R>;
```

The handler body is the only blank that is code. That is "behaviour is the only freehand".

> **Today.** All six of those projections exist on `origin/layer/3` except the builder's `bp.d.ts`
> (`examples/acme/generated/{api,sdk,cli,mcp,docs,model}`). They are fixed renderers, not mounted plugins
> (`generators/src/modules/render/service.ts:13-24`). The model drops an operation that still has a blank
> (`describe.ts:99`), so an unfinished model looks smaller instead of unfinished.
> **Proposed.** Projections as mounts ([`mounting.md`](mounting.md)); blanks kept in the model and counted.

## 6. The factory

Nobody writes a to-do list. **Tasks are worked out** from the model and the facts, never stored. For the allowance
right now there are three:

```text
$ ortho tasks --of allowance
specify  allowance                    1 blank: "what happens at the month's end"
build    allowance.spend              handler is still the scaffold
prove    allowance.spend              0 of 9 evals in test
```

The **manager agent** picks them up. It is itself a durable run: one Durable Object per mission, keeping its
conversation, while the mission's state lives in the work app's own things (`mission`, `milestone`, `question`, `run`,
`attention`). It turns each task into a bounded brief and starts one **builder** run per brief.

A builder run is a **Pi Durable** run on a Durable Object ([`decisions/H1-agent-harness.md`](../decisions/H1-agent-harness.md)).
Its whole world is the brief:

```text
brief  build allowance.spend
  you may edit    src/allowance/spend.ts            (one file; anything else is tampering)
  declaration     blueprint/things/allowance/verbs/spend.ts
  frame           generated/api/src/allowance/spend.handler.ts
  evals           answer shape, declared errors, machine path, events, who may call, steps, budget, coverage, explainability
  tools           bp (code mode), check, prove --only allowance.spend, telemetry by name
  not given       the journeys: you are judged by them, you don't see them
```

It loops on its own: write, `check`, `prove`, read the trace by name, fix. Then a **trusted scorer**, outside the
builder's sandbox, decides. It checks that nothing but the one file changed, puts the journeys back, runs `check` and
`prove`, and marks the task `solved` only if every eval for the operation passes. Eight of nine is a broken handler
([`decisions/H2-agent-runs-and-benchmarks.md`](../decisions/H2-agent-runs-and-benchmarks.md), H2.7).

**Verdicts are the facts.** Only CI writes them, signed. The task board moves because a verdict appeared, never because
an agent said "done". That is what lets the factory run without you watching.

**Ratchets** keep it climbing. Once `allowance.spend` is green in test, it stays green: a change that turns it red is
refused, not merged. Coverage, budgets and the share of solved tasks only go up. Each run is a step up a hill that
never gives ground.

A blank that only a person can answer, like the month's end, becomes a **question** to you, not a task for a builder.
A step that needs money, a credential or production becomes an **attention**, and waits on your yes.

> **Today.** The work app is declared and compiles: 6 things, 26 operations, 26 MCP tools
> ([`decisions/F5-work-blueprint.md`](../decisions/F5-work-blueprint.md)). Task kinds are designed
> ([`briefs/F4-portal-plan-and-state.md`](../briefs/F4-portal-plan-and-state.md), section 3). The scorer, the record and the
> runners are designed in H2. The agent feature and the work app are being built on `layer/3`; the harness is not
> built. The builder has only the CLI.
> **Proposed.** The builder's code mode and telemetry tools ([`builder.md`](builder.md)); ratchets as a standing rule.

## 7. Executing

A **world** is a running copy of an environment, made for a purpose and destroyed after: its own storage, clock and
cast. `prove` makes one, builds each starting world by running operations, plays every journey, and judges the evidence.

```text
$ ortho prove --env local
world w_4k2 (test, 2 hours)   adapters: none   cast: ada, olga, bob
journeys 11/11 ✔   through: api ✔  sdk ✔  cli ✔  mcp ✔
allowance.spend   evals 9/9 ✔   p95 41ms / 150ms   journeys: spend within an allowance, spend twice with one request, revoke then spend
verdicts written for revision a91c2e0 (signed by CI)   world w_4k2 destroyed
```

What happens underneath, for one call:

1. olga's spend arrives at a door. The role `grantee` is checked before any code of ours runs.
2. The state is checked: `revoked` is not a `from` of `spend`, so it is refused with the generated error.
3. If it gets through, the handler runs inside spans named by the model: `allowance.spend`, `.load`, `.record`.
4. The move and the event are recorded. The answer goes back.
5. Everything it left (caller, answer or refusal, events, spans, logs) is **evidence**, under model names.
6. The nine **evals** read the evidence and judge it against the declaration. Together they are the operation's
   **verdict** at this revision, in this environment. It goes into the **logbook**.

The same journey played through the SDK, the CLI and MCP must leave the same evidence. That is how a client is proved,
not just the server.

> **Today.** Worlds, the nine evals, signed verdicts and the logbook run locally (L2.04 to L2.10). Verdicts are keyed by
> the blueprint's hash, not by the handler code they judged, and the logbook keeps one pass or fail per run. Journeys
> skip the clients ([`delta.md`](delta.md), proof).
> **Proposed.** Journeys through every caller projection; one verdict per operation, keyed by model and handler hash.

## 8. Shipping, watching, and back round

A revision is built once and moved, never rebuilt ([`deployment.md`](deployment.md)).

```text
$ ortho promote --to staging
bundle 7f3e…c21 (rev a91c2e0)   test ✔ 17/17 operations
proving in staging … 17/17 ✔   released @acme/sdk@1.4.0-next.1, @acme/cli@1.4.0-next.1
$ ortho promote --to production
released 1.4.0   (a new operation since 1.3.0: minor)
```

Then **watch** runs the same evals on what production records:

```text
$ ortho watch --env production
allowance.spend   p95 188ms / 150ms ✘   refused 9% (AllowanceExceeded)
```

That red line is not a dashboard to stare at. It is a fact, and a fact makes a task:

```text
$ ortho tasks --of allowance
improve  allowance.spend    over budget in production: p95 188ms against 150ms (watch, last 24 hours)
```

The manager briefs a builder with the trace that shows where the time goes (`allowance.spend.load`, by name). The fix
goes through the same loop: check, prove, verdicts, promote. A change to the description works the same way: change
`spend.ts`, and exactly what uses it goes stale and comes back round. Nothing else does.

> **Today.** `promote`, versioning from the model diff, release to a local npm and Homebrew tap, and `watch` all run
> locally (`cli/src/main.ts:100`, L2.04 to L2.09). `watch` reports; it doesn't make tasks. There is no cloud yet.
> **Proposed.** Watch findings as a task kind; the cloud pass, one destination at a time, with Aaron's yes on each
> credential.

## 9. The whole loop on one page

```text
  idea ── chat, diagram, Figma with your planning agent
   │
   ▼
  description  blueprint/: things, machines, operations, roles, events      blanks = questions
   │           journeys as stories (prose, not executable)
   ▼
  checks       a different agent turns each story into steps; they must fail on empty handlers
   │
   ▼
  compile      model ── projections render: server, sdk, cli, mcp, docs, builder's bp
   │           handler frames + scaffolds in src/ (the only freehand)
   ▼
  tasks        worked out, never stored: specify, build, prove, promote, improve
   │           manager agent ── one bounded brief per task
   ▼
  build        builder (a Pi Durable run): write, check, prove, read traces ── loop
   │           trusted scorer: tamper check, journeys back in, every eval ✔ = solved
   ▼
  execute      a world per run: journeys through every client ── evidence under model names
   │           nine evals ── verdict per operation ── logbook (CI-signed facts; ratchets)
   ▼
  ship         promote the exact bundle: test ─▶ staging ─▶ production; release sdk, cli
   │
   ▼
  watch        the same evals on production ── drift is a fact ── a fact is a task ──┐
   ▲                                                                                 │
   └──────────────────────── back to tasks, or to the description ──────────────────┘
```

Where to go next: the pieces you mount ([`mounting.md`](mounting.md)), the outside world ([`adapters.md`](adapters.md),
[`secrets.md`](secrets.md)), what the description becomes ([`projections.md`](projections.md)), the builder
([`builder.md`](builder.md)), a whole feature written from scratch ([`writing-a-feature.md`](writing-a-feature.md)), and
what is missing today ([`delta.md`](delta.md)).

## Questions this raised

1. **Where a prose journey lives.** A: the same file, `story:` first, `steps:` added later (the story stays as step
   names). B: a separate `journeys/stories/*.md`, turned into a `.ts` file. C: only in the portal. **Recommend A**: one
   file, one name, and the model sees both forms.
2. **Who may turn a story into steps.** A: any agent that is not the builder of the operations it calls. B: a named
   journey-author role, one per project. **Recommend A**, checked by the scorer from git authorship of the run, so the
   rule holds without a fixed role.
3. **A step that passes on empty handlers.** A: allowed, and labelled "proved by the description". B: refused, so
   every step must need behaviour. **Recommend A**: role and state checks are real guarantees, and the label shows them.
4. **What a planning conversation leaves behind.** A: only the blueprint and its blanks. B: the blueprint plus the
   conversation, saved under `design/`. **Recommend A**, with each blank's text carrying the question in plain words;
   the chat is not a source of truth.
5. **Diagrams.** A: read and draw machines only (states and moves). B: also sequence diagrams as journeys. **Recommend
   A first**; a sequence diagram is a picture of a journey, which projections can draw later.
6. **Ratchets.** A: per operation (green stays green; budgets never loosen without a description change). B: also
   project-wide (coverage and solved share never fall). **Recommend both**, per operation first, because it is what
   `promote` already reads.
7. **Watch findings.** A: a task kind `improve`, briefed with the trace. B: an attention to a person first. **Recommend
   A for budgets and refusal rates; B for anything about money or security.**
