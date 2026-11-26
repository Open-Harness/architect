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
| [`inventory.md`](inventory.md) | what works in Coworker today, what was run to find out, and every module on a line |
| [`front-end.md`](front-end.md) | three ways to do the front end, graded; the folder with the web app in it; parity as the done check |
| [`end-to-end.md`](end-to-end.md) | **the proposal**: how the whole thing works, from a person or GitHub to the agents and back to a screen |
| [`agents.md`](agents.md) | the agent layer: what is wired, stubbed and faked; agents as actors; Pi Durable against K46; nesting; the first slice |

**Three lines from Aaron reached this audit after its first pass**, through the thread that started it, and the last
three files answer them: "it needs a front end, it needs to replace everything that works currently in the vibe coded
version"; "one thing that defo doesn't work is the agents they should be pi durable"; "and they should be actors."
Where the first pass and these disagree, the sections below have been rewritten.

**Then Aaron answered the second pass** (26 November 2026): "we will take all the ui but rebuild it all on our
things. including hooks and headless components as for agents. they need to be actors and they should follow the same
pattern from pi durable and its examples in the repo. then it should propose how the whole thing should work end to
end". So:

- **Decided: every screen is rebuilt on Orthograph's own layer**, a hook and headless parts per thing and a piece per
  operation. This answers decision 4 and overrules the second pass's recommendation to keep the Astryx code
  (`front-end.md`, option C). The screens stay as the design.
- **Decided: every agent is an actor, following Pi Durable's own patterns.** Read in Pi's repository: its 48
  examples and its spec (`end-to-end.md`, section 1).
- **`end-to-end.md` is the proposal he asked for.** It is a proposal: nothing in it is decided until he says so.

## What was run, and what was not

The first pass ran nothing. For the second, Coworker (at `58f1f0e`) was installed and run in a container with every
outside thing faked and no credential: it typechecks, it builds, and **all 616 of its fast tests pass**, the 59
evals of that tier among them. Its browser tier passes too: **65 of 65**, with 340 screenshots, a sample of which was looked at. `inventory.md` has the table.

Not run: the live tier (real mail, a real GitHub App, real containers), which needs staging and its credentials; any
real model; and staging by hand, which Aaron did and wrote up as 78 fixes by its own count. Pi Durable's spec and examples were read in its own repository in the third
pass, and none was run. On the
Orthograph side no suite was run: standings come from `docs/canon/status.md`, the ratchet lists and the pull
requests' own descriptions, and draft #781 was read in part.

Green tests are weak evidence here, by Coworker's own account: finding F23 is "81 of 81 passed with all of the above
true". So "works" in this audit means the tests pass **and** no finding says it fails in real use.

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
7. **Most of Coworker works, and the part that does not is the heart.** Sign-in, workspaces, joining, roles,
   settings, the vault, the inbox, mail and GitHub in, the gate and the audit all work. The agents do not, and are
   not to be matched: they are the part to build right.
8. **The board and the task page work and are not what Aaron wants**: fourteen of his own findings say so. They are
   drawn again, not ported.

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

**Aaron decided: every screen is kept as the design and rebuilt on Orthograph's own layer** (his words above). How,
in `end-to-end.md`, section 4:

- Each screen is a page declared in `blueprint/app/` (K31). Reads go through a generated **reference per thing**, a
  hook and headless parts (`useTask(id)`, `<Task.Root>`, `<Task.Move>`: K46 call 9). Writes go through a generated
  **piece per operation** (K29). No page talks to the server any other way.
- What UI SDK does not ship (a board, a table, an inbox, a chat, a tree, charts, an editor) is a **composite** (K36):
  its wiring generated, its behaviour written on UI SDK's blocks. They are the first of their kind in Orthograph.
- Coworker's look becomes a **theme**: its tokens on UI SDK's `--ui-*`, its shapes as CSS. The 340 screenshots from
  its suite are the reference, old beside new.
- This builds the framework's UI layer, which is parked in Goals 5 and 6: the piece generator, `@orthograph/web`,
  the reference, composites and live reads. `front-end.md` graded this way lowest on speed; it is now the plan, and
  the order in `end-to-end.md` section 7 starts with one screen through the whole stack.

