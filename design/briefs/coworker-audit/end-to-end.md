# Coworker end to end on Orthograph: a proposal

Written 26 November 2026, after Aaron's answer to the second pass:

> "ok so just to give more context. we will take all the ui but rebuild it all on our things. including hooks and
> headless components as for agents. they need to be actors and they should follow the same pattern from pi durable
> and its examples in the repo. then it should propose how the whole thing should work end to end"

Said back, as strongly as I can:

1. **Every screen Coworker has is kept as the design, and none of its code is.** Each screen is rebuilt on what
   Orthograph generates: a hook and headless parts per thing (K46 call 9's "reference"), a headless piece per
   operation (K29), pages from a declared map (K31), and composite components for what UI SDK does not ship (K36).
   This settles board decision 4, and it overrules the second pass's recommendation to keep the Astryx code.
2. **Every agent is an actor**, manager or worker: one Durable Object each, holding its own Pi Durable harness.
3. **Inside and between agents, follow Pi Durable's own patterns**, as its 48 numbered examples show them
   (`earendil-works/pi`, `packages/durable/test/examples/`, read at 1.6.1), rather than inventing new ones.
4. **Then say how the whole thing works**, from a person or the outside world to the agents and back to a screen.

This file is that proposal. Nothing in it is built. Every new spelling is a sketch, marked `// new` in code, and needs
a slice before it is real.

## 1. The one tension, and how it resolves

Pi Durable puts a manager and its workers in **one harness**: every subagent example (21, 22, 42, 43) creates the
child conversation in the parent's own storage, owned by a task of the parent. Ownership, abort, idle, `notify` and
`waitForTask` all work on records inside one session. The spec says "one process writes a storage at a time", and
nothing in Pi connects two harnesses.

Aaron wants each agent to be an actor, and the draft runtime (#781) already gives each agent its own Durable Object
with its own harness. So a worker cannot be a Pi child of its manager.

**Pi's own examples already show how two separate things talk: the way a webhook or a person talks to a harness.**
Example 39 (ask a person) and 40 (a tool that waits for a webhook) use exactly two doors in from outside:

- `conversation.submit({ type: "input", content, requestId, whenBusy, onAbort: "keep" })`, taken once per
  `requestId`. The spec says `onAbort: "keep"` is "for input its sender cannot take back, such as another agent's
  message."
- `harness.signal(taskId, token, key, value)`, taken once per key.

And Pi says who keeps the record of what is awaited: "Whatever shows the question … keeps its own record of it, keyed
by task ID and key." The host does. In Orthograph the host is the blueprint, and the record is a thing.

So the rule is:

| Between | Use | Pi examples it follows |
|---|---|---|
| Inside one agent's actor | Pi as it is: forks, a reviewer conversation, a foreground helper, child tasks, compaction, a gate, a polling tool | 02, 21, 23, 24, 27, 41, 44, 45, 46 |
| Between two agents, or a person and an agent | a **thing** keeps the record (a `Run`, an `Ask`); its event is delivered to the other agent's actor as a submission with a request id | 22's reporter ("submits a follow-up to the parent"), 39, 40 |

The second row is example 22's background-subagent pattern with the boundary moved: the "reporter" is the outbox hop
(#905), and the "document mapping names to conversations" is the `Run` row.

**And one rule from Pi's own spec decides what a tool may do.** Spec section 12: "A parked call keeps its run busy:
new messages queue and are placed after the round; Stop is the way out." Pi's advice is to wait in a background task,
not a tool call. K46 says the same thing from the other side: a wait is a thing's state. So:

> **An agent's tool never waits for another agent or a person.** It writes a thing (starts a run, raises an ask) and
> returns at once. The answer arrives later as a new input. A tool may still park on something inside its own reach
> and short (a CI run it started, a poll), as examples 40 and 41 do.

That keeps a manager's conversation free, which was Coworker's finding F68.

## 2. The parts

```text
 ┌──────────── the browser ────────────┐        ┌──────────────── the Worker ────────────────────────────────┐
 │ pages (blueprint/app)               │        │ generated server: one operation = one call, one commit     │
 │  └ composites: Board, Inbox, Chat…  │  SDK   │   things in D1: Workspace, Manager, Task, Run, Ask, Grant… │
 │     └ references: useTask(id) …  ───┼───────▶│   the journal: every event, once                            │
 │     └ pieces: <TaskMove/> …         │◀───────┼── live: the journal's events for the things on the page     │
 │ theme: Coworker's look on --ui-*    │        │ the outbox: event ─▶ operation, retried, in order           │
 └─────────────────────────────────────┘        │ doors: /_in/github, mail, a person's answer is just a call  │
                                                └───────────────┬────────────────────────────▲──────────────┘
                                                     agent.tell │ (submit, requestId)         │ an operation, as the agent
                                                ┌───────────────▼────────────────────────────┴──────────────┐
                                                │ one actor per agent: Durable Object + its Pi harness       │
                                                │   root conversation: the manager, or the worker for a thing│
                                                │   inside: forks, a reviewer, child tasks, compaction, gates│
                                                │   tools = the blueprint's operations it was granted        │
                                                └────────────────────────────────────────────────────────────┘
```

Five kinds of part, and every one exists in the repository today in some shape:

1. **Things in the database.** What a person or a screen lists: workspaces, people, managers, tasks, runs, asks,
   grants, threads, accounts. Their states and moves are machines. The board's stage, a manager's "needs you",
   everything a screen shows, is a read over these.
2. **Agents as actors.** `Agent` (`packages/agents`) lives as an actor. The actor holds Pi's harness on its own
   SQLite, and nothing else that a screen needs. A manager has one Agent for good. A worker has one Agent per thing
   it looks after: first-principles' "one instance per thing", K39 call 8's "one durable conversation per long-lived
   thing".
3. **Events and the outbox.** Every change writes an event to the journal. A declared hop turns an event into an
   operation, retried and in order (#905). This is how anything reaches an agent.
4. **Doors and adapters.** GitHub and Slack come in through signed doors at `/_in/<mount>`, already built; email
   needs a door. Calls out are generated adapters. `intake` turns what came in into a trigger, a thread and a
   decision.
5. **The browser.** Generated references and pieces, composites, pages, and a theme.

## 3. The agents, in detail

### What an agent is

```ts
// blueprint/agents/manager.ts
export default Blueprint.agent({
  model: Blueprint.todo("AARON: per workspace, from its own key; today a model is set per environment"),
  instructions: "./manager.md",                     // its job, its mission, its process: F58's fix
  tools: [Blueprint.tools.granted],                 // new: the operations its grants allow, as tools
  hooks: { beforeTool: "noWait" },                  // declared on main for the superagent's main agent; not consumed yet
});
// blueprint/agents/worker.ts: the same agent in a role (first-principles 19), one instance per thing it looks after
export default Blueprint.agent({
  model: "set per role",
  tools: [Blueprint.tools.granted, Blueprint.tools.sandbox],  // new; the sandbox is @orthograph/sandbox (#781)
  background: { after: "5 seconds", keep: "30 minutes" },     // declared on main; not consumed yet
});
```

### How a manager starts, tells, hears and stops a worker

| Step | What happens | Orthograph | Pi |
|---|---|---|---|
| Start | The manager's tool `run.start { task, role, brief }` | an operation, called as the agent (`Blueprint.role(Task, { agent })`); writes a `Run` row and opens a worker `Agent` | `agent.open`, then the first tell |
| Tell | `RunStarted` → hop → `agent.tell { agent, requestId: run.id, input: brief, opens: true }` | outbox hop, as the superagent's `AssignmentStarted` hop does | in the worker's actor: `root.submit({ type: "input", requestId, whenBusy: "steer" })`, as #781 does |
| Work | The worker works in its own actor | its tools are operations and the sandbox | everything in-harness: a fork for a fresh reviewer (27, first-principles 15: "someone else checks it"), child tasks (23), compaction (24), a CI wait (40) |
| Report | The worker's tool `run.report { run, report, note, evidence }` | an operation; the `Run` row moves; `RunReported` | returns at once |
| Hear | `RunReported` → hop → `agent.tell { agent: manager, requestId: report.id, input }` | outbox hop | in the manager's actor: `submit({ whenBusy: "followUp", onAbort: "keep" })`. Pi's inbox (19) puts reports that arrive together into one turn: "things that arrive together are one wake" (first-principles 16) |
| Silence | The worker's turn ends without a report | `AgentIdled` (#781) → hop → `run.idled`, which ends a run that never reported (Coworker's "running for ever" bug) and tells the manager | Pi's turn ends; #781 commits `idled` |
| Stop | A person, or the manager, calls `run.stop` | `RunStopped` → hop → `agent.close` | `conversation.abort()`; Pi's abort runs bottom-up inside the worker's harness |

### A manager above a manager

There is no new call. A manager's tool `manager.create { above, job }` makes a `Manager` row and opens its Agent.
"Hand down, report up, ask up" (first-principles 10) is the same three hops one level higher: `ManagerTold`
(down), `ManagerReported` (up), and an `Ask` to a person. The root manager is the first `Manager` row of a workspace,
made with it. Depth is not bounded by anything in Pi or here; a limit on depth goes with the grants.

### How an agent asks a person, and carries on

| Step | Orthograph | Pi |
|---|---|---|
| The tool `ask.raise { to, need, shows, options, by }` | an `Ask` row in `waiting`; `AskRaised` | returns at once: "asked Ada; you will hear back" |
| The person sees it | the Inbox reads `Ask` rows by `to`; an email notice if they asked for one | — |
| They answer | `ask.answer`, allowed only to the person it is addressed to | — |
| The agent hears | `AskAnswered` → hop → `agent.tell { requestId: ask.id, input: the answer }` | a follow-up submission; the next turn sees it |
| Nobody answers | `ask.lapse` by the clock at `by`, or `ask.pass` to the stand-in; `AskLapsed` is told the same way | — |

This is example 39 with the record kept by the host, which is what 39 says the host does. The difference: 39 parks a
task in Pi on a signal; here the wait is the `Ask` row, so it is listed, reminded, passed on and drawn on a screen,
and the agent's run is never held open.

**An action set to ask** follows Pi's approval gate (44), with the same change. The agent's `beforeTool` hook asks
the grant. On "ask" it raises an `Ask` with `shows` set to exactly what will be sent (F66), and blocks the call with
"asked first". When the `Ask` is answered yes, the tell carries the approval's id, and the agent calls again with it.
The generated action's own `needsApproval` (on `main`) is the same idea for a fixed mark; a grant makes it data.

### What survives a restart

Everything. Pi's harness resumes in the actor (example 12, `test-workers/wake.test.ts`). The draft's `agentActor`
already opens it in `blockConcurrencyWhile` and drives Pi's timers from the alarm. Every hop is an outbox row,
retried until delivered. Every tell carries a request id, which Pi takes once per conversation. Every record of a wait
is a thing.

### What Pi Durable version

Coworker runs 1.6.0; the draft pins 1.5.0; Pi's repository is at 1.6.1, marked "Experimental. The API changes without
notice". 1.6.1 renamed `submit(tx, …)` to `admit(tx, …)`. **Take 1.6.0 now** (published 20 November, past AGENTS.md's
three days). Move to 1.6.1 once it is three days old.

## 4. The screens, in detail

### What each screen is built from

```text
blueprint/app/app.ts               the shell: sidebar layout, nav = System, Inbox, Search, the tree of managers (first-principles 34, 35)
blueprint/app/pages/<page>.ts      one per screen: route, who may open it, what it shows (reads), what it offers (operations)
blueprint/app/components/<c>.ts    one per composite: board, inbox, chat, transcript, table, tree, chart, editor
generated/web/<thing>.ts            the reference per thing                         new: K46 call 9, no slice
generated/web/<thing>/<verb>.ts     the piece per operation                         K29: generator missing, checks 04-08 red
generated/web/_components/<c>.ts    each composite's wiring: its data and actions   K36: not built
generated/app/                      routes, links, navigation, the palette          K31: built for the portal
src/web/components/<c>/             each composite's behaviour, on UI SDK            the app's own code
src/web/theme.css                   Coworker's look, on --ui-* and data-slot          the app's own code
src/web/pages/<page>.tsx            how a screen is laid out from the above           the app's own code
```

### The reference: a hook and headless parts per thing

From K46 call 9 and its sketch in `docs/explainer/films/capxul-lite/app/falls-out/`, applied to a `Task`:

```tsx
const task = useTask(id);         // new, generated
task.state                        // "open"
task.fields                       // only the fields this caller may see
task.can                          // ["move", "comment"] for this caller, from the machine and the roles
task.needs                        // what it waits for: "Ada's answer, by Friday", from its runs and asks
task.live                         // true while it is being watched for changes

<Task.Root id={id}>               // new, generated: headless, every part a UI SDK primitive
  <Task.State />
  <Task.Field name="title" />
  <Task.Needs />
  <Task.Move name="finish">Done</Task.Move>   // renders the generated piece for task.finish; hidden when it can't
</Task.Root>
```

Every screen reads through references and writes through pieces. K29's rule holds: "no page talks to the server
except through a generated piece or action, and no page builds a form field by hand."

### The composites Coworker needs

UI SDK has no table, data grid or kanban, and no chat, chart or markdown. These are Coworker's composites, each a
`Blueprint.component` (K36) with hand-written behaviour on UI SDK's blocks, in the order the screens need them:

| Composite | Coworker's screens | Built from |
|---|---|---|
| Board | Board (Kanban), a manager's process | `createReorder`, `createTransfer`, a list read per lane, `task.move` |
| Table | Board as a list, Members, Audit log, Usage, People, Environments | `createGridFocus`, `createSelection`, `createCellRange`, a list read with filters (row `lists`) |
| Inbox | Inbox, a question as a page, In and out | a list read of `Ask` by person, the reading pane, `ask.answer` |
| Chat and transcript | Talk to it, one thread with its trace | `createStickToBottom`, an Agent's turns read out live (below) |
| Tree | the sidebar's managers, Threads, the root's tree, pages | UI SDK's `Tree`, a read with `parent` (row `trees`) |
| Chart and tile | Home, Overview, System, Usage | the theme's chart file; reads that count |
| Editor | Mission, Skills | markdown in a primitive with its own `value`, so an agent can read it (the spike's finding) |

The first composite pays for the rest of Orthograph's portal too: K29 section 7 puts Grid, Board and Chat in
`@orthograph/shell` "each with the first page that needs it". Coworker's would be the first page.

### The look

Coworker's look today is Astryx's `theme-neutral` plus its page templates (`docs/screens.md` names one per screen).
Rebuilt, the look is a theme: Astryx's tokens copied onto UI SDK's `--ui-*` tokens, and its spacing, type and shapes
written as CSS over `data-slot` in `src/web/theme.css`, layered over `@orthograph/theme`. The 340 screenshots Coworker's
suite took are the reference for every screen, old beside new.

### Live

A board moves when an agent moves a card. A chat streams. Nothing in Orthograph does either today, and nothing is
decided. Proposed:

- **A reference is live.** The page opens one connection; each reference on it subscribes to its thing's events from
  the journal; an event reloads the reference. K29's `reloadsOn` already lists what to watch; this extends it from
  "after an action on this page" to "after any change, from anyone".
- **A transcript is Pi's own watch, relayed.** Pi's documented UI path is `conversation.watch()`: a window of entries,
  the live document with the turn as it streams, and chord ops to apply in the browser (README; examples 18, 20, 31).
  Coworker's older chat app already does exactly this over a socket (`chat-host/internal/watches.ts`). The actor
  relays it; a generated `useTranscript(agent)` applies it.

## 5. One job, end to end

Coworker's own first slice is "GitHub, for us" (`docs/github-journey.md`). Here it is, through every part.

1. **Someone mentions the manager on an issue.** GitHub posts to `/_in/github`. The door checks the signature and
   takes the delivery once (built, `packages/host-cloudflare/src/modules/inbound`). `intake` makes a `Trigger`, finds
   or makes the issue's `Thread`, and the gate decides: the author may ask (`intake`, on `main`, parked).
2. **The manager hears it.** `TriggerAccepted` → hop → `agent.tell` to the manager. One turn, with its mission in its
   instructions.
3. **It decides and plans.** Its tools: `task.create { why, doneWhen }`, then `run.start` for the issue's worker.
   Both are operations, called as the manager, each checked against its grants. Two rows, two events. Its turn ends.
4. **The worker for this issue starts.** `RunStarted` → hop → `agent.open` and `agent.tell`. One worker Agent for
   this issue, for weeks: what arrives on the issue, its pull request or mail about it goes to this worker, not the
   manager.
5. **It answers on the issue within a minute.** The tool is the GitHub adapter's `issues.createComment`, as an
   operation the worker was granted for this repository.
6. **It works.** In its sandbox, with a token for one repository. It opens a pull request (adapter call). In its own
   harness it forks a fresh conversation to review the diff (Pi 27), and fixes what the review finds.
7. **CI runs.** The worker's tool started it and parks until the check run arrives: Pi 40, inside the worker's own
   reach. The `check_run` webhook comes through the door; `intake` follows it to this thread; the hop delivers it to
   the worker as a signal or a tell.
8. **It reports.** `run.report { ready, evidence: the pull request }`. `RunReported` → hop → the manager's next turn.
   The board's card moves on every screen watching it.
9. **Merging is set to ask.** The manager's `pulls.merge` hits its grant's "ask". An `Ask` is raised to the person
   who answers for the work, showing the pull request and what merging does. Ada's Inbox shows it at once.
10. **Ada answers.** On the question page: the reference `useAsk(id)`, the piece `<AskAnswer.Root>`. `AskAnswered` →
    hop → the manager's next turn, carrying the approval. It merges.
11. **It finishes.** `task.finish`, checked: every done-when line met, and not by the worker. The issue is closed,
    whoever asked is told on the issue, and the worker's Agent is closed.
12. **Quiet for a day.** A task in `open` with nothing moving has a next look at a date (first-principles 16: "no open
    task without a next"). The keeper makes the move, which tells the manager. This needs moves made by a clock:
    spiked (`world-clock-keeper`).

What a person saw: one comment on the issue, a pull request, one question in their Inbox, and a card that moved on
its own. What they did: one click. That is Coworker's measure, "minutes of your attention" (`github-journey.md`).

## 6. What this needs from the framework

Every item is a gap from `map.md`, now in the order this design needs it. "Coworker's goal" means the goal Goal 18
would make if Aaron accepts this.

| # | Piece | Standing | Paths | Who |
|---|---|---|---|---|
| 1 | The agent runtime: `agent.tell` and `agent.close`, on Pi 1.6.0 | draft #781 | `packages/agents`, `packages/host-cloudflare/src/modules/actors` | Coworker's goal takes Goal 17's slice 9 |
| 2 | The outbox, and an actor's own events making hops | draft #905; "an actor writes no rows yet" | `packages/host-cloudflare/src/modules/outbox` | the same |
| 3 | Tools from operations, and an agent's own credential to call them | decided, not built | `packages/agents`, `packages/host-cloudflare/src/modules/auth` | the same |
| 4 | Grants: a role decided by data, and "ask" as a gate | missing | `packages/orthograph/src/modules/roles`, `packages/language-effect/src/modules/access` | Coworker's goal; asks Goal 16 first, who last touched `access` |
| 5 | The piece generator and `@orthograph/web` | checks 04-08 red | `packages/projections`, `packages/web` | Goal 5's slice 4, parked: Coworker's goal takes it |
| 6 | The reference per thing | decided (K46 call 9), no row | `packages/projections`, `packages/web` | Coworker's goal; a row for Goal 18 |
| 7 | Pages and composites in an example | K31 built for the portal; K36 wiring not built | `packages/projections/src/modules/app`, `packages/shell` | Goal 6's slices, parked: Coworker's goal takes what it uses |
| 8 | Live references and a relayed transcript | missing, undecided | `packages/host-cloudflare`, `packages/web` | a decision for Goal 18 first |
| 9 | Moves made by a clock | spiked | `packages/host-cloudflare/src/modules/clock` | `timers` is Capxul's by rank |
| 10 | Lists with filters, a record under a parent | decided | `packages/projections`, `packages/orthograph/src/modules/things` | Capxul's books by rank |

Three of these, 5, 6 and 7, belong to goals K44 parked. Taking them is allowed ("a stopped goal's slice is not
scheduled: the app goal that needs it takes it"), and every Orthograph app will use them.

## 7. The order

Two tracks, as before, and the screens track now builds the framework's UI layer as it goes.

**The agents.**

1. The loop by hand: `Manager`, `Task`, `Run`, people playing both parts. `e2e/coworker/01-the-loop-by-hand.test.ts`.
2. The loop by agents, on a scripted model: needs 1 to 3 above. `e2e/coworker/02-one-manager-one-worker.test.ts`.
3. It asks first: `Ask`, grants as a gate (4).
4. A manager above a manager.
5. GitHub end to end, the twelve steps above, against stand-ins: `e2e/coworker/05-github-for-us.test.ts`.
6. Once, on staging, with a real model and a real repository: needs Aaron's yes for the credentials.

**The screens.** Each ends with the screen side by side with its old screenshot.

1. One screen through the whole stack: the question page. A reference (`useAsk`), a piece (`ask.answer`), a page.
   It needs 5 and 6, and it proves Goal 5's checks 04 to 08 on a real app.
2. The Inbox: the first composite, a list read, live (8).
3. The Board: the board composite.
4. The chat and a thread: the transcript relayed.
5. Getting in, settings, people: mostly pieces and the table composite.
6. Home, Overview, Usage: charts and counting reads.
7. Everything else on `docs/screens.md`, in its own order.

## 8. What is still Aaron's

1. **Which screens are the authority**, now that all are rebuilt: the built ones for what works, the agreed ones
   (`docs/screens.md`) for the board, the task, the manager tree and the agents? And is "the canvas" his findings
   mention a real file to rebuild from?
2. **The look.** Keep Coworker's look exactly (Astryx's tokens and templates, reproduced as a theme), or move it to
   Orthograph's own theme? Recommended: keep his look; it is what he designed.
3. **Coworker as a third build**, taking the agent work from the parked superagent and the UI layer from the parked
   Goals 5 and 6. Recommended: yes. It is a large claim, and it is the only way any app gets a UI on Orthograph soon.
4. **Live updates are a framework decision**, not Coworker's. Recommended: references that reload from the journal's
   events over one connection a page, and the transcript as Pi's watch relayed.
5. **Grants: Coworker's guard first, or the framework's from the start.** Recommended unchanged: Coworker's first.
