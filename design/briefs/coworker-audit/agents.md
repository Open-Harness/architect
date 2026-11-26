# The agents: the part to build right, not to port

Added 26 November 2026, after three lines from Aaron that reached this audit through the thread that started it:

- "one thing that defo doesn't work is the agents they should be pi durable."
- "and they should be actors."
- "it needs more than that. it needs a front end, it needs to replace everything that works currently in the vibe
  coded version." (The front end is in `front-end.md`.)

So the agents are not part of what has to be matched. There is nothing working to match. They are the part the
rebuild exists to get right: **nested durable managers that control worker agents, on Pi Durable, each one an actor.**

Aaron then added: "they need to be actors and they should follow the same pattern from pi durable and its examples
in the repo". `end-to-end.md`, sections 1 and 3, reads Pi's 48 examples and says which pattern holds where. It
refines "Does Pi Durable fit things last?" below: Pi's own spec agrees that a parked tool call holds its run busy.

## What is actually there in Coworker

Read from the code. The fast tests were run for this addendum (`inventory.md` says what passed); no agent was seen
thinking with a real model.

| Part | Wired, stubbed or faked | Where |
|---|---|---|
| Pi Durable 1.6.0 as the engine | **wired**: `Harness.open` on the Durable Object's own SQLite, resumed on restart, one alarm | `src/modules/manager/internal/engine.ts`, `alarm.ts` |
| A manager as a conversation | **wired**, and thin: a fixed four-sentence prompt, the same for every manager, without its mission | `manager/internal/manager-agent.ts` |
| A worker as a conversation | **wired**: an ownerless conversation beside the manager's, in the same harness and the same object | `manager/internal/runs.ts`, `worker.ts` |
| A manager starts a worker | **wired**: `run_start` submits a brief | `runs.ts` |
| A worker reports to its manager | **stubbed**: `report` writes a field on the board and wakes nobody | `worker.ts` (finding F56) |
| A manager above a manager | **absent**: no parent, `manager.create` has no handler, mail between managers is dropped | `ManagerProfile`; findings F73 |
| A manager's tools | **30 of 76 wired**; the other 46 are rows in a list | `manager/internal/tools.ts`, `parameters.ts` |
| A worker's tools | **2 of 4 wired** (read a file, run a command; editing and the web are marked not built), under no permission | `agents/types.ts`, `worker.ts` (F47, F48) |
| Asking a person | **wired**, by parking the tool call inside Pi on a signal. Suspected to block the manager's whole conversation | `manager/internal/asking.ts` (F68) |
| When to ask | **absent**: the manager is never told when to use the tool, so it asks in chat and the Inbox stays empty | F10 |
| Memory | **absent**. The module named `brain` is the model provider | F63 |
| Dates and reminders | **absent** for managers; a working schedule exists only in the older chat app | F64 |
| Thinking with a real model | **wired** through the workspace's own key; ChatGPT sign-in and "own endpoint" fail on staging | `brain/`, `models/` (F1 to F7) |
| The model in every test | **faked**, three ways: Pi's faux provider, a scripted "brain", and a deployed scripted endpoint (`fake-model`, `wrangler.fake-model.jsonc`) | `agent/internal/fake.ts`, `manager/testing.ts`, `src/modules/fake-model` |
| The older chat app's agent | **wired** and separate: `agent`, `agent-config`, `chat-host`, with real streaming and a schedule | not part of the manager product |

The tests pass because the model is scripted to call the right tool. Nothing has ever shown what a real model does
with these prompts and tools (finding F23).

## What Orthograph has for it

