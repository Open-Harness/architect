# M4-agents: where an agent run lives

**Decided 22 November 2026 by Goal 10's lead** (claude, claude-opus-5-5), as slice 1 of Goal 10 (M4.01), under
`AGENTS.md`, "Who decides". It puts H1 (the harness) and H2 (runs and benchmarks) under the frame: the names, packages
and places they had in layers 1 and 2 become Orthograph's, with the evidence `spikes/durable-run` measured since.
Every later slice of Goal 10 builds on these calls.

## The problem, in code

H1 and H2 designed the harness for a package that never existed, `@architect/agent` (`decisions/H1-agent-harness.md:145`),
running outside any world on a real clock (`H1-agent-harness.md:159`: "The agent runs *outside* any world … so its
`Timers` is a real-clock layer"). Since then the frame made an agent run a declared thing (`frame/examples/agents.md:36-64`),
K23 put every wait on the world's clock (`decisions/K23-time.md:221`, "Agents | `Timers`, the world's"), K10 made the
same layer serve the portal's chat and the building agents (`decisions/K10-factory.md:50-87`), and the spike measured
one run per Durable Object (`spikes/durable-run/README.md`). Nothing yet says which package holds what, which model
server stands in for a provider, or what "no second model call" promises.

## The calls

### 1. The Run is a thing of `@orthograph/agents`, a feature plugin

`packages/agents` is `@orthograph/agents`, a `Blueprint.feature` (`packages/orthograph/src/modules/plugins/README.md`).
It declares `Run` with the machine of `frame/examples/agents.md:53-64` (`working`, `waiting`, `done`, `failed`,
`cancelled`), `Agent` as a thing read from the app's `Blueprint.agent` declarations (K10 section 1), and the operations
`run.start`, `run.get`, `run.list`, `run.steer`, `run.cancel`, with `finish`, `fail`, `wait` and `wake` allowed to
`Blueprint.system` only. `run.start` takes `key`, the caller's request key; `runFinished.outcome` is closed (`pushed`,
`reviewed`, `answered`, `blocked`) and `runFailed.reason` is closed (`budget`, `turns`, `wall`, `refused`, `model`,
`sandbox`, `crash`) with `transient` (K10 section 5). A full pool is the typed refusal `RunPoolFull`.

Only a person starts a run, through `Via.session` or `Via.key`, unless the app's mount allows agents (S15,
`frame/examples/agents.md:300-305`). A run's tools call as `agent for` its starter, so the server's roles decide what it
may do; an agent is a caller like any other.

**The row** (agent, model, brief, budget, spent, state, starter) lives in the database, so runs list and filter. **The
transcript**, checkpoints, tool outputs and usage live in Pi's storage, one SQLite store per run (call 2). Pi owns the
transcript; the machine owns the lifecycle; the loop calls `wait`, `wake`, `finish` and `fail` as `system` when Pi
ends a phase, so the two never disagree for longer than one call (H1 section 11).

### 2. Where Pi runs: one SQLite Durable Object per run, one SQLite file per run on Node

The loop is Pi Durable behind an Effect seam (H1.1, H1.2), with the six packages H1.1 names (`pi-durable`, `pi-ai`, `chord`, `pi-codemode`,
`pi-schema`, `pi-telemetry`, under `@earendil-works/`) pinned at **1.5.0** exactly; the spike measured the first three at
that version (`spikes/durable-run/package.json:11-12`). The seam is the only code
that imports Pi; every Pi promise is wrapped once in `internal/` into a typed `AgentError`.