**Done is still parity** (`front-end.md`): Coworker's flows as journeys, its browser specs ported, a list of what is
red that only shrinks, and a check for each of Aaron's findings.

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

**How the agents follow Pi's own patterns** is `end-to-end.md`, section 1 and 3. In short: inside an agent's actor, Pi
as it is (forks, a reviewer, child tasks, gates, a CI wait). Between agents, Pi's own pattern for a webhook or a
person (examples 39, 40) and its background-subagent reporter (22): a thing keeps the record, and its event is
delivered to the other agent as a submission with a request id.

The agent hierarchy does not need Pi's parent and child at all. A manager above a manager is two `Agent`s and an
event between them, which is how every level then looks the same.

### 4. What is the first slice?

**One manager running one worker on one task, proved by a journey.** The first pass put a board with no agent
first. Aaron's point changes that: the one thing that does not work is the heart of the product. It is too big for
one slice that ends green, so it is two, sharing one journey (`agents.md`).

1. **The loop by hand.** `Manager`, `Task` and `Run`, and five operations. People play the manager and the worker.
   Check: `e2e/coworker/01-the-loop-by-hand.test.ts`. Needs nothing new from the framework.
2. **The loop by agents.** The same journey with the people taken out, on a scripted model: a person asks, the
   manager adds a task and starts a run, the worker reports, **the manager is woken and finishes the task**. Then a
   restart in the middle, and a worker that goes silent. Check: `e2e/coworker/02-one-manager-one-worker.test.ts`.
   This is the first framework work: the superagent's unfinished agent runtime, moved to Pi Durable 1.6.

## The order after it

Two tracks, side by side. Every slice ends green on a check it names.

**The agents, built right.**

1. The loop by hand.
2. The loop by agents.
3. **It asks first.** The `Ask`; an action set to ask; the answer is the manager's next turn.
4. **A manager above a manager.** A root per workspace, managers made by managers, told down and reported up.
5. **Authority handed down.** Grants: narrower at each level, taken back from above.
6. **A real model, once, on staging.** A scripted model proves the plumbing and nothing about judgement. Needs
   Aaron's yes for the credential.

**Everything that works, replaced, on Orthograph's own UI layer.** The order is `end-to-end.md`, section 7: one
screen through the whole stack first (the question page: a reference, a piece, a page), then the Inbox, the Board,
the chat and a thread, getting in and settings, the charts, and the rest of `docs/screens.md`. Each ends with the
new screen beside its old screenshot, and with files deleted from the parity lists.

Later, each its own slice: the agreed new screens, connectors with a view, MCP servers, a store per tenant.

## The decisions only Aaron can make

The second pass's list, kept with what has happened to each. The current list is `end-to-end.md`, section 8, which
the board shows.

1. **Which screens are the authority?** The ones built, or the ones `docs/screens.md` agrees, with
   `docs/model-next.md` behind them. *Recommend: the built ones for everything that works, and the agreed ones for
   the board, the task, the manager tree and everything about agents.* His findings also speak of screens "drawn on
   the canvas", which this audit has not seen; if that canvas is the real authority, it needs to be shared.
2. **Is Coworker a third build?** K44 says two things are built now, the alpha and Capxul, and parks the superagent.
   Coworker needs the superagent's unfinished agent work. *Recommend yes, as the app that pulls agents*: it takes the
   superagent's open agent slices, and the superagent stays parked.
3. **Where does it live?** *Recommend inside this repository*, as `examples/coworker`, until the packages are on npm.
4. ~~Do the Astryx screens stay?~~ **Decided by Aaron, 26 November**: rebuilt on Orthograph's own hooks and headless
   components. Two questions follow, in `end-to-end.md` section 8: keep his look exactly as a theme (recommended), and
   live updates as a framework decision (references reloaded from the journal; the transcript as Pi's watch relayed).
5. **On, ask or off, handed down: Coworker's own guard, or a framework primitive?** *Recommend Coworker's guard first,
   then lifted into the framework once it works*, which is how every plugin here has been made.
6. **Four blanks in the model**, one line each. *Recommend:* a task keeps both a lane and a "what happens next"; a
   worker is a saved agent with versions; a person's own permission changes stay, as grants a person holds; a
   connector's view waits until pages exist.
