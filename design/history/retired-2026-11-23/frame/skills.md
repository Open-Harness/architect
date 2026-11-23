# Skills: how any agent builds on Blueprint

Part of the frame ([`README.md`](README.md)). Proposed, 18 November 2026. The skills, workflows and tools that agents
use to build a Orthograph project, from an idea to a proved, watched operation. The calls made here are recorded in
[`../decisions/K4-agent-skills.md`](../../../decisions/K4-agent-skills.md); the ones that are Aaron's are in
[`skills-questions.md`](skills-questions.md).

The short version. **Skills are core; agents are not.** A skill is a plain `SKILL.md` folder that says how to do one
job on a Blueprint project, in words any agent can follow: Claude Code, Codex, Amp, Pi's coding agent, our own Pi
harness, or a person reading it. Skills ship in `@orthograph/agent-kit` (M3.12), which depends on the builder's tools and
never on `@orthograph/agents` (M4). Every skill names **actions** (`describe`, `brief`, `prove`, `watch` …), never one
agent's tool names, and every action has a `ortho` command, so a skill works in any agent that has a shell. The
part of a skill that quotes the model is generated; the rest is fixed text that ships with the package.

This is not the kit we use to build Orthograph itself (`.agents/skills/`: `threads`, `conductor`, `spike`, `reviewer`,
`hashtags`). That one is about this repository's threads and milestones. This one is what every Orthograph project gets.

## 1. Skills, roles and agents, kept apart

Three words, three different things. Keeping them apart is what lets any agent use the skills.

| | What it is | Where it lives | Example |
|---|---|---|---|
| **Skill** | how to do one job: its trigger, its steps, its done check | `generated/agents/skills/<name>/SKILL.md`, from `@orthograph/agent-kit` and plugins | `fill-a-blank` |
| **Role** | who does it: a bundle of skills, a tool set and the paths it may write | `generated/agents/<form>/<role>.*`, one per form | builder = `fill-a-blank` + `debug-a-failing-eval` + `prove-an-operation`, tools `brief`, `describe`, `run`, `write` (one path) |
| **Agent** | what runs: a model in a loop with tools | outside Orthograph (Claude Code, Codex, Pi) or `@orthograph/agents` runs (M4) | a Claude Code session; a Pi Durable run |

A person in Claude Code uses skills with no role at all: the skill's trigger fires and its steps are followed. The
factory (M3) hands a claimed task to whoever claims it, with the skill named in the brief. An agents run (M4) is
configured with a role. In each case the skill text is the same file.

**The format** is the Agent Skills layout that Claude Code, Codex and Pi's coding agent already read (H1.6: a folder,
`SKILL.md`, a name up to 64 characters and a description up to 1024). The description carries the trigger, because it
is the only part an agent sees before it loads the body. The generated header is the line after the frontmatter
(S10). Extra fields go under `metadata`, which loaders ignore:

```markdown
---
name: why-is-it-slow
description: Find where an acme operation spends its time when it is over budget. Use it when watch or prove says an operation's p95 is over its budget, or someone asks why a call is slow.
metadata:
  ortho-skill: 1             # the template's version inside @orthograph/agent-kit
  ortho-needs: bp-telemetry, commit-span
---
<!-- Generated from the model of acme (model 4c1e…) and @orthograph/agent-kit 0.3.0 (skills/why-is-it-slow). Do not edit. -->
```

## 2. Actions: the only words a skill uses

A skill says "`brief allowance.spend`" or "`prove` the operation", and each agent maps the action to its own tool. One
table, generated into `generated/agents/RULES.md`, holds the mapping per form, the same way the `threads` skill holds
one table of "Threads in your agent" for this repository.

| Action | Does | Claude Code (`ortho mcp`) | Any shell | Pi harness (H1.5) | Today |
|---|---|---|---|---|---|
| `describe` | the model, or one name's slice of `bp.d.ts` | `mcp__ortho__describe` | `ortho describe [name]` | `describe` | **missing**; `ortho check` prints counts and blanks |
| `run` | a code-mode script over `bp` | `mcp__ortho__run` | `ortho run <file.ts>` | Pi code mode, `bp` bound | **missing** (M4.11) |
| `brief` | one job: write, read, do, done when | `mcp__ortho__brief` | `ortho brief <op>` | `brief` | built (`cli/src/modules/brief/service.ts:19-43`) |
| `write` | one whole file, at a path the role allows | `mcp__ortho__write` | the agent's own editor, fenced by `check` | `write` | check 4's `write_handler` (`e2e/layer1/04-agent-writes-a-handler.test.ts:27-56`) |
| `add` | scaffold a declaration with its blanks | through `run` | `ortho add thing\|operation\|read\|journey` | through `run` | built (`cli/src/main.ts:139`) |
| `check` | compile, types, rules, drift | `bp.check()` | `ortho check` | `bp.check()` | built |
| `prove` | worlds, journeys, the nine evals | `bp.prove(…)` | `ortho prove --env local [--only] [--empty]` | `bp.prove(…)` | built; `--empty` is M1.16 |
| `impact` | what a change makes stale, and the version | `bp.impact(file)` | `ortho impact` | `bp.impact(file)` | built (`cli/src/main.ts:169`) |
| `trace` | one trace tree by id | `bp.telemetry.trace(id)` | `ortho telemetry trace <id>` | `bp.telemetry.trace(id)` | built |
| `watch` | the live evals over an environment | `bp.telemetry.*` | `ortho watch --env <name>` | `bp.telemetry.*` | built (`prove/src/modules/watch/types.ts`) |
| `tasks` | the derived tasks | through `run` | `ortho tasks` | through `run` | **missing** (M3.09) |
| `claim` | take a factory task, get its brief and branch | the factory's MCP | `work task claim <task>` | `run.start` from the manager | **missing** (M3.11) |

