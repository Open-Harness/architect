# The builder agent

How the agent that builds a Blueprint app runs, what it is given, and how it reaches the app it is building. A frame,
17 November 2026, part of [`README.md`](README.md). Commands are Orthograph's (`ortho`); `@orthograph/agents` is designed (H1, H2), not built; the builder projection is where it is going.

The short version: one tool layer, used three ways. Its main interface is **code mode**. The agent writes a few lines of
TypeScript against a typed `bp` object generated from the model, the script runs in a sandbox, and only what it returns
enters the agent's context. Writes to the project go through one direct tool, never through a script. Telemetry is read
through our own `TraceSource`, by model names, not through a vendor's MCP.

## 1. Who the builder is, and the three ways it runs

The builder is an audience of the description, like a caller or a reader (README, "Audiences"). What it needs is a
projection: the **builder projection**, mounted in every app, rendering `generated/builder/` (the typed `bp` API, its
`.d.ts`, and the brief texts) from the model. Like every projection, it is regenerated on each run, so the agent's
tools never drift from the app.

| | Interactive | Unattended | In CI |
|---|---|---|---|
| Who | Claude Code or Codex on the developer's machine, with a person watching | the harness, `@orthograph/agents` (H1), on Pi Durable 1.5.0 behind an Effect seam | check 4 today; the benchmark suites (H2) |
| How it reaches the tools | `blueprint mcp`, a stdio MCP server the project's `.mcp.json` names | the same tool layer, in process, as the harness's `Tool`s (H1.5) | the same tool layer, through the `Runner` kinds `sdk`, `pi`, `oracle`, `null` (H2, `H2-agent-runs-and-benchmarks.md:45`) |
| Where its code runs | the project itself | a throwaway tools-only copy of the project (H1.7) | a copy, with the journeys taken out while it works (`e2e/layer1/04-agent-writes-a-handler.test.ts:68-69`) |
| Its own shell | yes, governed by the agent's own permission settings | none | none |
| Enforcement | partial: the person is the backstop; `check` still catches writes outside the brief | total: the tools are all it has | total |

**One tool layer, `BuilderTools`.** It is a module in the CLI package with the six slots. Its services are Effects over
the compiler, `prove`, the brief and `TraceSource`. `blueprint mcp` is a thin entry file that exposes it over stdio. The
harness wraps the same functions as Pi tools. Check 4's hand-written tools (`04-agent-writes-a-handler.test.ts:27-56`:
`read`, `list`, `write_handler`, `check`) become its first users, moved in as H1.5 already planned.

The interactive row is honest about its limit. Claude Code also has its own shell, and no tool layer of ours can fence
that. What still holds is that `check` rejects an edited output or a forbidden path, and a person is watching.
Unattended and CI runs have no shell at all, so there the tools are the whole boundary.

## 2. Code mode is the primary interface

**Why.** An agent wants to ask questions like "every refusal of `allowance.spend` in the last hour, grouped by tag". Done
one tool call at a time, that is a trace listing, then N trace reads, then the agent grouping JSON in its head. Hundreds of
spans land in context and are paid for, and most of them are noise. In code mode the agent writes the query, the sandbox
runs it, and three lines come back.

**How it runs, in each mode.**

