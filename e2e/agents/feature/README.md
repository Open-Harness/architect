# The agents feature's checks (M4.02, Goal 10 slice 2)

Written before `@orthograph/agents` exists, by an author who builds none of it (`AGENTS.md`, "Journeys and checks come
first"). They check `design/decisions/M4-agents.md` and K10 sections 1 and 5, through the journeys in
`e2e/fixtures/agents/support/journeys/` (prose first in each file, then steps). **M4.10 turns them green** ("the agents
journeys pass, mounted in acme"). A builder never edits the fixture, the journeys or these checks: the only change it
makes here is to remove lines from `../expected-failing/`. If a name below is wrong for the code, ask the author.

| Check | What it proves |
|---|---|
| `01-the-agents-feature-is-mounted` | the fixture loads (`ortho generate`); the nine `run.*` operations; only the system finishes, fails, waits or wakes a run; a run starts by session or key, never an agent; an operation marked `.notVia(Via.agent)` is never an agent's tool |
| `02-the-journeys-pass-whole` | `ortho prove` reports each of the twelve journeys `✔ n/n steps` (step counts written in `support.ts`), nothing skipped, acme's own journeys still pass, nothing left running |
| `03-planted-lifecycle` | planted wrong copies of the start, steer, cancel and budget journeys each fail at exactly their own step |
| `04-planted-durability-and-roles` | the same for the two eviction journeys, "only the starter steers or cancels" and "an agent is refused what its person is refused" |
| `05-planted-the-gate-keys-and-closed-values` | the same for Gate M4 item 1's journey, the request key, the closed values and the full pool |

## The twelve journeys

| Journey | In one line |
|---|---|
| a run starts and reads back | frame 1: starts working with nothing spent, finishes `answered`, one reply paid for |
| steering reaches the transcript | frame 2: a note is in the transcript, in order, and the run keeps working |
| cancelling stops the tools | frame 3: cancelled, said so, a late reply starts no tool and no request |
| a spent budget fails the run | frame 4: reason `budget`, not transient, nothing sent or spent; a looser budget finishes |
| eviction in the tool phase makes no extra request | frame 5a (call 3): two requests in all, none twice, usage carries on |
| eviction with a reply held repeats one request | frame 5b (call 3): that one request sent again, none other, paid once |
| only the starter steers or cancels | frame 6: Bob is refused `NotAllowed` for both; Ada may |
| an agent is refused what its person is refused | frame 7: the desk agent's `allowance.revoke` is refused as Bob is, and works as Ada's |
| the support agent spends for Bob | Gate M4 item 1: 120 spent as an agent for Bob; `invitation.accept` is no tool and is refused to an agent key |
| the same key starts one run | K10: a replayed `key` starts nothing; another key starts another run |
| the loop closes a run with closed values | K10: system only; four outcomes, seven reasons, no others; `transient` for `model`, `sandbox`, `crash` |
| a full pool refuses | K10: `RunPoolFull`, nothing emitted; a freed slot admits; full again |

None asserts what the model said. The tool a journey expects is the one its brief names, and a journey that needs a
tool call reads the call from the run (`s.world.toolCalls`), never the model's words. If slice 6 finds that Qwen3 0.6B
does not call a simple tool reliably at temperature 0, the fallback is Qwen3 1.7B (M4-agents call 5), not a looser journey.

## What the checks assume beyond M4-agents (names chosen here)

M4-agents and K10 fix the Run, its machine, its five operations, `key`, the closed `outcome` and `reason`, `RunPoolFull`,
who may start a run, and what the two eviction checks count. They are silent on the names below; I chose each, and a
builder who finds one wrong asks me and I change the journey and this list together.

**Packages and files.** `@orthograph/agents` exports `agents` (the descriptor, mounted as `Blueprint.use(agents, ...)`)
and `Models` (`Models.standIn`, the `ModelRef` of the stand-in); `@orthograph/openai` exports `openai`. Declarations are
at `@orthograph/agents/blueprint/things/run/{machine,events,errors}.js` and `.../run/verbs/<verb>.js` (default export),
the layout `plugins/README.md` gives. The pool is a choice, `a.choose(a.pool, 2)`. `Blueprint.agent({ instructions,
operations, limits })` as `frame/examples/agents.md` shows it; a run's `agent` payload is the declaration itself.

**Operations.** `run.start { agent, model, brief, budget, key } -> { run }`; `run.steer { run, note }`; `run.cancel
{ run }`; `run.finish { run, outcome, spent }`; `run.fail { run, reason }` (system only; `transient` is the operation's,
never the payload's); the reads `run.get` by `id` answering `agent` (its name), `model`, `brief`, `budget`, `spent`,
`state`, `startedBy`, and `run.list` where `startedBy` and `state`, answering `items` each with `id` and `state`. Events:
`RunStarted { run, agent, model, starter }`, `RunSteered { run, note }`, `RunFinished { run, outcome, spent }`,
`RunFailed { run, reason, transient }`, `RunCancelled { run }`. `RunPoolFull` is exported from `.../run/errors.js`.
`Blueprint.InvalidPayload { field }` is the refusal for a payload value outside its type (a closed word that is not one
of the closed values); if the framework already has one under another name, tell me and I change it.

**Journeys.** Beyond `s.<cast>.run`, `s.last`, `s.world`: `s.started.run` is the `run` of the journey's latest
`run.start` answer (refusals leave `s.last` empty, so a refusal never loses the run in hand); `s.<name>.via(Via.agent)`
is M2-auth's. Refs inside an expected value (`toEqual([s.bob.person])`) resolve as `emits` fields do. Every journey that
starts a run has a world of its own (M8-checks call 3), so one journey's held model and running runs never reach another's.
A step's events are every event emitted since the previous step's call returned, so the step that waits (`until`, `quiet`) owns the events of the run's end. The world's doors, each a step's call, each answering the `run` it was given as `run`:

| Door | Does | Answers |
|---|---|---|
| `s.world.holdModel()` | the stand-in answers no request until released | `{ held: true }` |
| `s.world.releaseModel({ run })` | releases it and answers at once, not waiting for the run | `{ run, held: false }` |
| `s.world.holdTool()` | holds the next tool call of any run, once: it waits until an eviction lands or the run is cancelled | `{ heldTool: true }` |
| `s.world.quiet()` | waits until the world is quiet (`Busy` is zero) | `{}` |
| `s.world.until(machine.isIn(run, state))` | waits, on the world's clock, for the state | `{ run }` |
| `s.world.evict({ run, during: "tool" \| "model" })` | `"tool"`: lands after the run's first model reply committed and before its tool call did (armed by `holdTool`); `"model"`: lands while the stand-in is holding the run's request | `{ run, during, turnsCommitted }` |
| `s.world.requests({ run })` | what the stand-in received for the run | `{ run, sent, repeated }`: requests received, and the 1-based request numbers received more than once |
| `s.world.hosts({ run })` | how many hosts (Durable Objects, or Node processes' stores opened afresh) the run has had | `{ run, started }`: 2 after one eviction and a resume |
| `s.world.usage({ run })` | the run's committed usage | `{ run, turns, spent }` |
| `s.world.transcript({ run })` | the run's transcript, notes only | `{ run, steering }`: notes in order |
| `s.world.tools({ run })` | the tools the run was offered, by operation name, sorted | `{ run, offered }` |
| `s.world.toolCalls({ run })` | the calls the run made, in order | `{ run, calls }`, each `{ name, as, for, outcome, refusal? }`: `as` is `"agent"`, `for` the starter's person, `outcome` `"ok"` or `"refused"`, `refusal` the tag |
| `s.world.trace({ run })` | the run's spans, which a `spans` check judges | `{ run, traces }`: how many traces they are in |

**Behaviour the journeys pin where the decision does not.**

- The stand-in prices every committed reply at 2 cents (a reply that arrives after a cancel, or is cut by an eviction,
  commits nothing). `Models.standIn` carries that price. A run that cannot pay for its next request does not send it:
  it fails with reason `budget` (the frame's `OverBudget` is `run.start`'s own refusal and is not exercised here).
- A run ends `answered` when the model replies without a tool call (the loop's, not the model's words).
- `agent.run`, `agent.turn` and `agent.tool.<name>` spans (journey "eviction in the tool phase") need M4.08 (telemetry),
  which is before M4.10 in the goal's order; that one step is the only one that does.
- An agent that lists an operation marked `.notVia(Via.agent)` (the support agent lists `invitation.accept`) is
  not refused at compile time: the operation is just never a tool (K10 section 1).
- `allowance.mine` (a read of the allowances the caller may see) is the fixture's, so an agent finds the id a spend or a
  revoke needs; the fixture also carries `invitation.accept` with the `.notVia(Via.agent)` that M2.03 gives acme.
- The fixture's package needs: `@orthograph/agents` and `@orthograph/openai` in acme's `package.json` (a builder's change
  to acme at M4.10, not in this fixture).

## What these journeys do not judge (known limits, not oversights)

- That a steering note reaches the model: Pi decides where a note is delivered (M4-agents leaves it to the seam); a
  journey for it belongs with slice 4's tests of the seam.
- `run.wait` and `run.wake`, and a run in `waiting`: they need a stored sleep, which is M4.26's (the world's clock). Check 01
  only proves they exist and are the system's.
- That the stand-in is the pinned server and model (slice 6's own checks), and span hierarchy or content (slice 8's).
- Every refusal from a finished run: one is checked (cancelling a `done` run); the machine's generated `notFrom` covers the rest.

## Proof 2, "it can pass", is not done here

Nothing a handler can reach exists yet: no package, no run, no stand-in. The first thing M4.10's builder does is write
the throwaway implementation that makes each journey pass using only what a handler can reach, and report any journey it
cannot pass (Snag issue "Goal 10: prove the agents journeys can pass", milestone Goal 10, `kind:snag`).