**The floor is the shell column.** Before `ortho mcp` and code mode exist (M4.11), a skill's steps still run:
`ortho brief`, `ortho prove`, `ortho watch`. When code mode is there, the skill says so in one generated line ("in
code mode, this is one `run`: …"), and the agent takes the cheaper path. A skill never needs a tool only one agent has.

## 3. The catalogue

Twenty-three skills, in the order of the loop. Each says its **trigger**, what it **reads** (the model slice and the
actions), what it **writes**, its **done check**, and its **eval**. "Role" is who normally holds it; anyone may use it
unless the row says "never".

Two rules hold for every eval, the way journeys must fail on empty handlers:

- **It fails with nothing.** Run by H2's `null` runner (no model, no tools), the eval must fail. A skill whose eval
  passes on nothing is testing the fixture, not the skill.
- **It passes with the answer.** Run by H2's `oracle` runner (the reference solution, scripted), it must pass. That
  proves the task is solvable with the tools the skill names.

Scoring is by the trusted scorer (H2.7): `check`, `prove`, a structural diff of the compiled model, or an exact
answer. Only one eval in the catalogue needs judgement (`write-a-journey`), and there the judgement is advice, never
a gate. **The scorer is never a skill.** An agent that judged its own work would be grading itself.

### 3.0 Orient

**`describe-this-app`** (everyone, first). *Trigger:* the start of any session or brief in a Orthograph project; "what is
this app", "what's left". *Reads:* every thing, operation, feature, adapter, store, source and projection by name; the
open blanks; stale verdicts; the tasks; through `describe`, `bp.verdicts()`, `tasks`. *Writes:* nothing. *Done when:*
it can say what is here, what is open and what is stale, in a few lines. *Eval:* twenty questions about acme with
answers read off its model ("which operations can refuse `AllowanceExceeded`", "which blanks are open"), scored exact.

### 3.1 Ideate

**`shape-an-idea`** (planner, with a person). *Trigger:* a person describes something the app should do ("members
should spend company money, up to a limit"), in chat, on a diagram or in Figma. *Reads:* `describe-this-app`; this
app's values and roles to reuse; the questions that turn talk into facts (story section 1: what is the thing, its
states, who may do each move, what is refused, what a retry does). A Mermaid or FigJam state diagram is read as a
machine and drawn back from one. *Writes:* `blueprint/` only: things, machines, operations with `Blueprint.todo` where
the answer is unknown, and journeys as prose stories (`story:`). Never a handler. Each open question is a blank in
plain words; the chat is not kept (S4). *Done when:* `ortho check` compiles, every unanswered question is a blank, and
the person has read the stories back and said yes (a person's step, never the agent's). *Eval:* the allowance
conversation of story section 1, played by a scripted owner on the stand-in model (S14); scored by a structural diff
of the model: a thing with states `active`, `exhausted`, `revoked`; `grant`, `spend`, `revoke`; `spend` refusing
`AllowanceExceeded` and `idempotent: "request"`; `revoked` final; no file under `src/`.

### 3.2 Describe

**`add-a-thing`** (planner). *Trigger:* a new noun with a life of its own. *Reads:* values, roles, existing things,
stores; `add`. *Writes:* `blueprint/things/<thing>/thing.ts` and `machine.ts`. It reuses values rather than making new
ones, and it asks of every text field whether anyone needs to search traces by it, because free text is untraced
unless marked `Blueprint.traced` (section 4.2). *Done when:* `check` passes and `describe <thing>` shows the fields,
states and moves meant. *Eval:* a prose spec to a thing; scored by diffing the compiled model's slice against the
reference.

**`add-an-operation`** (planner). *Trigger:* a new verb on a thing. *Reads:* the thing, its machine, roles, errors,
stores, adapters' calls; `add`, `impact`. *Writes:* `blueprint/things/<thing>/verbs/<verb>.ts`: payload, answer, move,
errors, `allowed`, steps (`database`, `actor`, `call`, `wait`), `idempotent`, budget. *Done when:* `check` passes,
`impact` says minor, a blank scaffold appeared in `src/`, and `brief <op>` prints. *Eval:* a spec to an operation,
scored by model diff; one case plants a payload whose steps write two stores, which must come back split into a
workflow (K3 item 5), not forced into one call.

**`choose-a-home`** (planner). *Trigger:* new data, or data that already lives somewhere. *Reads:* the rule from K3,
the declared stores and the store kinds the mounted hosts supply (what each can do: lists, search, private state), the
sources. *Writes:* nothing; it hands on to `add-a-store`, `add-an-adapter` or the default store. *Done when:* the answer
is one of the default store, a declared store of a named kind, a source behind an adapter, a view, or a field (a
file), with the reason in the rule's words: does Orthograph own the schema and make every write? *Eval:* twelve cases with
fixed answers: Capxul's bench on MariaDB (a source), a ledger in its own database (a store), a cache in KV (never a
home), files in R2 (a field), a search index (a view), a list over actors (a view) and six more.