- **Harness:** Pi Durable already ships code mode (`pi-codemode`, a QuickJS sandbox, Pi's `README.md:355`). H1 left it
  unused at first (H1, line 69). This turns it on, with `bp` as the only binding.
- **Claude Code and Codex:** `blueprint mcp` has a `run` tool. It takes a script, runs it in a QuickJS sandbox inside
  the MCP process, and returns the script's return value. It is the same sandbox and the same bindings as the harness.
- **Why QuickJS and not a workerd isolate.** The bindings must reach the compiler, the files and `prove`, which live in
  the host process. An isolate would need all of that proxied over HTTP. A Dynamic Worker isolate is the right sandbox
  for a later *operator* agent, whose only tools are the app's operations (H1 section 10).

**What the sandbox allows.** No file system, no `fetch`, no `process`, no timers of its own. The only global is `bp`. Each
`bp` function is a host function backed by an Effect, run at the entry file, so our lint rules hold in our code. The
agent's script may use `async`, because it is the agent's code and not ours. Limits are 10 seconds of wall clock through
`Timers`, 64 MB of memory, and a return value capped at 8 KB, which is truncated with a note saying so.

**The generated API.** `generated/builder/bp.d.ts` is rendered from the model, so the names are the app's own and a
misspelt operation is a type error in the agent's script. This is what the agent reads first, through `describe`.

```ts
// generated/builder/bp.d.ts — Generated from the model. Do not edit. (sketch)
type Operation = "allowance.grant" | "allowance.spend" | "allowance.revoke" | "allowance.get" | "wallet.link" /* … every operation, features' included */;
type Refusal<O extends Operation> = O extends "allowance.spend" ? "AllowanceExceeded" | "AllowanceNotActive" | "NotAllowed" : string;
type StartingWorld = "founded" | "funded" | "invited";
type Env = "local" | "test" | "staging";            // never "production": see section 5
type Through = "api" | "sdk" | "cli" | "mcp" | "react"; // generated from the mounts that have a replay: sdk in node, react in a real browser

interface Bp {
  model: {
    things: Record<string, { fields: string[]; states: string[]; roles: string[]; lives: "database" | "actor" | "chain" }>;
    operation(name: Operation): { payload: object; answer: object; errors: string[]; move?: string; allowed: string[]; steps: string[]; budget?: string; runs: "server" | "client" | "chain"; from: "app" | `feature:${string}` };
    uses(name: Operation): { things: string[]; roles: string[]; adapters: string[] };   // what a change to it makes stale
  };
  brief(name: Operation): { write: string[]; read: string[]; do: string[]; doneWhen: string[] };
  files: { read(path: string): string | undefined; list(path: string): string[] };      // denied paths simply don't exist
  check(): { ok: boolean; findings: Array<{ rule: string; file: string; line: number; say: string }> };
  prove(o: { operations?: Operation[]; through?: Through[]; env?: "local" | "test" }): {
    ok: boolean;
    operations: Array<{ name: Operation; evals: Record<string, "pass" | { fail: string; trace: string }> }>;
    journeys: Array<{ name: string; ok: boolean; failedAt?: { step: string; trace: string } }>;
  };
  impact(file: string): { version: "major" | "minor" | "patch" | "none"; stale: Operation[]; regenerates: string[]; journeys: string[] };
  world: {
    start(from: StartingWorld): World;   // a fresh local world; destroyed when the script ends
  };
  telemetry: Telemetry;
  verdicts(name?: Operation): Array<{ operation: Operation; env: Env; revision: string; ok: boolean; stale: boolean }>;
}

interface World {
  cast: Record<string, string>;          // cast member → principal, from the starting world
  facts: Record<string, string>;         // named ids the starting world made: allowance, organization, …
  as(member: string): { call<O extends Operation>(op: O, payload: object): Call<O> };
  record(thing: string, id: string): Record<string, unknown> | undefined;   // the public fields only
}

type Call<O extends Operation> =
  | { answered: unknown; trace: string; ms: number }
  | { refused: Refusal<O>; trace: string; ms: number }
  | { defect: string; fingerprint: string; trace: string };

interface Telemetry {
  trace(id: string, o?: { env?: Env }): TraceTree;
  counts(o: { operation?: Operation; since: string; env?: Env }): Array<{ operation: Operation; outcome: "answered" | "refused" | "defect"; refusal?: string; principalKind: string; count: number }>; // ortho.calls: every call, span or not (O2 gap 3)
  calls(o: { operation?: Operation; outcome?: "answered" | "refused" | "defect"; since: string; env?: Env }): Array<{ operation: Operation; outcome: string; tag?: string; ms: number; trace: string; principal: string }>; // calls that opened a span
  refusals(o: { since: string; env?: Env }): Array<{ operation: Operation; tag: string; count: number; sample?: string }>; // counted from ortho.calls; a sample when a span opened
  defects(o: { since: string; env?: Env }): Array<{ fingerprint: string; operation: Operation; type: string; message: string; count: number; first: string; last: string; sample: string }>;
  slow(o: { since: string; env?: Env }): Array<{ operation: Operation; p95: number; budget: number; over: number; worstStep: string; retried: number }>; // worstStep may be "commit" or "handler" (O2 gap 1)
}

type TraceTree = { name: string; ms: number; outcome: "ok" | `refused ${string}` | `defect ${string}`; attrs: Record<string, unknown>; logs: string[]; children: TraceTree[] };

declare const bp: Bp;
```

## 3. Scripts an agent writes, and what comes back

**Why did my spend fail?** This is the first thing after a red `prove`.

```ts
const r = bp.prove({ operations: ["allowance.spend"] });
const bad = r.operations[0].evals;
const failed = Object.entries(bad).filter(([, v]) => v !== "pass");
return failed.map(([evalName, v]) => {
  const t = bp.telemetry.trace((v as { trace: string }).trace);
  const flat = (n: typeof t): string[] => [`${n.name} ${n.outcome} ${n.ms}ms`, ...n.logs.map((l) => `  log: ${l}`), ...n.children.flatMap(flat)];
  return { evalName, why: (v as { fail: string }).fail, trace: flat(t) };
});
```

```text
[{ "evalName": "steps", "why": "allowance.spend.record ran on a refusal",
   "trace": ["allowance.spend refused AllowanceExceeded 41ms", "  log: the amount is more than is left",
             "allowance.spend.load ok 6ms", "allowance.spend.record ok 9ms"] }]
```

Four lines instead of a trace dump. The agent sees that it wrote before it checked.

**Try it as the grantee, by hand,** without a journey (it can't read them anyway).

```ts
const w = bp.world.start("funded");
const olga = w.as("olga");
const a = olga.call("allowance.spend", { allowance: w.facts.allowance, amount: 120n, memo: "train" });
const b = olga.call("allowance.spend", { allowance: w.facts.allowance, amount: 9999n, memo: "hotel" });
return { a, b, after: w.record("allowance", w.facts.allowance) };
```

**What was refused in the last hour, on test?**

```ts
return bp.telemetry.refusals({ since: "1h", env: "test" }).sort((x, y) => y.count - x.count).slice(0, 5);
```

**Which operations are over budget, and where is the time going?**

```ts
return bp.telemetry.slow({ since: "24h", env: "staging" }).filter((s) => s.over > 1.2)
  .map((s) => `${s.operation} p95 ${s.p95}ms vs ${s.budget}ms, mostly ${s.worstStep}`);
```

## 4. The few direct tools, and why each is direct

| Tool | What it does | Why it is not inside code mode |
|---|---|---|
| `describe` | returns `bp.d.ts`, trimmed to what a name or prefix asks for (`describe allowance.spend`) | the agent needs the types before it can write a script |
| `run` | runs a script against `bp` and returns its value | it is code mode |
| `brief` | the job: what to write, read and do, and when it is done (today's `brief`, `packages/cli/src/modules/brief/service.ts:19-43`) | it starts every task, and it belongs in the transcript word for word |
| `write` | writes one whole file, only at a path the brief allows | **side effects stay visible**: every change to the project is one tool call a reviewer can read, never hidden inside a script |

Reads, queries, worlds, `check`, `prove`, `impact` and telemetry are all in code mode. Each one reads or runs something
in a throwaway world, so it changes nothing that persists. Writing to the project is the one action that is a tool of its
own.

**One tool per action against code mode.**

| | A · one tool per action (today's check 4, the generated MCP's shape) | B · code mode plus four direct tools (recommended) |
|---|---|---|
| Context cost | every intermediate result enters context | only the returned value, capped |
| Composing | the agent stitches results in its head, turn by turn | the agent writes `filter`, `map`, `groupBy` |
| Typing | JSON Schema per tool; names are strings | the model's names are a TypeScript union; a typo fails the script |
| Auditing writes | the same | the same: writes are a direct tool in both |
| Model support | any model that calls tools | any model that writes TypeScript; weaker models write worse scripts |
| What we build | many small tools | one sandbox, one `.d.ts` renderer, the bindings |

**B**, because its context cost scales with the answer, not the data. The failure case is a weak model writing bad
scripts, and the remedy is cheap: the same functions also exist as plain tools (`bp_prove`, `bp_trace`, …) behind a
switch, for the `pi` runner on open models. H2's benchmarks then measure which wins per model.

## 5. Our own telemetry tools, not a vendor's MCP

O1 already chose one tool, `ortho telemetry trace`, "the one agent surface"
(`packages/cli/src/modules/telemetry/README.md`). It allowed PostHog's MCP read-only at most and Axiom's never
(`O1-observability.md:293-295`). `bp.telemetry` takes that to its end: the builder needs no vendor MCP at all.

| Why ours | What it rests on |
|---|---|
| **Names from the model.** `calls({ operation: "allowance.spend" })` is typed; a vendor query is a string the agent guesses | span names are the operations' paths and steps (`<operation>.<step>`, O1 line 206) |
| **A refusal is not a defect.** It is counted as an expected outcome, never as an error | O1's conventions: `refusal=<Tag>` with status ok; `defect` with status error and a fingerprint (`O1-observability.md:204-213`) |
| **Defects come grouped.** One row per fingerprint, with a count and a sample trace | the defect record: operation plus type (O1 line 213) |
| **Redacted at the source.** A private or secret field never reaches a span, so it cannot reach the agent | the public-field allowlist (L2.P, `O1-observability.md:391-408`) |
| **Read-only by construction.** `TraceSource` has `traces`, `find` and `window`, and nothing that writes (`packages/prove/src/modules/telemetry/types.ts:55`) | Axiom's MCP can edit monitors and dashboards and has no read-only mode |
| **The same reader everywhere.** `FileSource` reads the local Collector's `traces.jsonl`; `AxiomSource` reads a deployed environment | `prove/src/modules/telemetry/internal/{file-source,axiom-source}.ts` |
| **Joins the agent's own calls.** A world call sends a `traceparent` and gets `x-trace-id` back, so the agent's script holds the trace id of every call it makes | `packages/host-cloudflare/src/modules/telemetry/service.ts:32-39` |

`refusals`, `defects` and `slow` are pure functions over `window(since)`, and `counts` over a `MetricSource` beside it ([`skills.md`](skills.md) section 4.3). They group and summarise in the host, so only
summaries cross into the sandbox, and only what the script returns crosses into context.

## 6. Boundaries, and what holds each one

| Boundary | Rule | Held by |
|---|---|---|
| What it writes | only the brief's `write` paths | the `write` tool refuses any other path, using `realpath` and case-insensitive matching (check 4's rule, `04-agent-writes-a-handler.test.ts:27-32`); `check`'s forbidden list (`brief/service.ts:3-5`) |
| What it never reads | journeys, starting worlds, tests, the evals' fixtures | `bp.files` treats them as absent (check 4's `DENIED`, `:18`); unattended, the copy has no journeys in it at all |
| What it never sees | secret values; private and secret fields | worlds generate their own secrets and the tool layer never holds a value ([`secrets.md`](secrets.md)); fields are cut by visibility, as the generated MCP already does (`language-effect/src/modules/mcp/README.md:9`) |
| Which worlds it may call into | fresh local worlds, made for the script and destroyed after it | `bp.world.start` makes only local worlds; there is no binding that calls a deployed environment |
| Which telemetry it may read | local and test whole; staging redacted; production never, unattended | `Env` has no `production`; a supervised session reads production through `ortho watch` like a person |
| How much it may spend | turns, dollars and wall clock per run | the harness's limits (H1.7: default $1 a run inside the $10 a day) |
| Who judges it | not itself | the scorer is a separate, trusted stage (H1.7, H2.7); the builder's own `prove` is a hint, the verdict is CI's |

None of this lives in a prompt. A rule that only a prompt states doesn't hold, so each one is a missing binding, a
refused path or a fact about the copy.

## 7. The builder's day: from brief to green

An unattended run on `allowance.spend`, with the handler scaffolded blank.

```text
→ brief allowance.spend
  Write src/allowance/spend.ts, and nothing else.
  Do  run step allowance.spend.load (database) · run step allowance.spend.record (database)
      make the move with move("active" | "exhausted"): spend, emitting AllowanceSpent
      refuse with AllowanceExceeded (exit 40), each after an Effect.logInfo saying why
      never refuse AllowanceNotActive or NotAllowed yourself: the runtime does
  Done when prove passes, with allowance.spend's 9 evals, and 3 journeys that call it

→ describe allowance.spend            (the operation's slice of bp.d.ts, and its handler type)
→ run  return bp.files.read("src/allowance/grant.ts")          (a neighbour, for the house style)
→ write src/allowance/spend.ts        (first attempt)
→ run  return bp.check().findings
  []
→ run  (the "why did my spend fail" script from section 3)
  [{ evalName: "steps", why: "allowance.spend.record ran on a refusal", … }]
→ write src/allowance/spend.ts        (checks the limit before recording)
→ run  const w = bp.world.start("funded"); … return { a, b }
  { a: { answered: { remaining: 380n } }, b: { refused: "AllowanceExceeded" } }
→ run  return bp.prove({ operations: ["allowance.spend"], through: ["api", "sdk", "cli"] }).ok
  true
  done. The scorer then puts the journeys back and runs check and prove itself (H2.7).
```

Eight calls in all, and the agent's context never held a raw trace.

## 8. Today and proposed

| Piece | Today | Proposed |
|---|---|---|
| Brief | `ortho brief`, `packages/cli/src/modules/brief/service.ts:19-43` | the same text, also `bp.brief` returning structure |
| Project tools | check 4's four tools, written into the test (`04-agent-writes-a-handler.test.ts:27-56`) | `BuilderTools` in the CLI package; `blueprint mcp`; the harness wraps the same |
| Agent harness | not on `layer/3`; designed in H1 and H2, steps A0 to A9 (`build-plan.md:159-167`) | the same, with code mode switched on |
| Code mode | `pi-codemode` named in H1 and "unused at first" (H1 line 69) | the main interface: `run` plus `bp.d.ts` |
| Telemetry | `TraceSource` (`prove/src/modules/telemetry/types.ts:55`); `ortho telemetry trace <id>` (`cli/src/modules/telemetry/README.md`) | `bp.telemetry`: `trace`, `calls`, `refusals`, `defects`, `slow` |
| Worlds from a script | prove makes worlds for journeys only | `bp.world.start(startingWorld).as(member).call(...)` |
| Impact | `ortho impact` (`cli/src/main.ts:169`) | `bp.impact`, structured |
| Replay through projections | journeys go over raw HTTP (`prove/.../journeys/internal/world.ts:85`) | `prove({ through })`, [`projections.md`](projections.md) |
| The typed API | none | `generated/builder/bp.d.ts`, from the builder projection |

## 9. Open questions and risks

**For Aaron:**

1. **Should an unattended builder ever read staging telemetry**, redacted, through a scoped read token? The
   recommendation is yes for staging and never for production, because staging is where "it passed locally but not
   there" shows up. It needs a query token by name ([`secrets.md`](secrets.md)), and creating it needs your yes.

**Risks:**

- **QuickJS bindings are an attack surface.** Every host function is a door out of the sandbox. Keep them few, read-only
  except `world` (which only makes local worlds), and test them as their own module.
- **`pi-codemode` churns with Pi.** It is held behind the H1 seam like the rest of Pi. If it goes, `quickjs-emscripten`
  directly is about the same size.
- **Weak models write bad scripts.** The plain-tool switch in section 4 is the remedy, and H2's suites measure it.
- **The interactive shell is unfenced.** Claude Code's own shell can read journeys. The answer for interactive work is
  that a person is present and the verdict is CI's, not the session's.
- **Worlds from scripts cost time.** A world takes seconds to start. `bp.world.start` reuses a warm local world per run
  and resets it from its starting world, the way prove already reuses a bench.
