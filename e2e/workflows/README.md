# The workflows journeys: Goal 8, M3.27

Written before any of workflows is built, by an author who builds none of it (`AGENTS.md`, "Journeys and checks come
first"). They judge `design/decisions/M3-workflows.md`, "What the checks prove", and each is red today because the
example's Worker and `@orthograph/workflows` are blank. M3.28 turns them green; `nx run e2e:workflows` is Goal 8's done check.

| Check | What it proves | How it is driven |
|---|---|---|
| `01-replay-after-eviction-and-restart` | an object evicted after `propose`, and again after a full workerd restart, comes back with its finished activities and nothing runs twice; starting a run twice is one run | the example's Worker in workerd |
| `02-eviction-inside-an-activity` | an eviction inside `propose` after its effect: the body runs twice, the effect applies once, because the request key is the same on both attempts and differs per activity and per run | same |
| `03-an-event-wakes-its-run-once` | an event wakes the run whose `match` agrees, on every field, and no other; a second delivery wakes nothing and the first value stays; the `within` timer the event beat is cleared | same |
| `04-an-event-before-the-await-still-wakes` | catch-up: an event written after the run started but before its `await` still wakes it; one from before the run started does not | same |
| `05-a-date-wait-moves-with-the-world` | in a stepped world 29 days change nothing, the 30th fires the cooldown once, `link` reads the world's 30th day, and `advance` returns only after the woken run finished | same, through the world's clock door |
| `06-within-passes-with-no-event` | `within` passes: the run withdraws, a late event wakes nothing, nothing fires again | same |
| `07-a-call-must-be-idempotent` | registering a `call` on an operation without `idempotent: "request"` is refused with `WorkflowRefused` naming the workflow and the activity; safe workflows register | in-process, `Workflows.register` |

## The Worker's contract

`examples/workflows/src/worker.ts` is bundled with esbuild and run in workerd through Miniflare (as the M3.03 spike ran
it), its objects persisted under a folder of its own so `restart` is a real one. The harness passes two bindings,
`WORLD_START` (`2026-11-01T09:00:00.000Z`) and `PROBES` (`on`). `contract.ts` has every type and literal below.

**It exports four SQLite-backed Durable Object classes**, bound as: `CLUSTER_WORKFLOW` → `ClusterWorkflow` (a run's
object, from `makeClusterWorkflowProgram`), `WORKFLOW_WAITS` → `WorkflowWaits` (the waits, one object per event name, and
the journal it catches up from), `WORLD` → `World` (the stepped clock and timer table), `LEDGER` → `Ledger` (the outside
world the stand-in operations change). The harness refuses early, naming any it does not find.

**The example's four stand-in operations** (`blueprint/things/{revision,proposal}/verbs/`) each call the ledger with
their request key, once per body run, and answer what `contract.ts` fixes: `freeze` → `{ digest: "digest-of-<revision>" }`,
`open` → `{ proposal: "proposal-of-<revision>" }`, `link` → `{ linkedAt: <the world's instant as ISO text>, openedBy }`,
`withdraw` → `{ withdrawn: <revision> }`. The ledger applies an effect once per request key.

**The handler** (`src/workflows/publish.ts`) is `M3-workflows` section 1's `publish`: freeze, propose, `seen` waits for
`ProposalOpened` matching `{ proposal, digest }` within seven days; `None` withdraws; otherwise the cooldown (30 days)
and `link`, passing who opened it from the event's first delivery. Its result is what the last activity answered.

**The doors** (JSON; anything but 200 fails the journey at that call):

| Door | Answers |
|---|---|
| `POST /workflows/publish/start { revision }` | `{ execution }`; the same revision twice is one run |
| `GET /runs/<execution>` | `{ done, value? }`: `done` once the handler returned, `value` what it returned |
| `POST /events/emit { event, fields, key }` | `{ woken }`: writes the journal entry, then `WorkflowEvents.deliver` with it |
| `GET /_world/clock`, `POST /_world/clock/advance { span }` | `{ kind: "stepped", now, timers: [{ due, owner, name }] }` and `{ now, fired }`, as M8-checks fixes them (call 9). `advance` answers once the world is quiet at the target. Pending timers only: owner is the run's execution id, name the activity's key (`seen`, `cooldown`), the `Timers.set` shape of GitHub issue #467 |
| `GET /_probe/ledger?revision=` | `{ calls, applied, keys, answers }` per operation (`freeze`, `open`, `link`, `withdraw`) |
| `GET /_probe/peek?execution=` | `{ born, activities }`: the instance's birth time, and the activities stored (declaration keys) |
| `GET /_probe/waits` | `{ rows: [{ event, execution, activity }] }`: every wait still registered |
| `POST /_probe/evict`, `/resume`, `/hold`, `/release`, `/slow`, `/crash` | abort the run's object; poke it (a harmless resume); hold the next call of an operation until released; make the next call of an operation take `ms` real milliseconds (it is counted when it starts, its effect applied when it ends); abort the object in the next call of an operation, after its effect |

The probes (`/_probe/*`) are the only doors that read the engine's own tables, which are not a contract (M3-workflows,
"Open risks"): keep each in one place so a change of engine touches one file.

## Running them

```bash
pnpm nx run e2e:workflows            # the done check: every journey, red until M3.28
pnpm nx run e2e:workflows-ratchet    # CI's gate meanwhile: passes while every failure is listed in expected-failing/
WORKFLOWS_WORKER=<another worker.ts> pnpm nx run e2e:workflows-checks   # judge another Worker (how a check is proved fair)
```

When M3.28 lands and checks pass, the ratchet prints `newly passing, take it off the list`: delete those lines in the
same pull request. `tools/ci/builder-paths.sh` lets a builder shrink only M1's list today, so Goal 8's builder needs it to
treat `e2e/workflows/expected-failing/` the same way (an ask to whoever owns that script).
