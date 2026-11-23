# e2e:ui-layer, the done check of Goal 5

`nx run e2e:ui-layer` is the done check of `design/goals/05-ui-layer.md`. It is built up a slice at a time; this folder holds what exists.
It runs `ui-layer/*.test.ts` through the ratchet (`e2e/ratchet/README.md`): a failure not on `expected-failing/` fails it, and so does a
hook error. The list shrinks only. CI runs it as the job `e2e-ui-layer`, on pull requests into `goal/ui-layer` and pushes to it.

## What it checks today

| Check | Slice | What it proves |
|---|---|---|
| `01-actions-refusals` | M1.23 (Goal 5, slice 1) | a call the role check refuses writes nothing and rejects as the typed `ActionRefusal` (every member agent-native reads); a failure that is not a declared refusal is a plain error with nothing of the defect on it; an aborted signal ends the call |
| `02-actions-approvals` | M1.23 | `needsApproval` waits for a yes in the `defineAction` wrapper, once per call and before anything is written; with approval already given by the host `run` runs once and nothing is asked; a no runs nothing; `run` itself never waits |
| `03-actions-registry` | M1.23 | `list` returns every registered action once, in order, with its flags and a non-empty JSON input schema; optional fields advertised as accepted (never `anyOf` null), nullable ones as nullable; duplicate names refused |
| `09-actions-projection-files` | M1.22 (Goal 5, slice 3) | one module per operation of Plugged In and of acme in `generated/actions/<thing>/<verb>.ts`, none left over; each headed as generated, exporting `options` and nothing else, never naming `defineAction`, agent-native or `retrySafe`, and free of what the rules keep out of generated code |
| `10-actions-projection-options` | M1.22 | each `options(host)` has agent-native's field names carrying the model's name, description, `readOnly`, `needsApproval`, `agentTool` and refusal codes; no `retrySafe: true`; the schema is the payload's own through Standard Schema and Standard JSON Schema, non-empty when the payload has fields; `run` is one `host.call` making the generated SDK's own request under the host's request key and credential |
| `11-actions-projection-types` | M1.22 | the type test: every `options(host)` against agent-native 0.228.2's recorded field list and context, and `ActionRefusal` against the recorded no-write error's members (`agent-native-0.228.2.ts`), with no agent-native package installed |
| `12-actions-projection-runs` | M1.22 | Plugged In's generated actions run against a real world through the generated SDK: a role refusal is the SDK's own refusal as the typed no-write `ActionRefusal`, a declared refusal keeps its code, a defect is redacted, the request key reaches the Worker, an aborted signal ends the call, and `needsApproval` makes the wrapper ask once before anything is sent |
| `13-actions-projection-follows-model` | M1.22 | a fresh `ortho generate` writes `generated/actions/` as checked in; and a changed blueprint (a description, `needsApproval` added and removed, `.notVia(Via.agent)`, a list read with optional fields) changes the actions to match, optional fields as `optionalKey` |

Later slices add their checks here (the web projection's, ST1.26; the browser checks), each with its own file in `expected-failing/`.

### Checks 09 to 13 in one paragraph

They read the model (`generated/model/model.json`) and the example's generated SDK, never the action they judge. `projection.ts` holds what they share: the model's expectations, a host as K29 section 3.1 draws it (`client.<thing>.<verb>({ payload })`, made as one signed-in person, under the request key `tool:<toolCallId>`, through `runForAction`), and a sink server that writes down what it is sent. Check 12 starts a real Plugged In world (workerd, no Docker) and reads "writes nothing" from its journal. The projection also has to be mounted in each example (`blueprint/projections/actions.ts`, as `mcp.ts` is), or check 13 finds nothing written.
A read is what K29 section 3 calls one: no `move` and only `load` steps (so `handle.resolve` and `profile.get`), which is what `readOnly` says. An operation whose payload has no fields (acme's `session.show`, `system.health`) advertises `properties: {}`; "non-empty parameters" is judged for every operation that has fields.

## How checks 01 to 03 are built

- **The contract is `contract.ts`.** The surface the builder must export from `orthograph/actions`, as types, in agent-native's field names
  (`spikes/agent-native-compat/README.md`, `design/decisions/K29-ui-layer.md` section 3.1). The checks load the module with a dynamic import,
  so a missing module fails each test by name and the folder still typechecks.
- **What the three files share is `support.ts`:** a Worker per file, the rig (the module, a host calling the Worker as a role, a counted person), and
  the two shapes a call may end in, a typed refusal or a plain redacted error.
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