**`add-a-store`** (planner). *Trigger:* `choose-a-home` said store. *Reads:* the store kinds, the environments.
*Writes:* `blueprint/stores/<name>.ts`, `lives:` on the things that live there, and a `stores:` binding only in an
environment that differs from the default. *Done when:* `check` passes, migrations are generated for each store, and no
operation writes two stores. *Eval:* M1.17's fixture: a second store beside acme's default, both migrate; a planted
two-store operation must be split.

**`add-an-adapter`** (planner). *Trigger:* a source or service we don't own: the bench, Stripe, another app. *Reads:*
its contract (OpenAPI, an ABI, a schema dump, another app's model), the stand-in ladder (Q1 of the frame: the real
software first), the secrets list. *Writes:* the mount at `blueprint/adapters/<name>.ts` (or a package, through
`ortho add adapter`), its calls with declared errors, its secret by name, its stand-in, its conformance test, and
`Blueprint.step.call(...)` in each operation that uses it. Never a migration for it, never a fake of our own. *Done
when:* conformance passes against the stand-in, each use is a `call` step with its own span, and `ortho secrets` names
its secret with no value. *Eval:* M5.13's fixture: a MariaDB dump; the eval then changes a column in the dump, and the
conformance test the agent wrote must go red.

**`mount-a-feature`** (planner). *Trigger:* the app needs what a plugin gives: sign-in, organisations, payments.
*Reads:* the features available, their choices, the needs not yet met. *Writes:* `blueprint/features/<name>.ts`.
*Done when:* `check` passes, the feature's things show with their origin, and its own skills appear in the kit
(section 6.3). *Eval:* mount organizations into a fixture and grant an operation to `holds(...)`; scored by model diff.

**`change-a-declaration`** (planner). *Trigger:* something declared must change: a field, an error, a role, a budget.
*Reads:* `impact`. *Writes:* the declaration, never a journey. *Done when:* the report gives the version bump, the
operations made stale and the journeys to revisit, all matching `ortho impact`; a change that loosens the contract
(a budget raised, a role widened, an error removed) waits for a person ([`skills-questions.md`](skills-questions.md)
Q2). *Eval:* six changes to acme; the agent's reported impact must equal `ortho impact`'s, and the two loosening
changes must stop for a person.

### 3.3 Journeys (never the builder of what they call)

**`write-a-journey`** (journey writer). *Trigger:* an operation no journey calls (a `write:journey` task), or a story
from ideation to finish. *Reads:* the description, the cast kinds this app's roles admit, its starting worlds, the
operations with no journey. *Writes:* `blueprint/journeys/<name>.ts`, `story:` only. *Done when:* `check` counts it,
and each sentence names a cast member, an operation and what anyone could see afterwards. *Eval:* the one with
judgement: the stories are made executable by the `oracle` check writer and scored by which declared errors, moves
and role refusals they reach. A fixed rubric model reports it as advice; the gate is that `check` counts the journey.

**`write-a-starting-world`** (journey writer). *Trigger:* a journey `starts:` a world that doesn't exist. *Writes:*
`blueprint/starting-worlds/<name>.ts`, made by running operations, never by writing rows. *Done when:* `prove` builds
it and its `gives` facts are there. *Eval:* the world builds from `from:`, and lint finds no direct record write.

**`make-a-journey-executable`** (check writer). *Trigger:* a prose journey. *Reads:* the step forms each mounted
projection replays; the checks (`emits`, `refuses`, `noEvents`, `machine.isIn`, `spans({ present, absent })`). *Writes:*
the same journey file, with `steps:`; the sentences stay as step names. Span checks use model names only, include
`<op>.commit` once it exists, and never assert free text on a span (section 4.2). *Done when:* `ortho prove --empty
--only <journey>` turns every step that needs behaviour red, and labels the rest "proved by the description" (S3).
*Eval:* acme's journeys with their steps removed. Scored three ways: red on empty handlers, green on the reference
handlers, and red on each of eight planted bugs (records before it checks, emits the wrong event, skips the request
key …). The share of planted bugs caught is the score.

