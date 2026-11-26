# Coworker on Orthograph: the audit

Aaron, 26 November 2026: "I have another application that I have built ... I designed the UI, so the code is probably
really bad, but the UI is kind of how I want it to be, so that like the implied data model is what I want it to be. So
what I want to do is I want to rebuild it with Orthograph."

This is that audit, by a 📐 designer thread with the `app-audit` skill. It is an audit only: nothing under `packages/`
is changed, no lane is claimed, no row or slice is added and no goal is made. If Aaron accepts it, Goal 18 makes the
goal.

| File | What it holds |
|---|---|
| [`board.html`](board.html) | the audit on one page, for Aaron, ending in the decisions only he can make |
| [`audit.md`](audit.md) | Coworker read from eight sides, with paths |
| [`map.md`](map.md) | every finding against what Orthograph has, with its standing, and the gap list with owners |
| [`blueprint/`](blueprint/README.md) | a first blueprint of Coworker's core, with a marked blank wherever Aaron has not decided. It does not compile |

## What could not be run

Nothing was run. Coworker was read at `58f1f0e`, not installed, built, tested or opened. No screen was seen rendered.
Its score of 81 of 81 was not reproduced. Pi Durable's source was not read. On the Orthograph side no suite was run
either: standings come from `docs/canon/status.md`, the ratchet lists and the pull requests' own descriptions, and
draft #781 was read in part. An app only read is an app not seen working.

## The findings in one screen

1. Coworker is a workspace of **managers**: durable agents with a mission, a board, an address and an inbox to people.
   It is two apps in one repository; the rebuild is of the newer one.
2. Its own docs call the build a spike. **Nested managers do not exist in code**: there is one level, and a worker's
   report wakes nobody, so the loop never closes.
3. `docs/screens.md` is a list of changes to the screens, not the screens. The built screens imply the old model; the
   agreed screens imply `docs/model-next.md`. **Which is the authority is decision 1.**
4. Orthograph's declared core holds the model today. What it cannot hold yet is the part that makes Coworker
   Coworker: a running agent, tools from operations, and on, ask or off handed down a tree.
5. The parked superagent already has most of "it hears the world" as plugins on `main`, and the agent runtime as a
   draft. Coworker would be the app that finishes them.
6. No committed secret was found in Coworker.

## The four questions

### 1. Where should the rebuild live?

**In this repository, as `examples/coworker` on its own goal branch, as Capxul is. The starting position holds.**
Move it out when two things are true: Orthograph's packages install from npm, and the plugins it mounts are packages.

| | In this repository | Its own repository now |
|---|---|---|
| Can it install the framework? | yes, from the workspace | only from a local registry, republished on every framework change (`status.md`, section 6: "not on public npm") |
| Can it mount `intake`, `tickets`, the GitHub adapter? | yes, by path | no: they live in `examples/superagent/plugins` and are not packages |
| A framework fix and its first use | one pull request, one review, one CI run | two repositories, two reviews, a publish between |
| Journeys, the ratchet, the lander, the 🔍 review | all apply as written | each needs setting up again |
| Cost | this repository's CI and review carry about 15,000 lines of screens and a second component library | none here |
| Where it ends up | moved out once (K30, section 2, already plans "two repositories" for Capxul) | already there |

The one real cost is the screens. Keep them in the app's own `src/web/`, where K29's layer 4 already puts "the app's
own components", so the framework's rules for generated code do not reach them. **Not checked:** whether the
repository's lint rules (Effect everywhere, no `async`) are scoped away from an example's `src/web/`. If they are not,
that scoping is the first framework change.

### 2. What happens to the existing interface?

**Keep the screens and point them at the generated SDK. Do not wait for the generated UI layer, and do not rebuild on
UI SDK first.**

- The screens are separable today: each `team-*` module reaches the server through one interface. About seven
  interfaces are written again over the generated SDK; the components do not change.
- The generated UI layer is spiked (`ui-pieces`), with no generator. Waiting for it means no screen for months.
- Port a screen only when `docs/screens.md` says Keep or Adapt. The eleven New and seven Redo screens are drawn first
  as real screens (`portal-design` skill, "to see a UI, he needs real screens"), then built.
- Astryx stays as the app's look. K24's "go in all the way" on UI SDK is about Orthograph's own portal and its
  generated pieces; `generated/web/` would still import only UI SDK. **This is Aaron's call (decision 4)**, because it
  leaves a second component library in the repository.
- Two things the screens assume that the new backend must give: polling reads fast enough for chat every 0.6 seconds,
  and "Waiting for an Owner" as an answer to a call.

### 3. Which parts of its Pi Durable use map onto `@orthograph/agents`?

`@orthograph/agents` on `main` is an `Agent` thing with `open`, `tell` and `close`; only `open` has a handler. The
runtime is draft #781, on Pi Durable 1.5.0. Coworker is on 1.6.0. "Maps" below means onto #781.

