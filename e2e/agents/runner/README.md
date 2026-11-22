# Slice 3's checks: the run record, the scorer and the first runner (M4.03, #376)

Written before slice 3 is built, by an author who builds none of it (`AGENTS.md`, "Journeys and checks come first"). They
check `design/decisions/M4-agents.md` call 6 and `design/decisions/H2-agent-runs-and-benchmarks.md` (H2.1, H2.2, H2.6,
H2.7), and the row A0 of `design/build-plan.md`. Every check is red today because `@orthograph/agents` does not exist, and
each fails with that message. They are green once slice 3 lands.

| Check | What it proves |
|---|---|
| `01-the-first-runner` | check 4's task (acme's `allowance.spend`, blank, given only its brief) runs through the runner into a run folder whose `record.json` decodes as a `RunRecord`. The `oracle` scores solved (check, 9 of 9 evals, 3 of 3 journeys), the `null` scores unsolved (8 of 9 evals, 1 of 3 journeys) |
| `02-every-blank-task` | the `blank` tasks derived from the models are the 12 of acme and the 9 of the starter; the oracle solves all 21, the null none |
| `03-the-scorer-cannot-be-fooled` | beside a correct handler, a second file edited, added or deleted, a journey added, a generated or blueprint file edited each score `tampered`, naming the file; a handler that type-checks but fails its journeys, or one that does not type-check, is unsolved |
| `04-the-record-is-whole` | config, prompt and skill hashes, brief hash, commit, timings, turns, totals, outcome, redaction of a key, transcript, and the run's and the scorer's spans read back by trace id |

## The surface they assume

Where H2 names a thing, it is H2's. Where H2 is silent, the check chose, and says so here. The builder may change a
chosen name only by asking this check's author. The same shapes are written as TypeScript in `support.ts`.

```ts
import { RunRecord, Runners, Runs, Tasks } from "@orthograph/agents";   // the package entry (M4 call 6: `runs`, `score`, `tasks`, `harness`)

Tasks.derive({ project: "acme" | "starter", root }): Effect<ReadonlyArray<Task>>            // chosen: name and arguments
Task    = { id, project, root, operation, variant: "blank", handler }                      // H2.6 (project, operation, variant); id, root, handler chosen
Runners = { oracle, null }                                                                 // H2.1 kinds; `sdk` is a key's and is not checked
Runner  = { kind: "sdk" | "oracle" | "null", run(task, config, sandbox) => Effect<RunOutcome, E, Scope> }   // H2.1 sketch
Runs.execute({ task, runner, config, suite, runsDir, redact? }): Effect<{ record, folder }, E, Scope>   // chosen; one run, then the scorer
RunRecord                                                                                  // an Effect Schema, H2.2; the record's file is `record.json`
```

- **A runner is any object of that shape** (`kind` is recorded as given). The checks plant their own runners to write
  one extra file, or to report turns, so what the scorer and the record do with them is judged without a model.
- **The sandbox** is `{ root }`, a copy of the project outside the repository, with the task's handler blank (as `ortho
  generate` scaffolds it) and the journeys held out (check 4's pattern). A runner writes under `root`. The scorer puts the
  journeys back after the tamper check. The run never touches the example it copied.
- **`config`** is `{ provider, model, thinking, systemPrompt, skills: [{ name, text }], limits: { maxTurns, maxUsd, wallMs } }`
  (H2.2 `agent`: its hashes come from the prompt and skill text). **`RunOutcome`** is what a runner returns:
  `{ status, reason?, turns: [{ ms, stop, usage: { input, output, thinking, cacheRead, cacheWrite, usd }, toolCalls:
  [{ name, argsHash, ms, isError }] }], transcript: [jsonl line], usdSource }`. The oracle and the null return no turns.
- **The folder** is `<runsDir>/<suite>/<record.id>/` with `record.json`, `transcript.jsonl`, `spans.jsonl`, `logs.jsonl`,
  `output/` (every file the run added or changed, at its project path), `output.diff` (beside it: H2.2 is not clear whether
  it is inside `output/`), and `score/{check.txt, prove.txt, verdicts.json}`. `verdicts.json` equals `record.verdicts`.
- **The record** is H2.2's. Chosen where H2.2 is silent: `verdicts.changed` (the paths, sorted, that differ from the start
  other than the one handler; empty when not tampered), `verdicts.check.findings` (the lines `ortho check` printed under
  the failing part), `task.id`, `repo.dirty` (whether `git status --porcelain` of the repository was not empty),
  `agent.sandbox: "copy"`, and `usdSource: "table"` for the runners that spend nothing. `solved` is not tampered, check
  passes and prove passes (every one of the operation's 9 evals and of the journeys that call it). The journeys that call
  an operation are the ones its brief lists under "Done when".
- **Hashes** are SHA-256, lowercase hex, of the UTF-8 text: `task.brief.hash` of exactly the stdout of `ortho brief
  <operation>` in the blank copy; `agent.systemPromptHash` and each skill's `hash` of the config's text.
  `task.startHash` is a 64-hex hash of the blank copy's files (not of `node_modules`, `tsconfig.json` or dot folders); it
  is the same for two runs of one task and differs between two tasks.
- **Spans** (H2.2, "read back from the Collector by trace id"): a trace id for the run and one for the scorer, each 32 hex;
  `spans.jsonl` holds a span named `agent.run` in the first and `agent.score` in the second (H1.8 names `agent.run`;
  `agent.score` is chosen), as `Collectors` reads them back. `Collectors.local` is a receiver in the process, so this needs
  no key and no binary.
- **Redaction** (H2.4): `redact` is a list of values held in memory. Each is removed by exact match from every file of the
  run folder except `output/`. A line that only resembles a value is kept byte for byte.

## What is not checked here, and why

- **The `sdk` runner** (Agent SDK, with a key): this goal has no key and no cloud, and the slice's key half ("turns and
  cost match the SDK's result message") cannot run. Its record's turns and totals are checked through planted turns
  (check 04) instead, and the oracle and null carry the rest, as H2.1 intends for CI.
- **Check 4 calling the `sdk` runner** ("check 4 passes through `@orthograph/agents` with its same assertions"): check 4
  is Goal 3's, in `e2e/layer1/`, and this slice's author may not touch it. It has no key to run on either. Whoever moves
  check 4 onto the runner does it as that goal's pair.
- **`friction`** is checked for shape only (three counts, non-negative integers); H2.10 derives it for the report, which is
  a later slice.
- **The number of journeys per operation** in check 02 is checked as "at least one, and all passed", not against a
  count: no machine-readable list of an operation's journeys exists but the brief's own text, which the scorer reads.
  Check 01 pins the three of `allowance.spend` as literals.

## For the builder

- `e2e/package.json` needs `"@orthograph/agents": "workspace:*"` (a dependency, not a check). The checks import the package
  by a name held in a variable, so they type-check before it exists.
- A run's scoring is one `ortho check` and one `ortho prove` of the whole project (about 40 s here), so 42 scorings are
  about 30 minutes: the checks give each test 15 minutes and run files one at a time (`vitest.agents.config.ts`).
- The ratchet list is `e2e/agents/expected-failing/`; delete a check's file when its tests pass.
