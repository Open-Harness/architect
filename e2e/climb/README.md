# The climbability check: `nx run e2e:climb`

Goal 3, "What 'climbable' means, as a check" (`design/goals/03-stage-1-hill-climbed.md`). Written by the checks author; a
builder never edits it or `e2e/fixtures/climb`. With a wrong handler planted, `ortho prove` must:

1. name the journey and the step that failed;
2. show what was expected and what came back;
3. point to the handler file and the declaration it answers to;
4. finish one journey in under 30 seconds once the world is warm;
5. give the same result on two runs in a row.

## How it works

A copy of acme in a temp folder (its own journeys stay, so the control is the whole project), with
`e2e/fixtures/climb/journeys/*.ts` added and, for a planted kind, `e2e/fixtures/climb/variants/<kind>/src/allowance/spend.ts`
laid over acme's correct handler. It does not use Plugged In. Five kinds, each one fault against one journey a correct handler passes:

| Kind | Planted fault | Journey step |
|---|---|---|
| wrong answer | answers what was left before the spend | `expect(remaining).toBe(380n)` |
| missing refusal | never refuses an amount over the allowance | `refuses(AllowanceExceeded)` |
| missing event | never calls `move`, so nothing is emitted | `emits(AllowanceSpent)` |
| wrong state | `move("active")` always | `machine.isIn(…, "exhausted")` |
| missing span | the record write is not a step | `spans({ present: [… "allowance.spend.record"] })` |

The **control** runs the whole project with the correct handler: every climb journey passes and prove exits 0. Each planted
kind is run twice with `--only <journey>` (property 5 compares the runs after taking out world-made ids, measured
times and the performance eval's `; review: …` note, which depends on machine load and never changes a verdict; property 4 times both). Each property is its own test, so a red test names a property that does not hold: a snag.
Prove prints text only, so the assertions read its lines. Each run takes free ports (`e2e/ports.ts`), so it never meets another run on the machine. No Docker.

## What holds (after #119, 19 November 2026)

26 tests, all pass. Before #119 six were red, and they were framework snags:

- **S-C1 / S-02 · prove named no handler file or declaration** (property 3, five kinds). Now the failing step's lines say
  `handler src/allowance/spend.ts, declared in blueprint/things/allowance/verbs/spend.ts`, and the report carries `handlerFile` and `declarationFile`.
- **S-C2 / S-03 · a missing span said only "missing"** (property 2). Now it says what it was read against, and the step has `expected` and `got`.
- **S-01 · prove had no machine-readable report.** `ortho prove --report <file>` writes a `ProveReport` (schemaVersion 1). The check reads
  it for properties 1 to 3 (journey and step names, expected and got, the two files) and still asserts the text lines an agent reads.

Property 4 (about 5 s per journey, world warm) and 5 (same result twice, world-made ids and p50/p95 taken out) held throughout.
Free ports per run (`e2e/ports.ts`). CI job `e2e-climb` is required.

## The climb recorder

`node tools/climb/record.mjs <ortho prove args>` (or `nx run e2e:climb-record -- …`) runs `ortho prove --report <tmp>`, streams its
output unchanged, and appends one line per journey to `design/evidence/climb/runs.jsonl`:
`{ at, commit, journey, green, total, seconds, run_seconds, prove_seconds, exit }`, read from prove's `ProveReport` (`seconds` is the journey's own
time, `run_seconds` the whole run timed by the recorder, `prove_seconds` prove's own timer). The reader, `tools/climb/parse.mjs`, is tested on a real report with `node --test tools/climb/*.test.mjs`
(part of `nx run e2e:grid`). `--runs <file>` sends the lines elsewhere.