| Coworker's use of Pi | Maps? | Onto |
|---|---|---|
| A harness on the Durable Object's SQLite, resumed on restart, one alarm | yes | `agentActor` in #781's `resident` module |
| One root conversation per manager | yes | one `Agent` per manager, `lives: "actor"` |
| `submit` with a request id (chat, a trigger) | yes | `agent.tell { requestId, input }`, as the hop of an event |
| `abort` on stop | yes | `agent.close` |
| Models through `pi-ai`, and a scripted fake | partly | `@orthograph/stand-in-model` and an OpenAI-compatible adapter; no Anthropic adapter |
| Sandboxed commands | partly | `@orthograph/sandbox` over pi-env; Coworker's is its own Cloudflare Containers module |
| Tools registered per action (`defineExtension`, `createRegistry`) | not yet | decided as tools from operations; "not wired" in #781 |
| A turn ends and someone is told | yes, and better | `AgentIdled` is an event; Coworker never built this |
| **App state as Pi documents** (the board, pages, permissions, questions in `defineDoc`) | **no, on purpose** | things in stores. Pi keeps the conversation, never the model |
| **An ask as a parked tool call** (`defineSignal`, `ToolPark`) | **no, on purpose** | an `Ask` thing in a state (K46 call 2) |
| Many conversations in one harness (each run beside its manager) | no | one `Agent`, one actor, one conversation, per run |
| `forkConversation` ("threads are forks") | no | nothing forks an agent across actors. A gap if the Threads screen stays |
| `defineTask` sleeping until a date | no | timers and the keeper |
| Pi documents as outboxes, per-call receipts | no | the outbox (#905) and `idempotent` |
| `LiveDoc`, `observeCommits`, `chord/delta` for streaming | no | nothing: no live read |
| A model call routed through the workspace's vault | no | models are per environment |
| `UsageDoc` and budgets | no | nothing |

The agent hierarchy does not need Pi's parent and child at all. A manager above a manager is two `Agent`s and an
event between them, which is how every level then looks the same.

### 4. What is the first slice?

**The board and the inbox, with no agent in it.** `Manager`, `Lane`, `Task` and `Ask` as things in the database, their
machines, and seven operations: make a manager, add a lane, add a task, move it, finish it, raise an ask, answer it.
A person signed in may do them; only the person an ask is addressed to may answer it.

It ends green on one named check: **`e2e/coworker/01-board-and-inbox.test.ts`**, which runs `ortho prove` on
`examples/coworker`. Its journeys, written first by an author and failing on empty handlers: a person makes a manager
and it has a board; a task is added and moved; a task cannot be finished twice; an ask is raised and answered in the
person's own words; someone else's answer is refused; an answered ask takes no second answer.

Why this one: everything it needs runs today, it puts Coworker's nouns through every generated output (so an agent
could already drive the board through MCP), and it needs none of Aaron's open decisions except the task's shape.

## The order after it

Each slice ends green on a check it names. Slices 4 to 6 are the ones that change the framework.

1. **The board and the inbox.** As above.
2. **A workspace and its people.** The starter's organisation, membership and invitation, copied; Owner, Builder,
   Member; someone from another workspace is refused. Check: the journeys behind `flw:workspace/create`, `flw:join/invite`,
   `ui:access/pages`.
3. **The first screens, re-pointed.** Board, Task, Inbox and a question as a page, on the generated SDK. Check:
   Coworker's own Playwright specs `board.spec.ts` and `needs-you.spec.ts`, ported.
4. **A manager that answers.** The agent runtime from #781 landed in pieces on Pi 1.6.0, the stand-in model, tools
   from operations. Check: "a chat becomes a task" (`flw:manager/chat-task`) and "it survives a restart"
   (`flw:manager/restart`).
5. **The loop closes.** A manager starts a run, the worker reports, the manager is woken and acts. The old app never
   did this. Check: a journey that ends with the task moved by the manager after the worker's report, and a run whose
   model goes silent is ended.
6. **It asks first.** Grants as a guard; an action set to ask raises an `Ask`; the answer is the manager's next turn;
   "always allow". Check: the journeys behind `flw:permissions/ask`, `flw:permissions/off`, `flw:inbox/own-words`.
7. **It hears the world.** `intake` and the GitHub adapter mounted; an email adapter written in the app. Check:
   Coworker's 10 email flows and 12 GitHub flows as journeys against stand-ins.
8. **The tree.** A root manager per workspace, managers made by managers, grants handed down and taken back. Check: a
   grant wider than its parent is refused; taking a parent's grant takes the child's.

Later, each its own slice: sandboxes, a workspace's own model keys and vault, the agreed new screens, connectors with
a view, MCP servers, billing.

## The decisions only Aaron can make

Batched, each with a recommendation. The board ends with the same list.

1. **Which screens are the authority?** The ones built, or the ones `docs/screens.md` agrees, with
   `docs/model-next.md` behind them. *Recommend the agreed ones.* They are a day old, they are where nested managers
   live, and the built ones still show the model the docs call a spike.
2. **Is Coworker a third build?** K44 says two things are built now, the alpha and Capxul, and parks the superagent.
   Coworker needs the superagent's unfinished agent work. *Recommend yes, as the app that pulls agents*: it takes the
   superagent's open agent slices, and the superagent stays parked.
3. **Where does it live?** *Recommend inside this repository*, as `examples/coworker`, until the packages are on npm.
4. **Do the Astryx screens stay?** *Recommend yes*, re-pointed, with UI SDK only for what Orthograph generates.
5. **On, ask or off, handed down: Coworker's own guard, or a framework primitive?** *Recommend Coworker's guard first,
   then lifted into the framework once it works*, which is how every plugin here has been made.
6. **Four blanks in the model**, one line each. *Recommend:* a task keeps both a lane and a "what happens next"; a
   worker is a saved agent with versions; a person's own permission changes stay, as grants a person holds; a
   connector's view waits until pages exist.