### 3.4 Build

**`fill-a-blank`** (builder). *Trigger:* a brief, from a `build` task or a person. *Reads:* `brief`, then
`describe <op>`, the handler frame, one neighbouring handler for the house style. *Writes:* the one file the brief
names, with `write`. Never journeys, evals, `generated/` or starting worlds; it cannot read journeys (builder.md
section 6). *Done when:* the brief's "done when" passes. *Eval:* check 4 itself, then H2's suites; scored by the
trusted scorer (one file changed, journeys put back, all nine evals and the journeys pass).

Language plugins ship their own `fill-a-*` skills (generators.md section 8): `language-solidity`'s
`fill-a-contract-blank`, `language-noir`'s `fill-a-circuit-blank`, `react`'s `build-a-screen`. The builder role lists
the one for the blank's language.

**`debug-a-failing-eval`** (builder). *Trigger:* a red `prove`. *Reads:* the prove result and the failing eval's
trace, by name (builder.md section 3, "why did my spend fail"). *Writes:* nothing; it hands back to `fill-a-blank`
with the cause. *Done when:* the failing eval is named with the span that shows why. *Eval:* ten planted bugs; the
agent must name the eval and the step, scored exact.

### 3.5 Prove

**`prove-an-operation`** (builder, check writer, anyone). *Trigger:* before handing work in, or after any change.
*Reads:* `prove` through every projection that replays (`through: api, sdk, cli, mcp`), `bp.verdicts()`. *Writes:*
nothing that persists: a verdict is CI's, signed, never an agent's. *Done when:* `prove` passes locally through every
replay, and the report names the evals and journeys it ran. *Eval:* a revision with one projection broken (the CLI
maps `AllowanceExceeded` to the wrong exit code); the agent must name the projection.

### 3.6 Review

**`review-a-change`** (reviewer, read-only). *Trigger:* a pull request or a run's diff, before it merges. *Reads:* the
diff, the brief, `RULES.md`, the role's write paths, `impact`. *Checks:* only what the brief said changed; nothing under
`generated/` edited; no builder touched a journey; the journey and the handler it judges came from different hands;
no secret; every `Blueprint.traced` has a reason; a loosening change was approved by a person; no operation commits to
two stores. *Writes:* a verdict, pass or block, with numbered findings and their file and line. *Eval:* twenty diffs,
twelve with one planted fault each (a builder edits a journey, a memo marked traced with no reason, a generated file
hand-edited, a role widened); scored on faults found and clean diffs passed.

### 3.7 Promote

**`promote-a-revision`** (manager or person). *Trigger:* a revision is green in an environment. *Reads:* the
environments by name, what `promote` needs to go from each to the next, the ratchets. *Writes:* nothing itself; it runs
`ortho promote --to <env>` for test and staging, and raises an attention for production, which only a person
approves. *Done when:* the same bundle's verdicts are green in the target. *Eval:* three fixtures: staging red (must
refuse), staging green (must promote), production (must raise an attention and never promote).

### 3.8 Watch

