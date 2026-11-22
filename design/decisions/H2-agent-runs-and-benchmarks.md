# H2: agent runs, their record, and Architect's internal benchmarks

Written 16 November 2026 by a 📐 designer thread, on Aaron's spoken request of that day: put the Anthropic agent in its own
package, open it to the open models behind his second key ("Command Code"), and plan how runs are collected and analysed to
produce internal benchmarks. Status: **proposed**; nothing here is built. The architecture is the building agent's to decide
(`AGENTS.md`, "Who decides"), so this records the calls and the evidence. Questions only Aaron can answer are at the end.

**Naming.** The brief asked for `D3-agent-runs-and-benchmarks.md`. `D3` is already the build plan's layer-2 decision
(destinations, versions, secrets; `build-plan.md`, layer 2), and the harness decision before this one took the `H` series for
that reason (`H1-agent-harness.md`, "Naming"). Two records called D3 would make every later "D3 item 2" ambiguous, so this is
**H2**. Its calls are H2.1, H2.2 and so on.

**Relation to H1.** H1 (on `main`, commit `2c0ff63`) already decides items 1 and 2 of the brief: the package
`@architect/agent` (Superseded by M4-agents, 22 November 2026: `@orthograph/agents`.), Pi Durable 1.5.0 behind an Effect seam, providers through `pi-ai`, Anthropic and Command Code, the copy
sandbox, the telemetry adapter, and a first sketch of the run record (H1 section 12). H2 does not reopen those without new
evidence. It (a) adds new evidence on Command Code and the Agent SDK, (b) changes one thing in H1's order, floor first (H2.1),
and (c) decides items 3 and 4, which H1 only sketched: where runs live, their shape, how they are compared, the task set, the
runner, the report and the baseline.

## 1. Unknowns, and what settled them