| Piece | Standing | Where |
|---|---|---|
| An `Agent` thing that lives as an actor: one Durable Object per agent | **runs today as a declaration**: `lives: "actor"`, states idle, working, stopped | `packages/agents/blueprint/things/agent/thing.ts` |
| `agent.open` | on `main`, handler written | `packages/agents` |
| `agent.tell`, `agent.close` | on `main`, **blank handlers** | `packages/agents` |
| The Pi conversation **inside the same Durable Object** as the Agent | being built: `agentActor(Base)` wraps the host's `Actor` and opens Pi's harness on that object's storage | draft #781, `src/modules/resident`, Pi 1.5.0 |
| "One durable conversation per long-lived thing" | decided | K39 call 8, Aaron: "an agent that lasts for like years, like on the same thread" |
| An agent as a caller in its own right | form on `main` (`Blueprint.role(T, { agent })`), caller in #781 | K40 fix 3 |
| Work reaches an agent only as the hop of an event | declared on `main` (`a.on(Event, agent.operations.tell, …)`); retried and ordered delivery is draft #905 | K40 fix 3; `examples/superagent/blueprint/features/agents.ts` |
| A turn ends and the world is told | being built: the actor commits `idled` and journals `AgentIdled` | #781 |
| An agent kind with a "never waits" hook | on `main` as a declaration | `examples/superagent/plugins/superagent/blueprint/agents/main.ts`: `hooks: { beforeTool: "noWait" }` |
| Tools from operations | decided, not built | K40 fix 3, M4.07; #781: "Tools are not wired yet" |
| A generated action per operation, with approval asked once | **on `main`**, for a page and for an agent in the browser | `generated/actions/`, `e2e/ui-layer` checks 01 to 03 and 09 to 13; Goal 5, parked |
| A stand-in model | being built | `@orthograph/stand-in-model`, #781 |
| The harness as our own package behind an Effect seam; a run record and a scorer | proposed, not built | H1, H2; Goal 10, parked |
| A manager that manages managers | **missing**: the superagent has one fixed pair, a main agent and per-ticket executors | — |

## Agents as actors

**The Agent thing is already an actor, and the Pi conversation sits inside the same Durable Object, not beside it.**
That is the design on `main` and the code in the draft. It matches where Coworker already keeps a conversation.

What the actor kind costs, from `docs/canon/stores.mdx`:

1. **An actor has no list.** The compiler refuses a list read over a thing that lives as actors: "declare a view".
   Views are planned (M5.05) and not built.
2. **An actor can hold no rule across records.** "Each instance is its own Durable Object, so there is no table to
   put an index on." So "one root manager per workspace" cannot be a rule on the agent.
3. **A request key on an actor's operation dies.** Idempotent actors are in `design/later.md`. For `agent.tell` this
   is covered a different way: the tell carries its own `requestId`, and Pi takes a submission once per request id.
4. An actor keeps its whole instance as one JSON value. Fine for an Agent, which is four small fields.

**So the board's lists do not come from the actors.** They come from things in the database that the actors report
to, which is what the blueprint sketch already does:

- `Manager` is a row: name, job, the manager above, and the id of its `Agent`. The sidebar's tree, search and
  "Needs you, Working, Idle" are reads over these rows.
- `Run` is a row: its task, its manager, what it last reported, and the id of its `Agent`. "Agents on this task" and
  the page of everything running (finding F43) are reads over these rows.
- The `Agent` actor is the conversation and nothing else. When it starts a turn, idles or stops, an event updates
  the row.

This is one more thing than "the manager is the actor". It is the price of a list today. When views are built, the
row could become a view kept from the agent's events.

## Does Pi Durable fit "things last"?

Mostly it fits, and the fit is good. It pulls against K46 in four places, and each has a clear side to take.

**Where they fit.** K39 call 8 and K46 say the same thing from two ends. A Pi conversation is a thing that lasts for
years; K46 says things last and operations are short. `agent.tell` is one call and one commit. The turn then runs
inside the actor, and when it ends that is an event. Nothing is held open.

**Where they pull apart.**

1. **Pi wants to hold waits itself.** It has parked tool calls, signals, sleeping tasks and background subagents.
   Coworker uses all four. K46 call 2 says a wait is a thing's state. **Take K46's side:** an agent's tool never
   parks. To wait for a person it raises an `Ask` and its turn ends; to wait for a worker it starts a `Run` and its
   turn ends. The answer or the report comes back as a tell. The superagent's main agent already declares this as
   `beforeTool: "noWait"`.