**`watch-an-environment`** (operator or manager). *Trigger:* the factory's daily clock, or a person asking "how is
staging". *Reads:* `watch`, `bp.telemetry.counts`, `refusals`, `defects`, `slow`, over the window asked. *Writes:*
findings: facts, not a dashboard (today, watch's task files under `.ortho/tasks/`). *Done when:* each operation seen
has its p95 against its budget, its refusal rate against the last window, and any new defect. *Eval:* recorded
telemetry (a Collector's traces and metrics files) with three planted findings: one operation drifting over budget, a
burst of `NotAllowed` strangers that left no span, one new defect. All three must be reported.

**`why-is-it-slow`** (operator, builder). *Trigger:* an over-budget finding. *Reads:* `slow`, then one trace tree of a
slow call. *Writes:* a finding naming where the time goes: one step, the commit, version races, or the handler's own
code (the operation's width less its children's). *Done when:* it names exactly one of those, with a trace id. *Eval:*
four fixtures: a slow `load` step, a slow commit, contention (`attempt` above 1 after a `conflict`), slow handler code.
Section 4.1 says what it can tell apart before the commit span exists.

**`who-is-refused`** (operator). *Trigger:* a refusal-rate finding, or "who is being turned away". *Reads:*
`bp.telemetry.counts` (every call, from `ortho.calls`), by operation, refusal and principal kind; a sample trace only
for refusals that opened a span. *Writes:* a finding. It never names a person: the metric carries none. *Done when:*
counts are given per refusal, including `InvalidPayload` and `NotAllowed`. *Eval:* 400 strangers refused `NotAllowed`
(no spans) and 3 `AllowanceExceeded`; both must be reported. A reader of spans alone reports 3, and fails.

**`find-a-defect`** (operator). *Trigger:* `defects()` is not empty. *Reads:* defects grouped by fingerprint, one sample
trace each. *Writes:* a finding: fingerprint, operation, first and last seen, count, sample trace id. *Eval:* two
fingerprints over many traces; scored exact.

### 3.9 Fix

**`turn-a-finding-into-a-task`** (manager, or a person). *Trigger:* a finding. *Reads:* the finding; the rule from S7
(money and security go to a person). *Writes:* in M3, nothing by hand: tasks are derived by the factory from the
finding (M3.09), and this skill is the manager's judgement on top: which kind (`improve`, `fix`), or an attention, and
what the brief carries (trace ids and names, never values copied from a trace). Before M3, a task file. *Done when:*
every finding is one task or one attention, none twice. *Eval:* ten findings; scored exact on kind and destination.

**`fix-from-a-finding`** (check writer, then builder). *Trigger:* a `fix` or `improve` task. *Steps:* reproduce first.
A defect gets a journey step or eval fixture that goes red, written by a check writer, not the builder. A budget gets a
local measure: a `run` script that calls the operation in a world and reads the `performance` eval. Then the builder
runs `fill-a-blank` on the task's brief, which carries the trace. *Done when:* the reproduction was red before and is
green after, and the next watch after the promote no longer finds it. *Eval:* a planted regression in acme (a `load`
step that reads every allowance); scored by the reproduction's red-then-green and the scorer.

### 3.10 The roles, as bundles

| Role | Skills | Tools | May write | Never |
|---|---|---|---|---|
| planner | `describe-this-app`, `shape-an-idea`, `add-a-thing`, `add-an-operation`, `choose-a-home`, `add-a-store`, `add-an-adapter`, `mount-a-feature`, `change-a-declaration` | `describe`, `run`, `add`, `write` | `blueprint/` except journeys' `steps:` | `src/` |
| journey writer | `write-a-journey`, `write-a-starting-world` | `describe`, `write` | `blueprint/journeys/`, `blueprint/starting-worlds/` | `src/` |
| check writer | `make-a-journey-executable`, and the reproduction in `fix-from-a-finding` | `describe`, `run`, `write` | journeys | `src/` |
| builder | `fill-a-blank` (and its language form), `debug-a-failing-eval`, `prove-an-operation`, `fix-from-a-finding` | `brief`, `describe`, `run`, `write` (one path) | the brief's one path | journeys, evals, `generated/` |
| reviewer | `review-a-change` | read-only `run` | nothing | any file |
| operator | `watch-an-environment`, `why-is-it-slow`, `who-is-refused`, `find-a-defect` | read-only `run`, `watch` | nothing | any file |
| manager | `turn-a-finding-into-a-task`, `promote-a-revision` | the factory's operations | tasks and briefs | `src/`, `blueprint/` |

This replaces the skill table in [`generators.md`](generators.md) section 3. Its names map like this: `read-telemetry`
became the four watch skills; `prove-and-promote` became `prove-an-operation` and `promote-a-revision`;
`turn-drift-into-tasks` became `turn-a-finding-into-a-task`; the rest kept their names.

## 4. Four inputs the skills must cover

### 4.1 The commit has no span yet (O2 gap 1, M1.18)

**Today.** `store.commit(...)` runs inside the operation's span but not as a span of its own
(`packages/language-effect/src/modules/handler/service.ts:71`), and a rerun after `Conflict` is a second operation span
with nothing saying why (the retry loop at `service.ts:91-100`).

**Who reads it.** `why-is-it-slow` and `watch-an-environment`, through `bp.telemetry.slow` and `trace`; the check
writer, through `spans({ present: ["allowance.spend.commit"] })`.

**The tool.** `slow()` gains two fields: `worstStep` may be `"commit"` or `"handler"` as well as a step name, and
`retried` is the share of calls whose operation span carries `attempt` above 1. A trace tree shows `<op>.commit` with
`commit.outcome` and `commit.writes` as counts.

**Until it lands.** The skill's template has a section gated on `commit-span` (section 6.2). Without it, the skill says
what it can and can't tell: the operation's width less its steps' widths is "the commit or the handler's own code,
which this app can't yet tell apart", and two operation spans for one request mean a version race. Its eval expects
that answer for the slow-commit and contention fixtures until the gate opens.

### 4.2 Free text is traced by default (O2 gap 2, M1.19)

**Today.** Visibility is public by default (`packages/orthograph/src/modules/visibility/types.ts:1`) and public fields
become span attributes, so acme's `memo` is on every trace.

**Who reads it.** Every skill that reads traces, the "leaks nothing" eval (S28), and every skill that writes a
declaration or a report.

**The rule the skills state.** A trace never holds free text unless the field is marked `Blueprint.traced`. So:
- trace-reading skills never expect text attributes. A skill that needs what was written reads the event or the record
  (`w.record(...)` in a local world), never the span;
- `add-a-thing` and `add-an-operation` mark a text field traced only with a reason, and `review-a-change` checks it;
- `make-a-journey-executable` asserts text on events, never on spans;
- `turn-a-finding-into-a-task` copies trace ids and model names into a brief, never attribute values.

**The eval.** "Leaks nothing" is a built-in eval, not a skill: for every operation with a `Blueprint.text()` field not
marked traced, no span attribute and no log annotation in the world's traces holds it. Skills rely on it; none
re-implements it.

### 4.3 Refusals before the span leave no count (O2 gap 3, M1.20)

**Today.** `InvalidPayload` (`service.ts:104-105`) and `NotAllowed` from `Access.check` (`service.ts:46`) both happen before
the operation's span opens (`service.ts:83`). No `Metric` is used anywhere in `packages/`. `watch` counts calls from
spans, so a stranger turned away leaves nothing it can count.

**Who reads it.** `who-is-refused` and `watch-an-environment`.

**The tool.** `bp.telemetry` gets a counter beside its traces. A `MetricSource` sits next to `TraceSource`
(`packages/prove/src/modules/telemetry/types.ts:55`): `FileSource` reads the local Collector's metrics file, and
`AxiomSource` the `<project>-<env>-metrics` dataset (O1 line 356). Then:

```ts
// generated/builder/bp.d.ts, the Telemetry part, as changed here (sketch)
counts(o: { since: string; operation?: Operation; env?: Env }): Array<{
  operation: Operation; outcome: "answered" | "refused" | "defect";
  refusal?: string; principalKind: "anonymous" | "person" | "agent" | "service" | "system"; count: number;
}>;                                                           // ortho.calls: every call, span or not
refusals(o: { since: string; env?: Env }): Array<{ operation: Operation; tag: string; count: number; sample?: string }>;
                                                              // counted from ortho.calls; a sample only when a span opened
slow(o: { since: string; env?: Env }): Array<{ operation: Operation; p95: number; budget: number; over: number;
  worstStep: string; retried: number }>;                      // p95 from ortho.call.duration; worstStep from spans
```

`calls()` stays as it is in [`builder.md`](builder.md) section 2, and means what it lists: calls that opened a span,
each with its trace id. A skill that counts uses `counts`; a skill that wants a trace to read uses `calls`.

**Until it lands.** `who-is-refused` says its counts are "calls that got past the role check and decoded", and its eval
expects that caveat.

### 4.4 Stores and sources (K3, M1.17 and M5.13)

**Who reads it.** `choose-a-home`, `add-a-store`, `add-an-adapter`, `add-an-operation`, `review-a-change`.

**The tool.** `bp.model` gains the two lists, and a thing's `lives` names a store:

```ts
model: {
  stores: Record<string, { kind: string; lists: boolean; binding: Partial<Record<Env, string>>; migrations: number }>;
  sources: Record<string, { adapter: string; calls: string[]; standIn: string; emits: string[] }>;
  things: Record<string, { /* … */ lives: string }>;        // a store's name; "default" for the project's own
};
```

`check`'s findings carry the compiler's refusals by rule (`two-stores`, `list-over-kind`), so a skill reads them as
data, not prose. The data map (`generated/data/map.md`, M5.06) is what `describe-this-app` quotes.

## 5. Workflows

Who does each step:

- **Person**: the owner, or anyone on the team.
- **Outside agent**: Claude Code, Codex, Amp or Pi's coding agent, with the kit and `ortho mcp` (or a shell).
- **Factory**: `@orthograph/work` (M3). Its manager derives tasks and hands them out. Its workers are people, who may
  use an outside agent (M3), or agents runs (M4, `workers: agents`).

A step's hand-off is always a fact (a compiled model, a red or green prove, a verdict, a finding), never a message
saying "done".

### W1. An idea to a proved operation

| # | Step | Skill | Who | Hand-off |
|---|---|---|---|---|
| 1 | Talk it through | `shape-an-idea` | person and an outside agent as planner | `blueprint/` compiles, with blanks and stories |
| 2 | Answer the blanks, read the stories back | none | person | blanks closed; the person's yes |
| 3 | Fill the declarations | `add-a-thing`, `add-an-operation`, `choose-a-home` | planner: outside agent, or a `specify` task | `check` green, scaffolds in `src/` |
| 4 | Make each story executable | `make-a-journey-executable` | check writer: a different agent from step 6's | the journey file |
| 5 | Show the checks mean something | `prove --empty` | check writer | every behaviour step red |
| 6 | Fill the handlers | `fill-a-blank` | builder: a claimed `build` task (M3), or an agents run (M4) | prove green locally |
| 7 | Judge it | the scorer (code), then `review-a-change` | CI, then a reviewer that wrote neither | pass |
| 8 | The verdict | none | CI only, signed | the task closes by itself |

### W2. A revision to production

| # | Step | Skill | Who | Hand-off |
|---|---|---|---|---|
| 1 | Test to staging | `promote-a-revision` | the manager, or a person | staging verdicts |
| 2 | Staging to production | `promote-a-revision` raises an attention | a person approves; CI promotes | production verdicts, a release |

### W3. A watch finding back to a fix

| # | Step | Skill | Who | Hand-off |
|---|---|---|---|---|
| 1 | Watch | `watch-an-environment` | the factory's daily clock, or a person | findings |
| 2 | Explain | `why-is-it-slow`, `who-is-refused`, `find-a-defect` | operator: outside agent or agents run | a finding with a trace id |
| 3 | Route | `turn-a-finding-into-a-task` | manager; money and security go to a person (S7) | an `improve` or `fix` task, or an attention |
| 4 | Reproduce | `fix-from-a-finding`, first half | check writer | a red reproduction |
| 5 | Fix | `fix-from-a-finding`, then W1 steps 6 to 8 | builder | a verdict |
| 6 | Ship and look again | W2, then W3 step 1 | as there | the finding is gone |

### W4. Changing the contract

| # | Step | Skill | Who | Hand-off |
|---|---|---|---|---|
| 1 | Change the declaration | `change-a-declaration` | planner; a loosening change waits for a person (Q2) | `impact`: version, stale operations |
| 2 | Revisit the journeys it names | `write-a-journey`, `make-a-journey-executable` | journey and check writers | journeys red where behaviour must change |
| 3 | Refill what went stale | `fill-a-blank` per stale operation | builders | verdicts |

### W5. Data in a new place

| # | Step | Skill | Who | Hand-off |
|---|---|---|---|---|
| 1 | Decide store or source | `choose-a-home` | planner, a person on a source we don't own | the answer and its reason |
| 2a | A store | `add-a-store` | planner | migrations per store |
| 2b | A source | `add-an-adapter` | planner; the credential is a person's (secrets) | conformance green against the stand-in |
| 3 | Use it | `add-an-operation` with a `call` step, then W1 from step 4 | as there | a verdict |

### Who does what, by milestone

| | Today to M2 | M3 | M4 |
|---|---|---|---|
| Tasks | a person decides | derived by the factory | the same |
| Planner, writers, builder | a person with an outside agent and the kit | people (and their outside agents) claim tasks; the brief names the skill | also agents runs, with a role |
| Scorer and verdicts | CI | CI | CI |
| Production | a person | a person | a person |

## 6. Tools, generated and hand-written

### 6.1 Which is which

**The rule: shapes are generated, behaviour is written.** What varies with the model (names, unions, which operations
exist, what a skill quotes) is rendered on every compile. What a tool does is code in a Orthograph package, the same for
every project, tested once.

| Piece | Kind | Made from | Where |
|---|---|---|---|
| `bp.d.ts`: operations, refusals, starting worlds, environments, `Through`, stores, sources | generated | the model, mounts, environments | `generated/builder/` |
| skills' model sections (open blanks, operations with no journey, stores, budgets) | generated | the model, into templates | `generated/agents/skills/` |
| role definitions, one per form | generated | role templates, the tool names per form | `generated/agents/{claude,pi}/` |
| `RULES.md`, with the actions table per form | generated | the mounted languages, lint, the forms chosen | `generated/agents/RULES.md` |
| skill names as identifiers | generated | the kit | `generated/agents/skills.ts`, so `Blueprint.agent({ skills: [skills.fillABlank] })` takes no strings |
| the brief | generated | the model, the journeys | printed by `brief`; also `generated/builder/` |
| `describe`, `run`, `brief`, `write` (`BuilderTools`) | hand-written | `@orthograph/cli` | one module, three doors: `ortho mcp`, the shell, the harness |
| the code-mode sandbox and `bp`'s host functions | hand-written | `@orthograph/cli` | QuickJS (builder.md section 2) |
| the telemetry summaries (`counts`, `refusals`, `defects`, `slow`) | hand-written | `@orthograph/prove` over `TraceSource` and `MetricSource` | pure functions, summarised before the sandbox |
| the scorer | hand-written | `@orthograph/agents` bench (H2.7) and CI | never a skill, never in the agent's reach |
| skill templates' fixed text, and each skill's eval | hand-written | `@orthograph/agent-kit` | `templates/skills/<name>/`, `evals/<name>/` |
| plugin skills | hand-written template, generated output | the plugin's `agents/skills/`, filled from the mount | `generated/agents/skills/<mount>-<name>/` |
| the project's own skills | scaffolded, then yours | `ortho add skill <name>` | `.agents/skills/<name>/` |

### 6.2 How the kit is generated

The `agents` projection (S11) is mounted by `ortho new` in every project, from `@orthograph/agent-kit`:

```ts
// blueprint/projections/agents.ts (Scaffolded by ortho new. Yours from now on.)
import { Blueprint } from "orthograph";
import agentKit from "@orthograph/agent-kit";

export default Blueprint.use(agentKit, (k) => [
  k.choose(k.choices.for.claudeCode, k.choices.for.pi),   // the neutral form is always rendered (S12)
  k.choose(k.choices.voice.spoken),
]);
```

Each template is fixed text with **slots**, and with sections **gated** on what the project has. A gate names a
capability the model or the runtime reports (`commit-span`, `metrics`, `code-mode`, `stores`, `factory`). A section
whose gate is shut renders its floor instead: the shell commands rather than `run`, or "this app can't yet tell the
commit from the handler". So one template serves acme today and acme after M1.18 without forking. The skill's
`metadata.ortho-needs` lists its gates, so a reader sees why a section reads as it does.

On every `ortho generate` and `ortho check`, the projection renders `generated/agents/`. The drift rule
(`no-edited-output`) covers it like any output, and the links (`.agents/skills/ortho`, `.claude/skills`,
`.claude/agents`) point into it ([`generators.md`](generators.md) section 2).

### 6.3 Versioning, and keeping in step

- **Two versions in every header:** the model's hash and `@orthograph/agent-kit`'s version with the template's path. A
  skill's hash (of its rendered file) goes in every run record (H1.6), so two runs are compared only on equal skills,
  or the record says they differ.
- **Kit changes are not app changes.** `impact` lists them on their own line ("kit: `why-is-it-slow` gained its commit
  section"), and they never move the app's version.
- **The model drives the kit.** Add an operation and `describe-this-app` and `fill-a-blank`'s open blanks change; add
  a store and `choose-a-home` lists it; change a budget and the watch skills quote it. The table in
  [`generators.md`](generators.md) section 3 is the full list.
- **Upgrading `@orthograph/agent-kit`** rewrites every template-derived file in one generate, with its diff in the pull
  request, like any dependency bump. Its version is pinned exactly, like every `@orthograph/*` package.
- **Plugins version their own skills.** A plugin's skills move with the plugin's version. Two mounts never collide,
  because each skill is prefixed with its mount's name.
- **The evals run where the templates live.** `@orthograph/agent-kit`'s CI runs every skill's eval against acme with
  the `null` and `oracle` runners and the stand-in model on each change. Real-model runs are H2's bench, off the gate,
  inside the spending cap. A project runs no skill evals; it runs the drift check.

### 6.4 The switch-over test

The kit is right when this repository could use it. Once Orthograph's own design is a Orthograph model (the factory, F5), our
`reviewer` becomes the generated `review-a-change` plus the reviewer role, and `spike` becomes a skill that ships as is.
What stays hand-written is ours alone: `threads`, `conductor` and `hashtags`, which are about how Aaron runs this
repository's threads, and the voice he wants (the `voice` choice).

## 7. Where it lands

| Piece | Lands in | Needs |
|---|---|---|
| The catalogue's templates and evals, the forms, `RULES.md` | M3.12 (`@orthograph/agent-kit`) | the builder projection's `bp.d.ts` shape; the floor commands |
| Gated sections for the commit span, metrics, stores | M3.12, rendered from whatever M1.17 to M1.20 delivered | M1.17 to M1.20 |
| `MetricSource`, `counts`, the new `slow` fields | with M1.20 for the reader; in `bp` with M4.12 | M1.20 |
| `ortho describe`, `ortho run`, `ortho mcp` | M4.11 | M4.10 |
| `tasks`, `claim`, the brief naming its skill | M3.09, M3.11 | the factory |
| Skill names as identifiers in `Blueprint.agent` | M4.10 | M3.12 |

When the first skills reach a project is Aaron's call, because it decides what "workable" at M2 includes
([`skills-questions.md`](skills-questions.md) Q1).

## 8. Open risks

- **Triggers are only descriptions.** An agent loads a skill when its description matches. A poor description means a
  skill that never fires. Each eval also runs once with the skill listed but not named in the task, and counts whether
  the agent loaded it.
- **The floor is weaker than code mode.** Before M4.11, the watch skills read `ortho watch` text, not structured data.
  The text is stable and tested (`prove/src/modules/watch/watch.test.ts`), which is enough for the floor.
- **An outside agent with a shell can read the journeys.** The kit can't fence that by words. Q3 in
  [`skills-questions.md`](skills-questions.md) is how hard to fence it.
- **Twenty-three skills is a lot to keep honest.** Each has an eval that must fail on nothing and pass on the answer;
  a skill without both doesn't ship.