| # | Unknown | Settled by | Answer |
|---|---|---|---|
| U1 | Does the Agent SDK give us a run's numbers without Pi? | `@anthropic-ai/claude-agent-sdk` 0.3.316 `sdk.d.ts:5962-6111` (as installed) | Yes. The result message carries `num_turns`, `duration_ms`, `duration_api_ms`, `total_cost_usd` (an estimate, cumulative per `query()`), and `modelUsage: Record<model, ModelUsage>` with input, output, thinking, cache read and cache write tokens (`:1484`). The doc comment says to prefer `modelUsage` over `usage` for accounting. |
| U2 | Does the SDK keep a transcript we can store? | `sdk.d.ts:693-702, 920` | Yes: a session is `{sessionId}.jsonl` on disk, or goes to a `sessionStore` we pass. So the SDK runner can keep the transcript with no Pi at all. |
| U3 | Can the SDK reach an open model? | H1 section 5 (D); `sdk.d.ts:32, 7272` | No, not directly. It speaks Anthropic Messages only; providers are `firstParty`, `bedrock`, `vertex`, `foundry`, `gateway` and the like. A gateway alias can be priced only from managed settings. Command Code's `/messages` route serves Claude only. H1 stands: open models go through Pi (`pi-ai`). |
| U4 | Is Command Code what H1 says? | Re-read today: `commandcode.ai/docs/provider-api`, `/models`, `/docs/resources/pricing-limits`, `/usage-limits`, `/zdr` | Yes, with **three corrections to H1 section 6**: (1) the free model ids are `glyph-cluster:free` (256K context, 1000 requests a day) and `inkling-2-small:free` (1M context, 200 a day); the page slugs use a hyphen, the API ids a colon; both need $1 of credit on the account to start. (2) The docs **do not name a key variable**; `CMD_API_KEY` is the placeholder in the header example. Our name is our own (H2.4). (3) The free models **do not run under zero data retention** and the provider may keep and train on prompts. Tool calling on `/chat/completions` is **not stated** for any model; `/responses` passes `function` tools through. Every stream reports usage at the end; cost per request is not returned (Studio shows it), so we price from the `/models` table. |
| U5 | How long and how much is one run today? | `design/evidence/L1.60/01-e2e-layer1.txt:27` | Check 4 on Sonnet: 18 turns, 24 s, $0.05; the whole test, with prove, 40 s. One `prove` on acme takes about 8 s (check 3's rows, same file). |
| U6 | What tasks exist? | `find examples -path '*handlers*'`; `cmp` of starter against acme | acme has 12 handler files; starter has 9, and 8 of them are byte-identical to acme's (only `organization/create.ts` differs). acme has 11 journeys, starter 5. Every operation has at least one journey, or the coverage eval fails. |
| U7 | What planted breaks exist? | `examples/acme/test/fixtures/evals/`, `e2e/layer1/03-every-eval-catches-its-break.test.ts:8-18` | Nine, one per eval. Six are a broken `allowance/grant.ts` (answer shape, declared errors, machine path, events, steps, explainability); performance is a slow grant (a review, not a failure); who-may-call breaks `generated/server/main.ts` (not a handler); coverage adds a verb with no journey. |
| U8 | Can Command Code's free models call tools through `pi-ai`? | Not settled: needs the key | **Spike S-H2a** (section 9). |
| U9 | How many scorings can run at once on one machine? | Not settled: needs measuring | **Spike S-H2b** (section 9). Each prove starts workerd on its own port and a Collector in Docker. |

## 2. What changes in H1, and why (H2.1)

**H2.1 Floor first: extract check 4 as the first runner, with the record and the scorer, before Pi.** H1 puts the run record and
the benchmark at A5, behind the Pi seam (A1), models (A2), tools (A3) and telemetry (A4). None of the record, the task set or the
scorer needs Pi: check 4 already runs a real agent, already scores with `check` and `prove`, and the SDK already reports turns,
tokens, cost and a transcript (U1, U2). So a new step **A0** moves check 4's harness into `@architect/agent` (Superseded by M4-agents, 22 November 2026: `@orthograph/agents`.) behind a `Runner`
interface with four kinds, and benchmarks on Anthropic run from A0. Pi arrives as the second real runner at A1 and A2, for the open
models, and plugs into the same record.

```ts
// packages/agent/src/modules/harness/types.ts (sketch)
export type RunnerKind = "sdk" | "pi" | "oracle" | "null";
export interface Runner {
  readonly kind: RunnerKind;
  /** Runs one agent on one task in its sandbox; returns what it did. Never scores: scoring is a separate, trusted stage. */
  readonly run: (task: Task, config: RunConfig, sandbox: Sandbox) => Effect.Effect<RunOutcome, AgentError, Scope.Scope>;
}
```

- `sdk`: check 4's code, moved: Agent SDK, `tools: []`, our tools over in-process MCP, OTel to the Collector. Anthropic only.
- `pi`: H1's seam (A1 to A5). Any `pi-ai` provider, Command Code included.
- `oracle`: writes the handler as it is in git. **No model, $0.** Every task must score solved under it, or the task or the scorer is wrong.
- `null`: writes nothing (leaves the blank). Every task must score not solved under it.

The oracle and null runners are the bench's planted checks, the same idea as check 3 for the evals. They need no key, so **they run
in CI on every change to the bench, the evals or the examples**: a task that stops being solvable, or a scorer that passes a blank,
fails the pull request.

What does **not** change: H1's package, its Nx tags and boundaries, Pi 1.5.0 behind the seam, the copy sandbox, the telemetry adapter,
the Docker sandbox later. H1's options table (A to F) stands, including its weighing of Pi's agent core (C, a loop with no durability)
against Pi Durable (B) and the durable-agent idea in `later.md`; nothing found today changes it.

## 3. The package, as H1 sets it, with H2's modules

`packages/agent`, `@architect/agent` (Superseded by M4-agents, 22 November 2026: `@orthograph/agents`.), tags `scope:agent`, `env:build`, `layer:2`; depends on `blueprint`, `compiler`, `prove` and the
`target-effect` interfaces. Never in production. H1's modules, with the run and bench modules made concrete here (each in the six
slots, no file over about 250 lines):

