# Slice 4's checks: a run that survives a restart

Written before M4.04 (#377, "The Pi Durable seam on Node SQLite", A1) is built, by an author who builds none of it
(`AGENTS.md`, "Journeys and checks come first"). They check `design/decisions/M4-agents.md` calls 2 to 4 and
`H1-agent-harness.md` H1.1 to H1.3 for the one claim slice 4 makes: **a run survives a process kill and resumes its
transcript**. They are the seam's own crash-mechanics tests, so they run on Pi's `faux` provider (call 5 allows it here
and nowhere else; no journey does). Every check is red today because `packages/agents` does not exist, and all of them
turn green with slice 4.

| Check | What it proves |
|---|---|
| `durable-01-tool-phase-kill` | killed (SIGKILL) after the model step committed and while the tool call is in flight, a fresh process resumes from `run.sqlite`, finishes under the same run id, and the transcript holds each committed step once; the provider's request count shows no committed step requested again; the cut tool call replays under the same request key and lands its effect once; a client's retry of the start adds nothing |
| `durable-02-model-phase-kill` | killed with the model's reply in flight: exactly one repeat of that request, none of a committed one |
| `durable-03-request-keys` | a tool's request key is namespaced by run and by Pi's task: two runs (and two turns of one run) whose provider reuses a tool-call id commit distinct keys, so an idempotent endpoint lands each effect |
| `durable-04-usage-carries-on` | after the resume the usage total is the sum of every committed step's usage, not restarted |
| `durable-05-time-is-injected` | a run whose `Clock` is three days ahead stores that clock's instants and not one of the platform's; its waits go through `Timers`, due on that clock; turns and tools run as counted work (`Busy`); the seam's source names no ambient clock or timer |

## How they are built

- **A child process is the run.** `child.ts` is the process a check kills: it builds the faux provider, a `Clock`
  offset from the platform's, and check-owned `Timers` and `Busy`, opens one run through the seam and prints
  `RESULT <json>`. `support.ts` starts it, waits for a line in a log, kills it with `SIGKILL` (by its PID, nothing
  wider), and starts a fresh one on the same folder. `child.ts` and `support.ts` are the check's, never the builder's.
- **The request count is a log the script writes.** The faux responses are functions of the step (how many tool
  results the request carries), so a restarted process answers each step the same way, and each writes a line to
  `requests.jsonl` *before* answering: `[process, step]`. Tool attempts (`attempts.jsonl`) and effects
  (`effects.jsonl`, an idempotent endpoint: the first request of a key lands, a repeat changes nothing) are logs too.
- **Literal expectations.** Every kind, id order, request sequence and result text is written in the check. The usage
  total is judged against the sum of the committed steps' own usage, which the transcript holds. The one time the
  expected value comes from the run (the entry ids after the kill) it comes from a read-only view taken *before* the
  resume, and says so.
- **Un-gameable.** The model's own message timestamps are a literal, so every instant in `run.sqlite` is the seam's;
  `durable-05` scans every column and every JSON text of the file for an epoch-millisecond number and refuses any that
  falls in the platform's window. A request key must carry the run id and differ across runs *and* across two turns of
  one run, so a key built from the provider's id, from the run alone or from the task alone fails.

## The surface these checks assume

H1.2 names the seam's services (`Agent`: open a run, submit, wait, watch, close) and M4-agents call 2 names `Host.node`
and the file, and nothing else names the types, so this is the author's call. It is the smallest surface that can be
killed and resumed; the builder may add to it and may not change what the checks use. `child.ts` imports
`packages/agents/src/index.ts` by path (the package exists with slice 4; `e2e` may depend on it by name then).

```ts
// packages/agents/src/index.ts
export class Agent extends Context.Service<Agent, {
  /** Open the run `run`, creating `<root>/.orthograph/runs/<run>/run.sqlite` on first use. Opening an existing run
   *  resumes whatever it left unfinished: a tool call cut off replays (idempotent: "request"); a model request cut off is
   *  sent again. Closing the Scope closes the run. */
  readonly open: (options: {
    readonly run: string;
    readonly model: { readonly provider: string; readonly modelId: string };
    readonly tools: ReadonlyArray<AgentTool>;
  }) => Effect.Effect<Run, AgentError, Scope.Scope>;
  /** A read-only look at a run's committed state, from any process: recovers nothing, resumes nothing, writes nothing. */
  readonly view: (run: string) => Effect.Effect<RunView, AgentError>;
}>()("@orthograph/agents/Agent") {}

/** The Node host: one `node:sqlite` file per run under `root`. `models` is a pi-ai `Models` the run's provider is in. */
export const Host: { readonly node: (options: { readonly root: string; readonly models: Models }) => Layer.Layer<Agent, never, Timers | Busy> };

export interface Run {
  readonly id: string;
  /** Admit an input once per `key`: a second submit with the same key adds nothing (Pi's `requestId`). */
  readonly submit: (input: { readonly key: string; readonly content: string }) => Effect.Effect<void, AgentError>;
  /** Wait until the run has nothing left to do: `done`, or `unanswered` with a reason. */
  readonly wait: Effect.Effect<{ readonly status: "done" } | { readonly status: "unanswered"; readonly reason: string }, AgentError>;
  readonly view: Effect.Effect<RunView, AgentError>;
}

export interface AgentTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: object;                 // JSON Schema
  readonly idempotent: "request";              // replayed after a crash, keyed (the seam maps it to Pi's replay: "safe")
  readonly execute: (args: unknown, call: { readonly requestKey: string; readonly callId: string }) => Effect.Effect<string, AgentError>;
}

export interface RunView {
  readonly run: string;
  /** The messages the model sees, oldest first: the input, each reply, each tool result. Bookkeeping entries are not here. */
  readonly entries: ReadonlyArray<{
    readonly id: string;                       // stable across processes
    readonly kind: "user" | "assistant" | "tool-result";
    readonly at: number;                       // the message's own instant: a user or tool-result entry is stamped by `Clock`; an assistant's is its provider's
    readonly text: string;
    readonly usage?: { input: number; output: number; cacheRead: number; cacheWrite: number };   // on assistant entries only, and only these four fields
    readonly toolCalls: ReadonlyArray<{ readonly callId: string; readonly name: string }>;        // on every entry: empty unless an assistant entry called tools
  }>;
  /** The run's total usage, from storage: every committed step, across every process that worked on the run. */
  readonly usage: { input: number; output: number; cacheRead: number; cacheWrite: number };
}
```

What the checks provide to the seam, by Effect services: `Clock` (a clock three days ahead in `durable-05`, the platform's
elsewhere), `Timers` (`at`, `sleep`, `within`, firing on that clock, each call logged) and `Busy` (`BusyLive`). The seam
reads time only from `Clock`, waits only through `Timers`, and runs a turn and a tool call inside `Busy.counted` (or holds
a token while it works). `Host.node` takes no `Clock` or `Timers` of its own: it reads the ones in its environment.

What a request key looks like is the builder's, with two rules the checks hold: it carries the run id as written, and it
differs for two tool calls with the same provider id in one run (Pi's task id). It is the same on a replay.

How the faux script and its request count are read: `child.ts` calls `fauxProvider()` itself, scripts it by step and
writes `requests.jsonl`; the seam only ever sees `models` and the model's `provider` and `modelId`. The two Pi
packages the check touches, `@earendil-works/pi-ai` and (through the seam) `pi-durable`, are pinned at 1.5.0 exactly; `e2e`
takes `pi-ai` 1.5.0 and `effect` 4.1.4 as devDependencies for `child.ts`, and `pnpm-workspace.yaml` lists the two build
scripts that `pi-ai`'s tree pulls in (`@google/genai`, `protobufjs`) as not run.

## Running them

```bash
pnpm nx run e2e:agents-ratchet
```

as the folder README says. One file runs alone with
`cd e2e && pnpm exec vitest run --root . --config vitest.agents.config.ts agents/durable/durable-01`. A scenario takes
10 to 30 seconds: it starts two or three Node processes and Pi's retry backoff is real time.