2. **Pi wants to be the database.** Coworker keeps its board, pages and permissions in Pi documents. **Take
   Orthograph's side:** Pi keeps the conversation; every fact the product shows is a thing in a store.
3. **A tool call writes two places.** The operation commits to the database; the turn's entry commits in Pi's
   storage in the actor. K46 call 1 covers exactly this: two commits, joined, not one transaction. What makes it
   safe is that a replayed tool call is taken once, which wants a request key per tool call
   (`tool:<toolCallId>`, as the generated actions already send).
4. **The order of work lives in the model's head.** K46 call 4: "the order of anything that spans a wait is
   declared". A manager's plan is in its conversation, where the framework can't check or draw it. **The
   declared part is what the task is waiting for**, which Coworker's next model already asks for: a task's "next" is
   always set while it is open (working, asked, waiting outside, look again on a date). The plan stays the
   agent's; the wait is the task's.

Pi's parent and child conversations are not used for the hierarchy at all. Every level is the same shape: two
actors and events between them.

## What nesting needs

A manager that starts, tells, waits on and stops workers, and a manager above that.

| The call | Between actors today? | What is missing |
|---|---|---|
| **Start** an agent | yes: `agent.open`, system only | the caller: a manager acting as itself (in #781) |
| **Tell** it | declared; no handler on `main` | #781's runtime; #905's outbox for retry and order |
| **Wait** on it | not a call, and should not be: the `Run` row's state, and `AgentIdled` and `RunReported` as events that wake the manager | events from an actor reaching a database thing reliably (#905) |
| **Stop** it | declared; no handler on `main` | #781 |
| **Hear back** | the superagent does it one way, through tickets and assignments | a plain "report up" hop: `RunReported` to a tell of the manager |
| **A manager above** | nothing | no new call: `manager.create` allowed to a manager, a tell down, a report up. The same four calls, one level higher |
| **Limits** down the tree | `slots` is a field on an agent kind; not built | how many workers at once, how deep, and a budget handed down |
| **Authority** down the tree | missing | grants (`map.md`, gap `grants`) |

Nothing in this list is a new idea for the framework. It is the superagent's slice 9, finished, with its one fixed
pair replaced by a rule that works at any depth.

## Should this be the first slice?

Aaron's point stands: the one thing that does not work is the heart of the product, so the audit should not put it
fourth. **Yes: one manager running one worker on one task, proved by a journey, is the first thing the rebuild
proves.** It is too big to be one slice that ends green, so it is two, and they share one journey.

1. **The loop by hand.** `Manager`, `Task` and `Run` as things, and five operations: make a manager, add a task,
   start a run, report, finish the task. The journey is played by people: one signs in as the manager's maker and
   plays the manager, the calls a worker would make are made by hand. Check:
   `e2e/coworker/01-the-loop-by-hand.test.ts`. Needs nothing new from the framework.
2. **The loop by agents.** The same journey, with the people taken out. A person tells the manager "do this". The
   manager, on a scripted model, adds the task and starts a run. The worker, on a scripted model, reports ready. The
   manager is woken by that report and finishes the task. Then twice more: the Worker restarts in the middle and it
   still ends; the worker's model goes silent and the run is ended, not left running. Check:
   `e2e/coworker/02-one-manager-one-worker.test.ts`.

Slice 2 is the first framework work, and all of it is the superagent's unfinished slice 9: the runtime from #781
moved to Pi 1.6.0, `agent.tell` and `agent.close` written, the stand-in model, the hops from #905, and three
operations offered as tools. It is also the first time anything in this repository shows a report waking a manager.

Then, in this order: it asks first (the `Ask`, and the answer as the manager's next turn); a manager above a
manager; a real model, once, on staging, because a scripted model proves the plumbing and nothing about judgement.