| Module | Owns | From |
|---|---|---|
| `harness` | `Runner` and its four kinds; Pi's seam in `internal/pi/`, the SDK in `internal/sdk/` | H1, H2.1 |
| `models` | `{ provider, model, thinking }` registry, price tables | H1.4 |
| `tools`, `skills`, `sandbox`, `telemetry` | as H1 | H1.5 to H1.8 |
| `runs` | the `RunRecord` schema, the run folder, the store (H2.2, H2.3) | H2 |
| `tasks` | tasks derived from a project and a variant (H2.6) | H2 |
| `score` | the trusted scorer: tamper check, `check`, `prove`, parse verdicts (H2.7) | H2 |
| `suite` | the matrix, repeats, concurrency, the spend ledger, resume (H2.8, H2.9) | H2 |
| `report` | comparison, intervals, the baseline diff, the HTML page (H2.10, H2.11) | H2 |

H1 had one `bench` module; it would pass 250 lines, so it is four (`tasks`, `score`, `suite`, `report`).

**Where the entry lives.** Internal benchmarks are not a user command. A new private Nx project **`benchmarks/`** at the repository
root (beside `e2e/`, tag `env:build`, never published) holds `main.ts` (the one entry file: reads argv and env, prints, exits), the
suite definitions and the committed baselines. It runs as `pnpm nx run benchmarks:bench -- --suite core`. H1's `architect agent run`
for one run stays H1's call; `architect agent bench` from H1's A5 row moves here.

## 4. Providers (item 2): H1 stands, with H2's additions

- **H2.4 The key is named, never read by us.** A provider config names a secret; the runner's entry (`benchmarks/main.ts`) is the only
  file that reads it from the environment, and only by that name. Names: `ANTHROPIC_API_KEY` (as check 4), and **`COMMANDCODE_API_KEY`**
  (ours; the service names none, U4). A missing key skips that provider's cells with a printed reason, as check 4 does in CI. Each
  value is held in memory and **redacted by exact match** from every transcript, log and trace before a run folder is written, so a
  model that echoes a header cannot leak it to disk.