| Host | Where a run lives | Who wakes it |
|---|---|---|
| `Host.worker` (an app, a world, staging) | one SQLite Durable Object per run, Pi's tables under a prefix | the object's alarm, armed before work is admitted (spike, "The decision it supports") |
| `Host.node` (the bench, a developer's machine, the first runner) | one `node:sqlite` file per run, `.orthograph/runs/<run>/run.sqlite`, beside the run folder (H2.2) | the process, through `Timers`; a killed process resumes from the file |

The Node store comes first (slice 4, M4.04) because it needs no workerd; the Durable Object host is slice 9 (M4.09).
Both are the same seam with a different store layer, so a run's code never knows which it is on.

### 3. What "no second model call" promises

A model reply that Pi has committed is never requested again, and a tool call that committed is never committed twice.
That is what the spike proved (`spikes/durable-run/README.md`, findings 1 and 3; its table's second row, "Evict with tool reply held").
A model request **still in flight** when the host dies is sent again on resume (finding 2, the table's third row): no provider can resume a
cut stream, so this is the honest limit, and K10 section 1 already records it.

So "evicting mid-turn resumes with no duplicate model call" (M4.09, M4.16 and Gate M4 item 2) is proved by evicting in
the **tool phase**, after the model's step committed, and counting model requests at the stand-in: none extra. A
second, separate check evicts with a model reply held and asserts exactly one repeat of the unfinished request and
none of any committed one. Both are journeys; neither is softened.

A tool's request key is `(run, Pi task id, provider call id)`, never the provider's id alone (finding 3), and a tool is
replayed only for an operation whose `idempotent: "request"` is proved; any other operation is not a tool until it is.

### 4. Time is the world's

`now` is Effect's `Clock`, which a world provides (M8.06). Every wait is `Timers`: retry backoff and Pi's `sleepUntil`
are `Timers.sleep`, a model call's deadline is `Timers.within` (optional in today's interface, so Goal 10 needs it present in the world's `Timers`; asked in #464), and a turn runs inside `Busy.counted` so a world's
`advance` waits for it. Provider retries are zero, so all retrying is Pi's stored sleep (H1.3). Our model adapters are
written on Effect's HTTP client as `pi-ai` providers (`createProvider`), not over a vendor SDK, so the provider path holds
no `setTimeout` (the spike found two, in the OpenAI SDK's `fetchWithTimeout`, finding 5). Pi AI's own `Date.now` reads
(ids and timestamps) read the world's `Date` that the Worker's entry installs per request (M8.06, after the M8.05 spike), and on Node
the process's real clock. H1.3's real-clock agent is superseded: an agent in a world waits on the world's clock.

How a timer survives the Durable Object's eviction is Goal 9's call in M8.07. Its answer to #464
(`design/decisions/M8-timers-shape.md`, #483) is a second service beside `Timers`: `DurableTimers.set(at, owner, name,
wake)`, once per `(owner, name)` while pending, and `clear(owner, name)`, with the host's `wakesByKind({ agent: … })`
waking the run's object. So a run's owner is `agents/run/<run>`, each wait has its own name (`backoff-<attempt>`,
`sleep-<pi task id>`), and a woken run is idempotent by `(owner, name, at)`. Goal 10 codes against that, on
`TimersMemory` until M8.07 lands, never on a stand-in of its own.

### 5. Models: two adapters, and a real local model for every check

| Package | What it is | Where its key comes from |
|---|---|---|
| `@orthograph/anthropic` (`packages/anthropic`) | the Anthropic Messages adapter | the declared secret `ANTHROPIC_API_KEY` (`frame/secrets.md`), runtime or builder by who runs it |
| `@orthograph/openai` (`packages/openai`) | the OpenAI-compatible Chat Completions adapter: any server that speaks it, Command Code's open models in staging and the local stand-in in a world | its mount's declared secret, named from the mount's file as `frame/examples/agents.md:208-209` says (`blueprint/adapters/commandcode.ts` gives `COMMANDCODE_API_KEY`); the stand-in needs none |
| `@orthograph/stand-in-model` (`packages/stand-in-model`) | `Stand.process` for a model: the pinned local server and model below, fetched once into a cache by checksum, started by a world, owned by its PID and stopped at the end | none |

**The stand-in** (S14, the frame's second rung, `frame/examples/agents.md:218-222`):

- **Server:** llama.cpp's `llama-server`, release **`b12503`** (published 18 November 2026, older than three days),
  the prebuilt binary for macOS arm64 and Linux x64 from `github.com/ggml-org/llama.cpp/releases`, run with `--jinja`
  so tool calls use the model's own template, at temperature 0 and a fixed seed.
- **Model:** **Qwen3 0.6B**, `Qwen3-0.6B-Q8_0.gguf` from `huggingface.co/Qwen/Qwen3-0.6B-GGUF` at revision
  `23749fefcc72300e3a2ad315e1317431b06b590a`, 639,446,688 bytes, SHA-256
  `9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031`. A file whose checksum differs is refused.

Pi's `faux` provider is our own fake, so it stays inside the seam's unit tests of crash mechanics (H1 section 9) and
is never in a journey. Every check of Goal 10 runs on the stand-in; no key is needed and none is held (the brief's
limits). If slice 6 measures that Qwen3 0.6B does not call a simple tool reliably at temperature 0, the next model up
the same family (Qwen3 1.7B) is the fallback, pinned the same way in that slice's pull request.

### 6. Tools, telemetry and the record, as H1 and H2 said

- **Tools** (slice 7): `toolsOf(operations)`, one pure function shared with MCP and the actions projection, added
  beside Goal 5's actions module, never inside it; an operation marked `.notVia(Via.agent)` is never a tool (K10
  section 1). Project tools and `SKILL.md` folders are H1.5 (a) and H1.6, unchanged.
- **Telemetry** (slice 8): H1.8's `PiTelemetry` adapter onto Effect's OTLP layer, spans `agent.run`, `agent.turn`,
  `agent.tool.<name>` and Pi's `pi.durable.*`, never any content.
- **The record and the scorer** (slice 3): H2's run folder and `RunRecord`, the trusted scorer as its own stage, and
  check 4 (`e2e/layer1/04-agent-writes-a-handler.test.ts`) as the first runner. They live in `@orthograph/agents`'
  `runs` and `score` modules, on Node.

### 7. What a journey asserts

States, events, refusals, spans, usage and request counts at the stand-in; never what the model said
(`frame/examples/agents.md:152-156`). Whether a model is good at a brief is the bench's question (M4.14, off this goal).

## Evidence

- `spikes/durable-run/README.md` (merged): one SQLite Durable Object per run on workerd 1.20261101.1 with Pi 1.5.0;
  three cuts, their model and commit counts; bundle 419,089 bytes gzip, `nodejs_compat` not needed.
- `decisions/H1-agent-harness.md` sections 3, 7, 9 and 11; `decisions/H2-agent-runs-and-benchmarks.md` (the record,
  runners and scorer); `decisions/K10-factory.md` sections 1 and 5; `decisions/K23-time.md` section 6.
- llama.cpp's release list and the model's metadata, read on 22 November 2026:
  `gh api repos/ggml-org/llama.cpp/releases` (b12503 at 2026-11-18T08:28:45Z) and the model file's `x-linked-etag` and
  `x-linked-size` at the pinned revision.

## Open risks

- Qwen3 0.6B's tool calls at temperature 0 are not yet measured (slice 6 measures them first, with the fallback above).
- The stand-in's binary and model are a 640 MB download into a cache, locally and in CI; slice 6 caches it by checksum.
- How a durable timer reaches an evicted Durable Object waits on M8.07 (#464).

## Supersedes

Live docs, rewritten in this change (M4.16's `doneWhen` in `tasks.json` is the M4.16 line above, same words):

- `design/milestones.md`, Gate M4 item 2: "evicting a run's Durable Object mid-turn resumes it with no second model" → "evicting a run's Durable Object mid-turn, after its model step committed, resumes it with no second model call, and evicting it with a model reply in flight repeats only that one request"
- `design/milestones.md`, M4.09's done-when: "evicting mid-turn resumes with no duplicate model call" → "evicting mid-turn, after the model's step committed, resumes with no duplicate model call; evicting with a model reply in flight repeats only that request"
- `design/milestones.md`, M4.16's done-when: "evicting a chat's run mid-turn resumes it with no second model call" → "evicting a chat's run mid-turn, after the model's step committed, resumes it with no second model call"
- `design/milestones.md`, M4.05: "`@orthograph/anthropic` and an OpenAI-compatible adapter" → "`@orthograph/anthropic` and `@orthograph/openai`, the OpenAI-compatible adapter"
- `design/milestones.md`, M4.06: "The local stand-in model, `Stand.process` (S14) |" → "The local stand-in model, `Stand.process` (S14): `@orthograph/stand-in-model`, llama.cpp's server and Qwen3 0.6B, pinned by checksum |"
- `design/goals/10-agents.md`, the card's "Why": "never loses its place or repeats a paid model call" → "never loses its place or pays twice for a model answer it already has"
- `design/goals/10-agents.md`, the card's "When it's done": "watch it resume with no second model call" → "watch it resume without asking the model again for any answer it already had"
- `design/goals/map.md`, Goal 10's row: "| 1.0 | ready | `@orthograph/agents`, `@orthograph/anthropic`, the stand-in model |" → "| 1.0 | running (Claude) | `@orthograph/agents`, `@orthograph/anthropic`, `@orthograph/openai`, the stand-in model |"
- `design/packages.md`: "`@orthograph/agents` (M4), `@orthograph/stripe`" → "`@orthograph/agents` (M4), with its model adapters `@orthograph/anthropic` and `@orthograph/openai` and the local stand-in `@orthograph/stand-in-model` (M4.05, M4.06), `@orthograph/stripe`"
- `.agents/skills/kanban/data/lanes.json`, M4's gate: "mid-turn resumes it with no second model call; (3)" → "mid-turn, after its model step committed, resumes it with no second model call, and evicting it with a model reply in flight repeats only that one request; (3)"
- `.agents/skills/kanban/data/tasks.json`, M4.09's `doneWhen`: ""evicting mid-turn resumes with no duplicate model call"" → ""evicting mid-turn, after the model's step committed, resumes with no duplicate model call; …""

## Dated records

A "Superseded by M4-agents, 22 November 2026" note is added beside these words, which stay as written:

`@architect/agent` (now `@orthograph/agents`) in `decisions/H1-agent-harness.md` (H1.1, section 13 and the D2 #76 line),
`decisions/H2-agent-runs-and-benchmarks.md` (every mention) and `design/decisions.md` (the H1 and H2 entries); H1.3's
"The agent runs *outside* any world … real-clock layer" (now: an agent in a world waits on the world's clock; K23 had
already moved the slice, as M4.26); and H1.4's `commandcode` provider (now `@orthograph/openai`, one OpenAI-compatible
adapter for Command Code and the stand-in). The older briefs and plan (`design/briefs/F4-portal-plan-and-state.md`,
`design/briefs/codex-handoff.md`, `design/build-plan.md`) name `@architect/agent` as records of their day and are left
as written.
