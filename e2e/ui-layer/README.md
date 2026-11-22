# e2e:ui-layer, the done check of Goal 5

`nx run e2e:ui-layer` is the done check of `design/goals/05-ui-layer.md`. It is built up a slice at a time; this folder holds what exists.
It runs `ui-layer/*.test.ts` through the ratchet (`e2e/ratchet/README.md`): a failure not on `expected-failing/` fails it, and so does a
hook error. The list shrinks only. CI runs it as the job `e2e-ui-layer`, on pull requests into `goal/ui-layer` and pushes to it.

## What it checks today

| Check | Slice | What it proves |
|---|---|---|
| `01-actions-module` | M1.23 (Goal 5, slice 1) | `orthograph/actions`: a refusal writes nothing and is typed as `ActionRefusal`; a defect is a plain, redacted error; `needsApproval` waits for a yes in the wrapper, once, never in `run`; with approval already given `run` runs once and asks nothing; `list` returns every action with a non-empty input schema, optional fields advertised as accepted |

Later slices add their checks here (the web projection's, ST1.26; M1.22's; the browser checks), each with its own file in `expected-failing/`.

## How check 01 is built

- **The contract is `contract.ts`.** The surface the builder must export from `orthograph/actions`, as types, in agent-native's field names
  (`spikes/agent-native-compat/README.md`, `design/decisions/K29-ui-layer.md` section 3.1). The checks load the module with a dynamic import,
  so a missing module fails each test by name and the folder still typechecks.
- **The actions stand in for generated ones.** `stand-in/actions.ts` is hand-written in the exact shape K29 3.1 draws, until slice 3 generates real
  ones. It talks to a stand-in SDK that makes real HTTP calls.
- **"Writes nothing" is read from a real record.** `stand-in/worker.ts` is a real HTTP server with its own role check. It keeps a list of every write
  it accepted, and the checks read that list, never a returned value. A refused call must leave it as it was; the same call by an editor must add one.
- **Counted, not guessed.** "Runs once" is read from a counter around `run`, "asks once" from the person's own list of what they were asked, and
  "asked before anything is written" from the number of writes at the moment of the question.
- **Literal expectations.** Every code, status, flag, field name and count is written in the check, never read back from the output it judges.

## Taking a test off the list

As `e2e/ratchet/README.md` says: when the builder's pull request makes a test pass, CI prints `newly passing, take it off the list`, and that
pull request deletes the line (and the file when its last line goes). A builder never adds a line.