- **H2.5 Which runner a config uses is fixed by its provider.** `anthropic/*` runs on `sdk` until A2, then on both `sdk` and `pi`, and the
  pair is itself a benchmark (the same model, Claude Code's loop against ours). `commandcode/*` runs only on `pi`. Command Code's
  Claude models through its `/messages` route are not used: the same models are reachable direct, and a second price for the same
  model would only confuse the comparison.
- Free models first. `glyph-cluster:free` and `inkling-2-small:free` run the mechanics at $0, within 1000 and 200 requests a day.
  Because they are outside zero data retention and may be trained on, they get only Architect's own open code, which is all a bench
  task contains. A paid model runs only under the spend ledger (H2.9).

## 5. Collecting runs (item 3)

### H2.2 The shape: one folder per run, with a small typed record

```text
benchmarks/.architect/runs/<suite>/<run id>/      gitignored; the run's whole evidence
  record.json        RunRecord: the numbers, hashes and verdicts (an Effect Schema in modules/runs/types.ts)
  transcript.jsonl   every message, tool call and tool result, redacted (SDK session or Pi entries, normalised)
  pi.sqlite          the Pi run's own store, when the runner is pi (H1.9: the source of truth for that run)
  spans.jsonl        the run's and the scorer's spans, read back from the Collector by trace id
  logs.jsonl         their OTel logs
  output/            the files the agent wrote, and output.diff against the task's starting copy
  score/             check.txt, prove.txt, and verdicts.json parsed from them
```

The record extends H1 section 12. Additions are marked `// H2`:

```ts
RunRecord = {
  id, suite, startedAt, endedAt, ms,
  repo:     { commit, dirty: false },                                  // H2: a dirty tree never makes a baseline
  task:     { id, project: "acme" | "starter", operation, variant,     // H2: variant (H2.6)
              brief: { hash }, startHash },                            // H2: the starting copy's tree hash
  agent:    { runner: "sdk" | "pi" | "oracle" | "null",                // H2
              provider, model, thinking, versions: { sdk?, pi? },
              systemPromptHash, tools: [{ name, schemaHash }], skills: [{ name, hash }],
              limits: { maxTurns, maxUsd, wallMs }, sandbox: "copy" },
  turns:    [{ n, ms, stop, usage: { input, output, thinking, cacheRead, cacheWrite }, toolCalls: [{ name, argsHash, ms, isError }] }],
  totals:   { turns, toolCalls, toolErrors, input, output, usd, usdSource: "provider" | "table", restarts },  // H2: usdSource
  outcome:  { status: "done" | "failed" | "budget" | "turns" | "timeout" | "interrupted", reason? },
  friction: { deniedReads, checkRunsBeforePass, checkFailures },       // H2 (H2.10)
  verdicts: { tampered: false, check: { pass, findings },
              prove: { pass, evals: { passed, of: 9, failed: [evalName] }, journeys: { passed, of, failed: [name] }, reviews: [..] } },
  solved:   boolean,                                                   // H2: tampered false, check pass, prove pass
  traces:   { run, score },
}
```

Text (prompts, the brief, messages) is never in `record.json`, only its hash; it lives in `transcript.jsonl` beside it. That keeps a
record small enough to commit a summary of, and safe to share.

### H2.3 Where: files now, the cloud store at A6

| | A. Files per run (above) | B. Files, plus a local SQLite index | C. D1 and R2 locally (Miniflare) | D. Self-hosted trace UI (Langfuse, Phoenix) | E. A SaaS (Braintrust, W&B, LangSmith) |
|---|---|---|---|---|---|
| Works now, local, no cloud | ✅ | ✅ | ⚠️ needs a Worker around it, before L2.01 exists | ⚠️ Langfuse needs Postgres and ClickHouse in Docker | ❌ paid, and needs Aaron's yes |
| Comparing 1000 runs | ✅ read every `record.json` (small) in a second or two | ✅ SQL | ✅ SQL | ✅ its own UI | ✅ |
| Holds traces, transcripts | ✅ beside the record | ✅ | ✅ R2 | ✅ traces only | ✅ |
| Reversible | ✅ files are the source; any index is rebuilt from them | ✅ | ⚠️ | ⚠️ | ❌ data elsewhere |
| Fits what's there | ✅ prove's Collector already writes files; `.architect/` is the local-state folder | ✅ | ✅ matches H1's A6 target | ❌ a second trace store beside the Collector | ❌ |

**Recommendation: A now, B only if reading the records gets slow, C at A6.** Files are the floor and the source of truth; an index is a
cache rebuilt from them. At A6 the same record goes to R2 with a D1 index (H1 section 11), written by the same `runs` store through a
second implementation of one `RunStore` service, so nothing above it changes. No trace UI is added: the report draws each run's
timeline from `spans.jsonl` (H2.11), and the portal page for runs is in `later.md` for layer 2.

**Trace capture.** One Collector per suite, not per run: `Collectors.start(dir)` once, every run and every scoring exports to it, and
each run reads its own spans back with `collector.traces([{ trace, parent }])` by its trace id (the API prove already has,
`packages/prove/src/modules/telemetry/types.ts:40`). The SDK runner sets `OTEL_*` as check 4 does; the Pi runner goes through H1.8's adapter.

## 6. The task set (item 4)

### H2.6 Tasks are derived, never hand-written

A task is `(project, operation, variant)`. The `tasks` module derives the whole set from a project's compiled model and its handler
files; adding an operation to acme adds its tasks with no edit to the bench.

| Variant | Starting copy | The agent gets | Measures | Count today |
|---|---|---|---|---|
| `blank` | the operation's handler is the generator's blank; journeys held out | `architect brief`, our four tools (read, list, write the one file, check) | writing from the brief, with neighbours to read: check 4 exactly | acme 12, starter 9 |
| `isolated` | as `blank`, and every other handler is a denied path too | the same | **the brief alone**: no handler to copy. The gap between `blank` and `isolated` is how much the brief carries | acme 12, starter 9 |
| `repair` | the handler is a planted break | the brief, plus prove's lines for that operation (the verdict lines only, never journey source) | diagnosing a red prove | 6 now (the grant fixtures); grows (below) |
| `review` | the slow grant (performance) | the brief, plus prove's review line | clearing a review: prove passes, so success is the review gone | 1 |

Left out on purpose: the who-may-call fixture (it breaks generated code, which an agent may not write) and the coverage fixture (it
is about a missing journey, which an agent may not write). So the starting set is **21 blank, 21 isolated, 7 repair or review: 49 tasks**.

**Starter and acme overlap.** Eight starter handlers are byte-identical to acme's, but the projects differ (acme has the allowance, 3 more
handlers and 6 more journeys), so a starter task is a different task: fewer neighbours to read. Both stay, as two suites.

