# H1: the agent harness, as its own package

Written 16 November 2026 by the 📐 designer thread, on Aaron's brief of that day and three steers that followed. Status:
**proposed**, with a recommendation; nothing here is built. The architecture is the building agent's to decide
(`AGENTS.md`, "Who decides"), so this records the call and the evidence. The questions only Aaron can answer are at the end.

Naming: `D3` is the build plan's layer-2 decision, so this record is `H1`. Its numbered calls are H1.1, H1.2 and so on.

Sources read, all at pinned versions, unpacked into a scratch folder and never run: `@earendil-works/pi-durable`,
`pi-agent-core`, `pi-ai`, `pi-telemetry`, `pi-schema`, `pi-codemode` at **1.5.0** (npm tarballs), and the GitHub tag
`v1.5.0` of `earendil-works/pi` (the repository moved from `badlogic/pi-mono`). Effect 4.1.1 as installed
(`node_modules/.pnpm/effect@4.1.1`), `@effect/ai-anthropic`, `@effect/ai-openai-compat` 4.1.1 and
`@effect/platform-cloudflare` 4.1.3 as tarballs. Paths below are inside those, unless they start `e2e/`, `packages/` or `design/`.

## 1. The question

What is the smallest agent harness Architect should own, in its own package, that:

1. switches model and provider per run (Anthropic, plus the open models behind Aaron's second key);
2. takes tools (our typed functions) and skills (loadable instructions);
3. runs in a sandbox if it can, and on the machine if it can't;
4. records every run so runs compare and become internal benchmarks, scored by our own `check` and `prove`.

## 2. Unknowns, and what settled them

| # | Unknown | Settled by | Answer |
|---|---|---|---|
| U1 | Is Pi Durable's durability real on Cloudflare, or only Node? | `packages/durable/test-workers/` | Real. Its Durable Object storage and alarm tests run in workerd through `@cloudflare/vitest-plugin` (`vitest.config.ts:7`, `wake.test.ts:25` sleeps through an eviction, `:62` recovers a turn cut off mid-stream). |
| U2 | Can its clock and timers be ours? | `src/harness/types.ts:711-732` | Yes: `now`, `setTimer` and `onWake` are all injected. `Date.now` and `setTimeout` are only defaults (`harness.ts:518`, `timers.ts:13`). |
| U3 | Does it have skills? A sandbox? | README, `grep` over `dist/` | No skills in Durable (only in `coding-agent/src/core/skills.ts`, 505 lines, 77k-line package). Sandbox: an `ExecutionEnv` interface (`src/env/index.ts:212-377`); only Node and SSH implementations. Neither is needed for a tools-only run. |
| U4 | Does it have a telemetry exporter? | `packages/telemetry/src/index.ts:98-110` | No. A 4-method contract (`startSpan`, `addEvent`, `setAttributes`, `setStatus`, plus propagation) with an in-memory store (`memory.ts`) and a no-op. We write the exporter (section 7). |
| U5 | What is "Command Code"? | commandcode.ai docs | Identified, with moderate confidence (section 6). Asked of Aaron in question 1. |
| U6 | What can the Agent SDK do with non-Anthropic models? | Anthropic docs, LiteLLM docs | Only through a gateway that speaks the Anthropic Messages API (section 5, option D). |
| U7 | Is there a real blocker in Pi Durable? | everything above | **None found.** Costs and risks are in section 9. |
| U8 | Does Effect have a native answer (Cluster, Workflow, AI)? | `effect@4.1.1`, `@effect/platform-cloudflare@4.1.3` | Yes, and it is new. It is the fallback, not the pick (section 8). |
| U9 | Does `pi-ai`'s OpenAI and Anthropic adapter bundle for workerd? | static read of imports | Likely: only `auth/`, `cli.ts` and `env-api-keys.ts` import `node:`; the adapters import the `openai` SDK. **Not run.** It is the first thing the build checks (A1, A6). |

## 3. What Pi Durable is, from the code

Package `@earendil-works/pi-durable` 1.5.0, MIT, "Experimental. The API changes without notice between releases"
(`README.md:3`), `engines.node >=22.19.0`. **It does not use `pi-agent-core`**: its dependencies are `pi-ai`, `chord`,
`pi-codemode`, `pi-schema`, `pi-telemetry`, `photon` and `diff` (`package.json:161-167`). Durable has its own loop.
Size: 33.6k lines of source in `packages/durable/src`; the closure it needs is about 120k (chord 49.9k for document
state and watches, pi-ai 28.4k, codemode 3.0k, schema 4.6k, telemetry 1.6k). The brief's 35.8k is Durable alone; the 2k difference from the source count is probably tests or generated files (not checked). Release
cadence: 1.0.4 to 1.5.2 in about six weeks; **1.5.0 broke two public APIs** (tool schemas became JSON Schema through
`pi-schema`; `Storage.commit` changed shape, `CHANGELOG.md` 1.5.0). Churn is real.

What it gives, each with its source:

- **Everything committed before shown.** Conversations, model turns, tool calls and our own documents go through one line of
  atomic commits (`README.md:8`, "Concepts"). A conversation is a transcript of immutable entries.
- **Tasks that checkpoint each phase.** A generation task calls the model and owns one `pi.tool` task per tool call
  (`README.md:102`). A restart resumes from the last checkpoint; a request the process died in is a failed attempt, retried
  with backoff (`README.md:216`). Crash loops end: `restartLimit` default 5 (`harness/types.ts:649`).
- **Waiting is stored.** `runtime.sleepUntil(at, checkpoint)` ends the phase asleep; retry backoff uses it too
  (`harness/generation.ts:305,329`). With `onWake`, the Harness arms no timer and tells the host when to set its alarm (`README.md:166-213`).
- **Storage.** `openDurableObjectSqliteStorage(ctx.storage)` for a SQLite Durable Object, `openNodeSqliteStorage(file)`
  for a file, memory and JSONL too (`README.md` "Storage" table). A table `prefix` lets it share a Durable Object with our tables.
- **Per-conversation agent.** `configure({ model: { provider, modelId }, thinkingLevel, tools, extensions, instructions, maxTurns })` in one
  commit (`README.md` "Per-Conversation Agent"; `harness/agent.ts:128`). This is model switching per run, and mid-run.
- **Tools** with a JSON Schema `parameters`, validated before `execute()`; each call a durable task; `replay: "safe"` lets a
  crashed call rerun, otherwise the model gets an `interrupted` result (`README.md:277`).
- **Usage and cost** per `provider/model` and per tool, failed and aborted attempts included (`README.md:842`, `harness/generation.ts:1153`).
- **Telemetry spans** `pi.durable.submit`, `pi.durable.phase` and events, with a stored trace carrier per task so a resumed phase stays in
  its trace (`README.md:85-93`). Attributes hold ids, never messages, so the transcript stays the record of content.
- **Providers** through `pi-ai`: about 40 built in (Anthropic, OpenAI, Google, Bedrock, OpenRouter, Cloudflare AI Gateway,
  Workers AI, DeepSeek, Kimi, MiniMax, Qwen and more) and `createProvider({ baseUrl, api: openAICompletionsApi(), models })` for any
  OpenAI- or Anthropic-compatible endpoint (`packages/ai/README.md:1271-1300`). No Command Code provider ships (`grep` found none).
- **Extra, unused by us at first:** code mode (QuickJS sandbox, `README.md:355`), a task graph, compaction, subagents, forks, steering, `pi-env` (a Rust daemon for remote tools, `packages/env`) and `packages/evals` (docs-lift evals for Pi's own coding agent, not reusable as ours).

## 4. What Architect already has that the harness should use

- **Check 4** (`e2e/layer1/04-agent-writes-a-handler.test.ts`): the Agent SDK with `tools: []` (`:90`), four tools of ours (`read`, `list`,
  `write_handler`, `check`), a denied-paths list (`:18`), journeys held out of the copy while the agent works, `maxBudgetUsd: 5`,
  OTel exported to prove's `Collectors` (`:72,80`). It is the first benchmark task and the first scorer, already written.
- **The blueprint model.** An operation carries `payloadSchema`, `answerSchema` (Effect `Schema` structs), its `errors`, its `allowed`
  roles, its `steps`, its `budget` and a `description` (`packages/blueprint/src/modules/operations/types.ts:36-61`).
  A thing carries a machine (`machines/types.ts`) and `lives: "database" | "actor"`.
- **`architect brief <thing>.<verb>`** (`packages/cli/src/modules/brief/types.ts`): the exact task statement, forbidden paths and
  required journeys. A benchmark task is a brief.
- **`prove`:** nine evals per operation, journeys, `Collectors` reading traces back by trace id. That is the scorer.
- **`Timers`** and `Clock` (`packages/target-effect/src/modules/timers/types.ts:13`): the only way anything waits.
- **Per-request OTLP export from workerd, flushed under `waitUntil`** (`packages/host-cloudflare/src/modules/telemetry`, from the
  `otlp-from-workerd` spike). Effect's own exporter: `effect/observability/Otlp.ts:42`.
- **The generated MCP** (L2.08) already derives one tool per operation and read, from the model, built on the SDK. The harness
  uses that mapping instead of re-describing operations.

## 5. The options

| | A. Pi Durable adopted as is | **B. Pi Durable wrapped behind an Effect seam** | C. Pi agent core + our durability | D. Claude Agent SDK | E. Effect AI + Cluster/Workflow on Durable Objects | F. A bare loop on provider SDKs |
|---|---|---|---|---|---|---|
| Durability | Pi's | Pi's | we build it | none (sessions on disk) | Effect's (new) | none |
| Model switch | per conversation | per conversation | per call | Anthropic models; others only via a translating gateway | swap a Layer | per call |
| Fits Effect-everywhere | no: Promise and `Context` API, `Date.now` defaults | yes: the seam is the only impure file | partly | no: a subprocess | native | partly |
| New code we own | small, but breaks our lint | about 1.5k lines | about 6k+ (transcript, commit, resume, crash counting, usage) | about 300 (what check 4 has) | about 2k + the loop + transcript store | about 800 |
| Runs in a Worker or DO | yes | yes | yes | **no**: it runs the Claude Code binary as a child process | yes, once `platform-cloudflare` ages | yes |
| Run record falls out | yes | yes | no | partly (result message, OTel) | partly | no |
| Maturity | experimental, 6 weeks of churn | same, behind a seam we can replace | pi-agent-core is a loop only | stable, Anthropic-owned | `platform-cloudflare` first release 10 Nov 2026 | n/a |

Why each loses or wins:

- **A is B without the discipline.** Pi's API is `async` with a `Context` it passes everywhere; our rules ban `async`, `await`,
  `try`, `Date.now`, `setTimeout` outside named entry files (`AGENTS.md`). Using Pi directly means the lint rules fight the code,
  or those rules get exceptions. So A collapses into B.
- **C rebuilds what Durable already is.** `pi-agent-core` is a loop of 2.5k lines (`packages/agent/src`) with no persistence, no
  checkpoints, no crash handling, and it calls `Date.now` itself (`agent.ts:438`). Everything Durable adds (committed transcript,
  resume, `restartLimit`, usage, steering, compaction) is the part we would write.
- **D** is right for one job and wrong as the harness. Facts: the SDK "runs the Claude Code binary" as a library
  (docs overview, "Compare the Agent SDK"), so it cannot live in a Worker or Durable Object; it is covered by Anthropic's Commercial
  Terms; third parties may not offer claude.ai login. **Non-Anthropic models:** the SDK reads `ANTHROPIC_BASE_URL` and sends the
  Anthropic Messages format, so another provider works only behind a gateway that translates (LiteLLM documents this). Command
  Code's `/messages` route answers Claude models only and refuses others (provider-api docs), so Command Code's open models are
  **not** reachable from the SDK without a translator we would run ourselves; a LiteLLM issue reports Claude Code sending a parameter
  (`output_config`) that OpenAI rejects. Skills load from `.claude/` and custom tools are in-process MCP, both fine. **Keep D as a
  second runner behind the same run record**: "Claude Code against our harness" is itself a useful benchmark pair.
- **E is the serious alternative, and not the pick.** See section 8.
- **F** is the true minimum for a ten-minute benchmark and is what check 4 effectively is. It has no resume and no record. We would
  rebuild B's record by hand and still lack durability when runs cost dollars and run twenty minutes.

## 6. "Command Code"

The best match is **Command Code**, commandcode.ai, a coding agent with a "Provider API". Facts from its docs
(`commandcode.ai/docs/provider-api`, `commandcode.ai/models`):

- Base `https://api.commandcode.ai/provider/v1`. `Authorization: Bearer <key>`; the same key serves its CLI and the API. The docs name
  no key variable (`CMD_API_KEY` is only the header example's placeholder; corrected by H2, U4); ours is `COMMANDCODE_API_KEY` (H2.4).
- Routes: `POST /chat/completions` (OpenAI Chat, open and OpenAI models), `POST /responses`, `POST /messages` (Anthropic Messages,
  Claude models only; non-Anthropic is refused), `GET /models` (each entry has `supported_endpoints`).
- Streaming reports usage at the end on every route. Request body cap 32 MiB. 429 on upstream limits.
- A catalog of about 100 models with prices per million tokens: Claude (Sonnet 5.5, Opus 5.5, Haiku 5.5), GPT-6 family, Gemini, and
  open models: DeepSeek V4.x, Kimi K3/K2.x, GLM-5.x, MiniMax M3, Qwen 3.x, Step, Nemotron, MiMo and others. **Two are free** (API ids `inkling-2-small:free`,
  200 requests a day, and `glyph-cluster:free`, 1000 a day; the page slugs use a hyphen; corrected by H2, U4), which makes real-model
  tests cheap. They need $1 of credit on the account, run outside zero data retention, and may be trained on.
- Plans: the Provider plan starts at $15 a month with $15 of credit, at underlying rates "with no markup"; the Go plan has no API access.
- Zero data retention with `x-cmd-zdr: 1`.

So it is OpenAI-compatible as the brief guessed, plus an Anthropic route. In `pi-ai` it is two small providers: `openai-completions` at
`.../provider/v1` for the open models and `anthropic-messages` at `.../provider` for Claude (the exact base and the `compat` flags need
trying; A2's check does that, against the free models). The speech-to-text may have misheard, and Aaron may mean another service.
It is question 1. **The key is never read, printed or searched for by anyone building this**: a run takes it from the project's declared secret
(named in `environments/<e>.ts`, D3 item 2), set outside the repository.

## 7. The recommendation (H1.1 to H1.9)

**H1.1 Wrap Pi Durable behind an Effect seam, in a new package `@architect/agent`. (Superseded by M4-agents, 22 November 2026: `@orthograph/agents`, a feature plugin.) Pin `pi-durable`, `pi-ai`, `chord`,
`pi-codemode`, `pi-schema` and `pi-telemetry` at 1.5.0 exactly.** 1.5.0 was published 2 November 2026, so it is 14 days old today:
the oldest-enough version, and 1.5.1 and 1.5.2 (9 and 10 November) are not allowed until 23 and 24 November. The seam is the only
place that touches Pi; if Pi breaks or is dropped, only the seam changes, and Option E is the way out (section 8).

**H1.2 The seam is Effect services, with the six slots per module.** `Agent` (open a run, submit, wait, watch, close), `Runs` (the
record), `Models` (the registry), `Sandbox`, `Skills`, `Bench`. Pi's `Context` is built from the Effect fiber's `AbortSignal` with
`withAbortSignal` (`chord/src/context/index.ts:111`). Every Pi promise is wrapped once, in `internal/`, with `Effect.tryPromise` into a typed
`AgentError` (`ModelFailed`, `StorageFailed`, `RunInterrupted`, `BudgetExceeded`, `TurnsExceeded`, `SandboxDenied`, `ScorerFailed`). Nothing else in
the package has `async`. The Durable Object class and the CLI entry are the named entry files.

**H1.3 Time is ours.** `now` is `Clock`; `setTimer` is `Timers.at(...)` with the disarm as fiber interruption; `onWake` sets a Durable
Object alarm (host) or, on Node, is absent and the Harness's own timer is replaced by `Timers`. Set provider-level retries to zero so all
retrying is Pi's stored `sleepUntil`, because `pi-ai`'s in-request retry uses a plain `setTimeout` (`packages/ai/src/utils/provider-retry.ts:88`).
The agent runs *outside* any world (it is dev tooling), so its `Timers` is a real-clock layer; stepped-clock tests of agent waits are layer 5. (Superseded by M4-agents, 22 November 2026: an agent in a world waits on the world's clock.)

**H1.4 Models: use `pi-ai`'s providers, not Effect AI.** A `Models` registry from run config `{ provider, model, thinking }`,
the built-in Anthropic provider, and a `commandcode` provider written with `createProvider` (about 40 lines, plus a price table read
from `/models`). Less code than Effect AI because Pi's loop already speaks `pi-ai`; using Effect AI would mean writing a `pi-ai` provider
over it. Switching is `configure({ model })` per run, and the run record keeps the choice.

**H1.5 Tools are derived, not described.** Two sources, one `Tool` type at the seam:
(a) **project tools** (`read`, `list`, `write_file` within an allow-list, `check`), moved out of check 4 with its denied-paths list,
`realpath` and case-insensitive comparison (D2 #75); (b) **operation tools**, one per operation and read in the compiled model,
named by the operation's path, with `parameters` from `Schema.toJsonSchemaDocument(operation.payloadSchema)`
(`effect/src/Schema.ts:18253`) and `execute` calling the generated SDK as a named principal, so roles, refusals and typed errors are
the real server's, never re-implemented. The mapping is the same one L2.08's MCP generator makes, shared as one pure function.
`replay: "safe"` is set exactly when the operation is `idempotent: "request"`, with the request key taken from the tool call id.
A role decides what the agent may call because the agent *is* a principal: it holds the role's token, nothing more.

**H1.6 Skills are a small extension, not a package.** A skill is a folder with `SKILL.md` (name up to 64 characters, description up to
1024, the Agent Skills layout Pi's coding agent reads, `coding-agent/src/core/skills.ts:12-15`). Our `Skills` module scans declared
folders, adds one `<available_skills>` section (name and description only; the shape of `formatSkillsForPrompt`, `skills.ts:358`) and a
`load_skill` tool that returns the body, so cost scales with use. About 150 lines. The set of skills and the hash of each go in the run record.

**H1.7 Sandbox: tools-only on a throwaway copy of the project, on the machine, first** (full comparison in section 10). The `Sandbox`
service has kinds `copy` (v0), `docker` (later, over `pi-env`) and `cloudflare` (later). Model-written code runs during scoring, so the **scorer is a
separate, trusted stage** that takes the produced file(s) out of the sandbox, the same shape as check 4 (journeys out of the copy, back for the proof).

**H1.8 Telemetry: a `PiTelemetry` adapter from Pi's `TelemetryContext` to Effect spans.** `startSpan(options, cb)` becomes
`Effect.useSpan(name, { attributes, links, parent }, ...)` run on the ambient tracer, so every Pi span (`pi.durable.submit`,
`pi.durable.phase`, events, metrics as histograms) flows through the *same* `Otlp` layer (`effect/src/observability/Otlp.ts:42`) our
handlers already use, into the Collector that prove runs. `propagation.inject/extract` carry a W3C `traceparent` in Pi's `TelemetryCarrier`
(a `Record<string, string>`), built on `Tracer.externalSpan` (`effect/src/Tracer.ts:521`). About 150 lines; the contract is 4 methods
and `memory.ts` (463 lines) is the reference. Our own spans are named `agent.run`, `agent.turn`, `agent.tool.<name>`, `agent.score`, with
`gen_ai.*` attributes (`effect/src/ai/Telemetry.ts` has the convention). Content never goes in attributes (Pi's rule); it stays in the transcript.

**H1.9 The run record is a projection; the transcript is the source of truth** (section 11). Benchmarks are tasks scored by the real
`check` and `prove` (section 12).

### What the minimal version does now, and what waits

| Now (local, no cloud) | After the cloud step (layer 2, L2.01) | Waits for layer 5 (time) |
|---|---|---|
| Pi Durable on **Node SQLite** in the CLI process; resume after a kill | The same seam on a **SQLite Durable Object**, `onWake` to the DO alarm | Agent waits on the world's stepped or scaled clock; keeper-style scheduled agents |
| Two providers (Anthropic, Command Code), per-run switch | More providers by config | |
| Tools-only copy sandbox; denied paths; budget and turn limits | Docker sandbox over `pi-env`; Cloudflare Containers later | |
| Run record to `.architect/runs/`; traces to the local Collector | Records to R2 and D1; verdicts to the logbook | |

Durability is not wasted locally: a twenty-minute run that costs dollars survives a crash, and the local Node store is real SQLite on disk (G1: nothing faked).
It leans on layer 5 only for *world-clock* waits. A Durable Object alarm for Pi's sleeps works today, without the world's `Timers`.

## 8. Effect's primitives, checked around Pi Durable

This is a short check of where Effect fits, with one honest rival at the end. Effect 4.1.1 has Cluster, Workflow and AI inside the
`effect` package (`src/cluster`, `src/workflow`, `src/ai`).

| Primitive | Where it fits around Pi Durable | Verdict |
|---|---|---|
| `Context.Service`, `Layer`, `Scope` | The seam: `Agent`, `Models`, `Sandbox` as services; a run's Pi `Harness` opened and closed by a scoped Layer | **Use.** This is the seam |
| `Effect.fn`, spans, `Tracer`, `Otlp` | The telemetry adapter and our own spans | **Use** (H1.8) |
| `Schema` | Tool parameters and answers; `toJsonSchemaDocument` gives Pi's `parameters`; the same Schema decodes the args | **Use** (H1.5) |
| `Schedule` | Our own retries around the seam (storage open, scorer); not Pi's stored backoff | Small use |
| `Stream`, `PubSub`, `Queue` | A run's events to the CLI or portal: Pi's `watch()` becomes a `Stream` | Use at the edge |
| `Effect.Clock`, `Timers` | `now` and `setTimer` (H1.3) | **Use** |
| `effect/ai` `LanguageModel`, `Tool`, `Toolkit`, `Chat` | A typed tool with a handler (`Tool.make`, `ai-docs/src/71_ai/20_tools.ts`) and a loop in 15 lines (`30_chat.ts:109-141`); the doc says outright you can switch models mid-conversation by swapping the Layer | Right tool *if we owned the loop*; Pi owns it, so **skip** |
| `@effect/ai-anthropic`, `ai-openai-compat` 4.1.1 | Providers with `apiUrl` and `transformClient`, so Command Code is a base-URL change (`AnthropicClient.ts:178,236`, `OpenAiClient.ts:100,149`) | Same: only under Option E |
| Cluster `Entity` | A run as an entity: one Durable Object per address, mailbox in SQLite, passivation (`Entity.ts:147`) | Overlaps Pi's session; fallback |
| `Workflow`, `Activity`, `DurableClock`, `DurableDeferred` | A run as a workflow, each model call and tool call an `Activity` memoised in SQLite, waits as durable clocks (`Activity.ts:120-135`, `DurableClock.ts:74`) | Overlaps Pi; fallback |
| `Rpc`, `HttpApi`, `Persistence` | Not needed here | Skip |

**Option E, fully stated.** `@effect/platform-cloudflare` 4.1.3 (published 10 November, MIT, "stability experimental", 2.3k lines, peers
`effect ^4.1.3` and Alchemy) ships `CloudflareWorkflowEngine`: "one workflow execution is one Durable Object", with activity results keyed
`${name}/${attempt}`, durable deferreds and the clock table on the object's SQLite behind its single alarm
(`CloudflareWorkflowEngine.ts:1-14`), and `ClusterEntity` and `ClusterWorkflow` classes you re-export and bind as SQLite Durable Objects
(`CloudflareDurableObjects.ts:194,259`). It is the native shape for a run: a `Workflow.make("AgentRun", { payload, idempotencyKey })`
whose body loops `turn` activities and `tool` activities until done. What we would write that Pi gives: the transcript store and
committed-before-shown rule, partial-answer handling for a request cut mid-stream, crash-loop counting, usage totals, compaction, steering,
the context window; and a workflow replays from its top, so every model call must be an activity or it is billed twice (the activity
gotcha, `Activity.ts:120-130`). **It is not usable today under our rule:** 4.1.3 is 6 days old, usable from 24 November, and needs `effect` 4.1.3 (also 10 November) while we pin 4.1.1.
**Triggers to switch to E:** (1) the seam cannot keep Pi's Promise API out of our code without exceptions to the lint rules; (2) Pi
Durable's API changes again in a way that breaks the seam twice in a quarter; (3) `pi-ai` or `chord` fails to bundle for workerd and
cannot be fixed by us; (4) Aaron wants the agent run to be a declared Architect workflow (L5.04) rather than a library. Until one of those, the
smallest thing that works is B. E's `Entity` and `Workflow` stay in the picture for L5.04 ("durable workflows for long waits"), which is a different job from the agent loop.

## 9. Pi Durable's risks, and how the design holds them

| Risk | Evidence | Held by |
|---|---|---|
| Experimental, API changes without notice | README line 3; 1.5.0 breaking changes | Exact pin, the seam, an A-step conformance suite that runs on every bump |
| Size: about 120k lines in the closure | per-package counts above | Tree-shakes (`sideEffects: false`); **measure the workerd bundle in A6** against Workers' size limit; images/`photon` never imported |
| Churn: a release every week or so | npm `time` | Two-week rule: stay on 1.5.0 until a bump is wanted, then the newest at least 14 days old |
| Licence | MIT on all six packages | none |
| Promise and `Date.now` | `harness.ts:518`, `agent.ts:438` (agent-core, unused) | Injected clock; `Date.now` is the fallback only when `now` throws |
| Tools default to not replayable | `README.md:277` | `replay: "safe"` only for `idempotent: "request"` operations |
| `pi-ai` provider retry uses `setTimeout` | `provider-retry.ts:88` | Provider retries set to 0; Pi's stored backoff does the waiting |
| One process owns a storage; no cross-process lock | `README.md` "Storage" | One Durable Object per run; locally one process per run file |
| Pi's tests use a fake provider | `faux` in `worker.ts` | Our crash tests use it only for the mechanics under test; at least one test per host uses a real model (a free one), skipped without a key like check 4 |

## 10. Sandboxes, compared

Prices are Cloudflare's published ones read on 16 November 2026; the local figures are estimates, marked, and A3 measures them.

| | Cost | Start | Isolation | What can run inside | Fit |
|---|---|---|---|---|---|
| **Tools only, in process** (no shell) | none beyond tokens | 0 | none, but the model's only reach is the tools we hand it | our typed tools: read, list, write one file, check | Best default for "write this handler from its brief" |
| **The machine, a throwaway copy of the project** (this is tools-only plus a copy) | $0 | copy time, milliseconds for acme (measure) | the OS user; no VM | tools-only; or a shell if we allow one, which this option cannot make safe | **Right default today**; see below |
| **A plain local Docker container** | $0 | about 1 to 3 s from a built image (estimate) | a real kernel boundary, no host files but the mount, network off by default | a shell, `node`, `tsc`, and `architect check`; not `prove` (needs Docker for the Collector) | Next step, via `RemoteExecutionEnv` and `docker exec -i <c> pi-env` (`packages/env/README.md`, `Connection` takes a command) |
| **A Worker or Dynamic Worker isolate per run** | Workers pricing (not read; the Dynamic Workers overview page gives none) | "milliseconds" per the overview page | V8 isolate; you pick the bindings and can block outbound fetch | JavaScript only: no files, no shell, no `tsc` | Good for *operating* an app through tools; cannot write or check a handler |
| **Cloudflare Sandbox SDK or Containers** | Containers: `basic` (1/4 vCPU, 1 GiB, 4 GB) about $0.03 an hour all-busy, `standard-2` (1 vCPU, 6 GiB, 12 GB) about $0.13 an hour, plus egress $0.025 a GB, billed in 10 ms steps, plus the Worker and Durable Object, Workers Paid $5 a month | not published | a full Linux container per instance | a shell and a filesystem; **not Docker**, so no local Collector | Production path for shell tools; locally it needs Docker through `wrangler dev` (Containers local-dev page; Sandbox SDK local support not stated on the pages read) |

My arithmetic for the Containers figures: memory $0.0000025 per GiB-second on provisioned memory, CPU $0.00002 per vCPU-second on active use
only, disk $0.00000007 per GB-second.

### The machine as a full option

- **Cost:** zero. **Start:** a copy of the project (check 4 already does it). **Isolation:** none beyond the user account. That is acceptable
  only when the model's whole reach is tools we wrote.
- **What it needs to be safe enough:** (1) a throwaway copy, deleted after, with `.git`, `node_modules` and `.architect` excluded; (2) **tools only,
  no shell**, so no model-chosen command ever runs; (3) a denied-paths list, with `realpath` and case-insensitive matching, exactly check 4's;
  (4) **no credentials in the tools' environment**: the harness process holds the provider key, the tools never see it, and tool code never
  reads `process.env`; (5) limits: `maxTurns`, a per-run budget in dollars (default $1, not check 4's $5; the suite has its own cap inside the $10 a day), a wall-clock
  limit through `Timers`; (6) the scorer is a separate stage.
- **The honest gap:** scoring runs the model's code. `tsc`, `check` and `prove` execute what the agent wrote (inside workerd, but on the
  host). For a model we trust on a task we wrote, accepted. For an unknown model, or any task allowed a shell, the scorer and the agent move to Docker.
- **Right default when** the tools are ours, the model is a known provider, the machine is Aaron's and the project is a copy. **Wrong when** a
  shell tool exists, the task executes untrusted code outside prove's worlds, or runs unattended on a machine that holds credentials.

**Recommendation:** tools-only on the machine now (v0, A1 to A5); Docker over `pi-env` as the next rung (A7), because it is the cheapest real
boundary and the only one that can also run `check`; Cloudflare Containers only when runs must live on the cloud, with the Durable Object
host (A6) already holding the transcript. A Dynamic Worker is for the *operator* agent (tools are the app's operations, no files), later.

## 11. State: where things live, and how the pieces work together

**What is where**

| State | Lives in | Why |
|---|---|---|
| Transcript, task checkpoints, tool outputs, usage, our run document | **Pi Durable's storage**: Node SQLite file per run locally; the run's own **SQLite Durable Object** on Cloudflare | One owner per storage, atomic commits, alarm-driven resume (`README.md` Storage) |
| The run's machine state (`briefed`, `working`, `checking`, ...) | An Architect-owned Pi document `agent.run` in that same storage | Same commit as the entry that caused it |
| The finished **run record** (projection, section 12) | Local: `.architect/runs/<id>.json`. Cloud: an R2 object, with a **D1 index** (id, task, model, verdicts, cost, time) for comparing | Immutable, large, read by suites; D1 for the queries |
| Verdicts from `check` and `prove` | The record; and, for a revision, **the logbook** (L2.03) as a benchmark verdict with the signed-post path CI already uses | The logbook is the verdict store; it need not hold transcripts |
| Traces | The Collector (local) or the OTLP sink (cloud), keyed by trace id | Same as prove's evidence |
| Test worlds | prove's own world Durable Objects | A run's tools talk to a world over HTTP and never share its storage |

**How they collaborate.** One Durable Object per run owns the transcript (`new_sqlite_classes`, the Pi storage with its alarm). Its operation
tools call the project's world over the generated SDK, as a principal, through ordinary HTTP: the run never reaches into a world's storage. Prove makes and
destroys the world (L1.15, L2.02); the run's trace id is passed as `traceparent`, so the world's spans join the run's trace, and the nine evals can score
the agent's calls like any caller's. The run's final record is posted to R2 and the D1 index by the run's last task, then a verdict to the logbook.

**Is the run a declared Architect thing?** Yes, as a design, not as v0. A `Run` thing with `lives: "actor"` (one Durable Object per instance, D1 #1)
and a machine `briefed -> working -> checking -> proven | failed | abandoned`, moves `start`, `submit`, `score`, `fail`, `abandon`, each an operation
with typed payload, answer and errors, so the generated API, SDK, CLI and spans, and prove's nine evals, apply to the harness itself. A model turn and a
tool call would be steps (`agent.run.turn`, `agent.run.tool`). That belongs to a **std kit `agent`** (layer 3, after kits exist). v0 keeps the same state
union as plain types in `modules/runs/types.ts`, so declaring it later is a move, not a rewrite. The boundary stays honest: Pi owns the transcript; the
blueprint's machine owns the lifecycle of a run (is it scored, is it final).

## 12. The run record and the benchmark design

**The record** (a projection of Pi's committed state plus our spans; schema in `modules/runs/types.ts`, an Effect `Schema`):

```ts
// sketch, not code to build from yet
RunRecord = {
  id, startedAt, endedAt, ms,                       // from Clock, never the wall
  task:     { id, kind: "handler" | "operate", brief: { text, hash }, operation?, projectRevision, modelHash },
  agent:    { harness: "architect-agent@<v>", pi: "1.5.0", provider, model, thinking,
              systemPromptHash, tools: [{ name, schemaHash }], skills: [{ name, hash }],
              limits: { maxTurns, maxUsd, wallMs }, sandbox: "copy" | "docker" | "cloudflare" },
  turns:    [{ n, model, ms, stop, usage: { input, output, cacheRead, cacheWrite, usd }, toolCalls: [{ name, argsHash, ms, isError }] }],
  totals:   { turns, toolCalls, input, output, usd, restarts },
  outcome:  { status: "done" | "failed" | "budget" | "turns" | "timeout" | "interrupted", reason? },
  output:   { filesChanged: [{ path, hash }], diff },
  verdicts: { check: { pass, findings }, prove: { pass, evals: "9/9", journeys: [...] } },
  traces:   { run: traceId, score: traceId },
}
```

Fields come from: `harness.usage()` and `pi.usage` (cost per `provider/model`), the entries (turns, tool calls), `pi.live.runFailure` (outcome), the span tree
(timings), the sandbox diff (output), and the scorer (verdicts). Prompts and transcript text stay in the transcript, referenced by hash, so a record is small and safe to share.

**Benchmarks.**

- **A task is a brief.** For every operation in a project, `architect brief <thing>.<verb>` already says what to write, what is forbidden and which
  journeys must pass. The task generator replaces that operation's handler with `Handlers.blank`, holds the journeys out of the copy, and the task exists.
  A project with 40 operations has 40 tasks, with no hand-writing, and the allowance has `spend` already (check 4).
- **The scorer is the framework.** `architect check` (types, rules, drift) then `architect prove` (that operation's nine evals and the journeys that call it). A
  run scores 1 only if both pass. Partial credit: evals passed out of nine, journeys passed, check findings.
- **A suite** is tasks x configs x repeats (k at least 3, because models are noisy). The report compares configs: pass@1, evals passed, turns, tokens, usd, wall time, with spread.
- **Fairness and contamination:** the same brief, tools, skills and limits per config; only `{ provider, model, thinking }` varies unless the experiment varies the skills or tools (then the record's hashes say so). The denied-paths list withholds journeys and starting worlds.
- **Planted checks for the harness itself, as for prove:** a handler known bad must score fail; a run killed mid-turn must resume and score the same; a record's cost equals the sum of its turns.
- **Spend:** a suite states its dollar cap before it starts and stops at it; the free models run the mechanics for nothing.

## 13. Fit with the build

- **Package `packages/agent`, `@architect/agent`**, tags `scope:agent`, `env:build`, `layer:2` (see `design/packages.md`). Depends on `blueprint` (types), `compiler` (the model), `target-effect` (the `Timers` and `Clock` interfaces, types only), `prove` (`Collectors`, worlds), and on Pi. `cli` depends on it for `architect agent run` and `architect agent bench`. **Never runs in production** in v0; the Durable Object host (A6) is the first runtime use, tagged then as a separate entry (`@architect/agent/do`), the only runtime-facing file. Pi and its closure appear only in this package, so no generated project imports them.
- **Layer:** a layer 2 track beside the logbook (it needs only Gate 1, which has passed on `main`): dev tooling used from now by the build, not a new layer. Its Durable Object host needs L2.01 (cloud deploy, local worlds). Agent waits on the world clock wait for L5.01. Items beyond (declared `Run` kit, scheduled agents, Cloudflare sandbox) are in `design/later.md`.
- The steps are in `design/build-plan.md`, "The agent harness track".

## 14. Decisions this changes

- **D2 #76** stays true for check 4 (Agent SDK, our tools only). Check 4 does not switch to the new harness until A3 passes with the same assertions; then a second check (4b) runs through `@architect/agent`, and the SDK path stays as the comparison runner.
- **`design/later.md`'s Pi note** is replaced: Pi Durable is **adopted behind a seam** for the build-time harness (this record), no longer "the reference, not a dependency". The *declared-workflow* version of a durable agent (steps as declared operations, resumed by the world's `Timers`) stays in later.md for L5.04.

## 15. Questions only Aaron can answer

1. Is "Command Code" the service at commandcode.ai (a coding agent with a Provider API)? If it is another service, what is its address, and does it speak OpenAI's format?
2. May the harness be told, by name only, a secret in the project's environment config, with the value set outside the repository (D3 item 2), rather than read from anywhere on disk? (This is how the key must reach it; the design never reads or prints it.)
3. Should benchmarks with open models run against paid Command Code models, or only against its free ones until we agree a budget (per run $1, per suite cap, inside the $10 a day)?
4. Is the machine an acceptable sandbox for the first benchmarks, given that scoring executes model-written handlers on it, or do you want Docker first even though it delays the first run?
