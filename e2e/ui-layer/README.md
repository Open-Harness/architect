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
| `04-a-name-is-claimed-once-through-web` | ST1.26 (Goal 5, slice 2) | `ortho prove --only "a name is claimed once" --through web` replays the journey through the generated pieces in a real browser and gives the HTTP run's verdicts, step for step; a copy with the claim piece broken passes no claim step |
| `05-a-taken-name-is-refused-under-the-field` | ST1.26 | each declared refusal of `handle.claim` shows its own name and code under the Name field, for a person and for an agent's step, writes nothing and never calls `onDone`; the longest name is sent whole; a retry clears the refusal |
| `06-a-release-waits-for-a-persons-yes` | ST1.26 | `handle.release` (declares `needsApproval`) asks through the bridge once, before anything is sent: a yes releases once, a no and "nobody to ask" send nothing, a person's own press asks nobody, the dialog's other buttons release nothing |
| `07-a-read-loads-again-after-a-write-on-its-thing` | ST1.26 | `ProfileGet` loads once, then once more after `link.add` finishes (person or agent) with no page reload, and shows what `profile.get` answers; a refused write shows the declared refusal |
| `08-the-pending-state-is-seen-before-the-answer` | ST1.26 | with the request held in the browser, a move and a read are pending, show no answer and no refusal, send nothing twice, and the agent's step has not finished; then the answer or refusal replaces the pending state |

Later slices add their checks here (the web projection's, ST1.26; M1.22's; the browser checks), each with its own file in `expected-failing/`.

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

## How checks 04 to 08 are built (ST1.26)

- **`web-support.ts` is what they share:** the model they judge against, the pieces' files, a world of Plugged In on real workerd and D1, a page of check code
  (`page/*.tsx`) that mounts generated pieces, and headless Chromium through Playwright. No jsdom.
- **The one seam to the builder's runtime is `page/boot.tsx`:** `WebHost.make({ client, ask })`. If the builder spells it differently, its author asks the checks author.
- **Red only on the missing projection.** Each file stops at `needPieces`, which names the files K29 section 3 says the projection writes.
- **Expected values come from the model or from a recording** (the SDK from Node, the world's journal), never from what the page shows.