**More repair tasks, two ways.** (a) A ✍️ author thread writes planted breaks for every operation, the way it wrote the grant ones,
under `examples/acme/test/fixtures/bench/<operation>/<eval>.ts`; the builder never writes them (AGENTS.md: a builder never edits the
evals). (b) **Mutants**: a mechanical pass over the reference handler (drop an `emit`, drop a `move`, swap a declared error, remove a
log line before a refusal) gives breaks without hand-writing. A mutant is kept as a task only if prove fails on it, so it is a real
break; the oracle check (H2.1) keeps them honest. (a) is a build step; (b) is in `later.md` until (a) has shown which evals need more tasks.

### H2.7 The score is the framework's own

The scorer is a separate, trusted stage, outside the sandbox (H1.7):

1. **Tamper check.** The copy's tree hash, minus the one file the task allows, must equal the starting copy's. Anything else changed:
   `tampered`, not solved, and the run is flagged in the report.
2. Put the journeys back (check 4's pattern), then `architect check`.
3. `architect prove --env local --port <from the pool>`. Its lines for the task's operation give `evals.passed` of 9 and
   `journeys.passed` of the journeys that call it.
4. **`solved`** = not tampered, check ✔, and every one of the operation's lines ✔ (a `review` task also needs the review gone).

Partial credit is reported (evals and journeys passed) but the headline is `solved`, because a handler with 8 of 9 evals is a broken
handler. Turns, tokens, dollars and time are reported beside it, never folded into it.

## 7. The runner (item 4)

### H2.8 A suite is a matrix, run in two pipelined stages

```ts
// benchmarks/suites/core.ts (sketch)
export default Suite.make({
  name: "core",
  tasks: { project: "acme", variants: ["blank", "isolated"] },
  configs: [
    { provider: "anthropic", model: "claude-sonnet-5-5", runner: "sdk" },
    { provider: "commandcode", model: "glyph-cluster:free", runner: "pi" },
  ],
  repeats: 3,
  limits: { maxTurns: 40, maxUsd: 1, wallMs: 600_000 },
  capUsd: 3,
});
```

- **Two stages.** Agents run concurrently (network-bound), at most N per provider (default 4, set per provider). Each finished run
  goes into a bounded scoring queue (CPU- and port-bound) with M at once, M from spike S-H2b (likely half the cores). Ports come from
  a pool so two proves never collide.
- **Repeats.** k = 3 by default, 5 for a baseline. Models are noisy; one run proves little.
- **Resume.** A run's identity is `(suite, commit, task, config, repeat)`. A suite killed and restarted skips every identity that has
  a finished `record.json`, so a crash costs only the runs in flight.
- **Order.** The cheapest configs first (oracle, null, free models), so a broken suite fails before it spends money.
- **No world is left running.** Every prove is scoped; the suite ends with check 4's `nothingRunning` over every copy.

### H2.9 Spend: a ledger with reservations, under the day's cap

AGENTS.md caps cloud spend at $10 a day across everything. Model tokens may or may not count as "cloud resources" (question 2), so the
bench assumes they do and holds itself to less.

- One **ledger** per UTC day, `benchmarks/.architect/spend/<date>.json`, shared by every suite on the machine (a lock file around
  each update). Before a run starts it **reserves** its `maxUsd`; when it ends it **settles** the real cost and frees the rest.
- A run starts only if `spent + reserved + maxUsd` stays under **the bench's daily cap: $5 by default, never above $10**, and under the
  suite's own `capUsd`. Otherwise the suite stops starting runs, finishes those in flight, and says what it skipped.
- Before starting, a suite **prints its estimate**: per cell, the baseline's mean cost (or `maxUsd` with no baseline) times repeats.
- Cost source: the SDK's `total_cost_usd` for `sdk` (`usdSource: "provider"`); Command Code's `/models` price table times the
  reported tokens for `pi` (`"table"`), the table snapshotted into the record so a later price change does not rewrite history.

Arithmetic from U5: acme `blank` on Sonnet is about 12 tasks × 3 repeats × $0.05 to $0.15 = **$2 to $5**, about 6 minutes at 4 agents and
4 scorings. Both variants on Sonnet and one free model: about $4 to $10, so a full `core` run on paid models is a one-suite-a-day budget.

## 8. Analysis, the report and the baseline (item 4)

### H2.10 What the report says

Per suite, per config (one row each): **solved k of n** with a 95% Wilson interval, pass^k (every repeat solved), mean evals passed,
dollars (mean and total), median turns, median wall time, tokens. Then:

- a **task by config grid** of solved counts, so a task every model fails stands out: that is a brief or a framework problem, not a model one;
- **evals failed, counted across all runs**: which of the nine evals agents break most is the clearest signal of which part of the brief
  or the runtime API is unclear;
- **friction**: reads refused, check runs before a pass, tool errors. Check 4's own run is the example: the agent said it found no
  documentation for the `Records` API and guessed `records.update` from neighbours (`design/evidence/L1.60/01-e2e-layer1.txt`). Friction
  turns that kind of sentence into a number we can watch fall as the brief improves.

### H2.11 How it is viewed

Three outputs from one pass over the records, no server: the table in the terminal; `report.md` (for a pull request or a decision record);
and **`report.html`**, one self-contained file with the grid, the eval counts and, per run, a timeline of turns and tool calls drawn
from `spans.jsonl`, the diff, and the transcript. A portal page for runs waits for layer 2 (`later.md`).

### H2.12 A run on `main` becomes a tracked baseline

CI has no model key (D2 #41), so a baseline cannot come from CI today.

- `bench --baseline` refuses unless the tree is clean and `HEAD` is on `origin/main`. It runs the suite with k = 5 and writes
  **`benchmarks/baselines/<suite>.json`**: per task and config, the solved count, means and intervals, the commit, the runner and model
  versions and the price table. No transcripts, no text: a few kilobytes, committed.
- It lands like any change: a pull request "bench: `<suite>` baseline at `<short sha>`", merged when CI (the oracle and null check) is
  green. Its `report.md` goes in the pull request body.
- `bench compare` (and every suite run) diffs against the latest baseline. A **regression** is a config whose solved interval sits wholly
  below the baseline's, or a task that went from solved in every repeat to solved in none. It is **advisory, not a gate**: model noise
  would make a gate flaky. It becomes a gate only after baselines have been stable for a while, by a later decision.
- When to take one: after a change to the brief, the tools, the system prompt, the runtime API that handlers call, or a model pin. The
  record's hashes (brief, system prompt, tools, skills, commit) say which of those moved between two baselines.
- When CI later has a key (Aaron's call, question 3), a weekly scheduled workflow takes the baseline on free models, and a person takes it on paid ones.

## 9. Spikes this needs

| Spike | Question | Needs | Decides |
|---|---|---|---|
| **S-H2a** Command Code tool calls | Do `glyph-cluster:free` and `inkling-2-small:free` return OpenAI `tool_calls` through `pi-ai`'s `openai-completions` at `https://api.commandcode.ai/provider/v1`, with usage at the end of the stream? If not on Chat, do they on `/responses`? | Aaron's key, on his machine (a 🖥️ local thread; the key from the keychain into the env by name, never printed) | Whether A2's `commandcode` provider is Chat or Responses, and which free model is the bench's mechanics model |
| **S-H2b** Scoring concurrency | How many `architect prove` runs fit at once on Aaron's machine before time per prove climbs (workerd per port, a Collector each)? | No key, no cloud | M in H2.8, and whether one shared Collector for all proves (not just runs) is worth it |

## 10. The recommendation, in one place

| # | Call |
|---|---|
| H2.1 | A0 first: check 4 becomes the `sdk` runner in `@architect/agent` (Superseded by M4-agents, 22 November 2026: `@orthograph/agents`.), with `oracle` and `null` runners, the record and the scorer. Pi follows as the `pi` runner. |
| H2.2 | One folder per run: `record.json` (typed, hashes not text) beside transcript, spans, logs, output and score. |
| H2.3 | Files are the store now; a SQLite index only if needed; R2 and D1 at A6 behind one `RunStore` service. No trace UI, no SaaS. |
| H2.4 | Keys by name only (`ANTHROPIC_API_KEY`, `COMMANDCODE_API_KEY`), read only in `benchmarks/main.ts`, redacted by exact match. |
| H2.5 | Anthropic on `sdk` (and `pi` from A2, as a pair); Command Code open models on `pi`; free models first. |
| H2.6 | Tasks derived per (project, operation, variant): `blank`, `isolated`, `repair`, `review`; 49 today. |
| H2.7 | Score = not tampered, `check` ✔, and the operation's nine evals and journeys ✔ in `prove`. |
| H2.8 | Suites as matrices, agents and scorings pipelined, k = 3 (5 for baselines), resumable. |
| H2.9 | A daily spend ledger with reservations; bench cap $5 a day, never over $10. |
| H2.10, H2.11 | Report: solved with intervals, the task grid, evals failed, friction; terminal, Markdown and one HTML file. |
| H2.12 | Baselines committed as small summaries by pull request from a clean `main`; compare is advisory. |

Rubric, for the calls that had real alternatives:

| Axis | H2.1 A0 first | H2.3 files | H2.12 committed baselines |
|---|---|---|---|
| Floor first | ✅ benchmarks on Anthropic one step after Gate 1, before Pi | ✅ nothing to stand up | ✅ works without a CI key |
| Reversible | ✅ the `Runner` seam is the same one Pi plugs into | ✅ any index is rebuilt from files | ✅ a summary file |
| Blast radius | ✅ check 4 and `packages/agent` only | ✅ `benchmarks/.architect` only | ✅ `benchmarks/baselines` only |
| Correct | ✅ oracle and null check the bench itself in CI | ✅ the Collector's own files | ⚠️ advisory until noise is known |
| Fits what's there | ✅ check 4's code, prove's `Collectors` | ✅ `.architect/` is local state already | ✅ lands like any change |

## 11. Fit with the build

- **Layer.** The agent track (H1) is a layer-2 side track needing only Gate 1; H2 adds rows A0, A8 and A9 to it and narrows A5
  (`build-plan.md`). No code lands on `layer/*` from this thread. Gate 1 is landing now; A0 starts once it is on `main`.
- **`packages.md`**: the agent package's module list follows section 3; the `benchmarks/` project is added.
- **`later.md`**: mutant repair tasks; benchmark regressions as a gate; the weekly scheduled baseline once CI has a key.
- **D2 #76** stands: check 4 stays an e2e check of Gate 1. After A0 it calls `@architect/agent` (Superseded by M4-agents, 22 November 2026: `@orthograph/agents`.)'s `sdk` runner instead of inline code,
  with the same assertions.

## 12. Questions only Aaron can answer

1. Is "Command Code" the service at commandcode.ai, the coding agent with a Provider API? (Same as H1's question 1; asked once.)
2. Do model tokens count toward the $10 a day cloud cap? The design assumes yes and caps the bench at $5 a day.
3. May CI hold a model key, for example a Command Code key used only for the two free models, so the oracle check is joined by a real
   weekly free-model baseline? Without it, baselines are taken by hand on your machine.
4. The free Command Code models may keep and train on prompts. Our tasks contain only Architect's own code. Is that acceptable?
5. Command Code's Provider plan is $15 a month with $15 of credit, and even the free models need $1 of credit on the account. Is the
   account already on that plan, or should the open-model half wait?
