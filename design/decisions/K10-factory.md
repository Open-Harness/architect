# K10: the factory

Decided 18 November 2026. The architecture is the 📐 factory thread's, under "Who decides" in `AGENTS.md`. What the
factory must do is Aaron's, from his words that evening and his answers to round 1 ("Aaron's answers" at the end).
This reopens what K4 and K5 parked: the factory and its surfaces. The plans surface is not reopened here; it is K11's
board. Dispatch is K11's too.

## Aaron's words (18 November 2026, by speech)

> "We are defo using Pi Durable for the portal's chat. We are going to make our own thing on top of Pi Durable that can
> automatically connect into any function and use the application, whatever it is you're building. But in the portal
> we are going to have a customised set of agents for building the application."

> "We are building with sandboxes, and not only are we building with sandboxes, but we have production environments."

> "Anything that you can do inside that portal should be an action, just like in Agent Native."

> "Ultimately we want to build this as reusable components … small and modular. We want to do loads of experiments,
> loads of code spikes, with loads of different types of plugins and extensions. Some of them are going to stick, most
> of them are not … if we keep it at that level, we can go crazy with the experimentation and get back clean, and what
> stays on production is just straight clean."

## The shape in one picture

```text
   the portal (one, K5)  ── its face is HeroUI Pro's own components; nothing about agent UI is canon (decision 9)
     │ chat (M4.16)           │ Factory pages (this record)        │ the board (K11, 🗂)
     ▼                        ▼                                    ▼
 @orthograph/agents ◄──── @orthograph/factory ────► @orthograph/workspaces          @orthograph/work
 Run, Agent, toolsOf,     building agents (roster),   Workspace: a sandbox with a     items, dispatch, manager
 Pi Durable, a DO per run Experiment, brief.of        project at a revision;          ── agents.run.start ──►
       ▲                                              `ortho` as operations;
       └─ "any function": the app's actions as tools  sandbox adapters (local, E2B)
```

Four packages, each a plugin mounted with one file, each removable by deleting that file:

| Package | Owns | Status |
|---|---|---|
| `@orthograph/agents` | `Run`, `Agent`, the Pi Durable seam, a Durable Object per run, `toolsOf(operations)`, `Blueprint.agent` | M4 (H1, H2, M4.04 to M4.10) |
| `@orthograph/workspaces` | `Workspace`, `ortho` as operations, the sandbox adapters | **new**, this record |
| `@orthograph/factory` | the building agents (the roster), `Experiment`, `brief.of`, the Factory face in the portal | **new**, this record |
| `@orthograph/work` | goals, items, claims, dispatch, the manager, the board | M3 and K11 (🗂), not designed here |

`workspaces` and `factory` are added to `naming.md`'s list of later packages. Neither clashes with an existing name.
**"Factory" from here on means `@orthograph/factory`**: the building agents and experiments. The board, the manager and
dispatch are `@orthograph/work` (K11), even where older text (`frame/examples/factory.md`, M3's heading) calls all of it
"the factory".

## 1. The agent layer on Pi Durable

**"Connect into any function" means the app's generated actions become an agent's tools, with nothing written by
hand.** That is `toolsOf(operations)` (M4.07, H1.5 b): one tool per operation, with its parameters from the payload
schema. It is the same mapping the MCP projection and the actions projection (M1.22) make, shared as one pure function.
It calls through the generated SDK as the agent principal acting for the person who started the run (`agent for ada`,
M2.01 and M2.03). Roles, refusals and typed errors are therefore the real server's. An operation marked
`.notVia(Via.agent)` is never a tool.

The layer has two users, and both are runs of `@orthograph/agents`:

| | The portal's chat (any app's own assistant) | The building agents |
|---|---|---|
| Declared as | one `Blueprint.agent` the app mounts, `operations: toolsOf(app.actions)` | `Blueprint.agent`s in `@orthograph/factory` (section 2) |
| Its tools | every action the signed-in person may call, from the model | the workspace's operations only, fenced per role |
| Where it acts | the running app, through the SDK | a workspace (a sandbox), never the running app |
| Run per | chat thread (M4.16) | dispatched item or chat thread (K11, M4.13) |

**What is shared:** `Run` and its machine, the Durable Object host, Pi Durable behind the Effect seam, model adapters,
`toolsOf`, approvals (the wrapper's, M1.23), run telemetry and the run record. **What differs:** only the declaration,
meaning which agent and which operations. A building agent is an ordinary agent whose operations happen to be a
workspace's. No second agent runtime exists.

**Relation to existing slices.** M4.07 is the "any function" mechanism, unchanged. M4.10 gains two things the seams
need (section 5): `Agent` as a thing read from the model's `Blueprint.agent` declarations, so the portal can list and
address agents, and `run.start` taking a request key with closed `outcome` and `reason` unions. M4.16 is the chat, and
any chat thread may be addressed to any listed agent. Run's reference to the thing it touches (needed by the portal's
rail) is a model change owned by **M1.03**, alongside `from: { kind, mount }`. That was the conductor's call on 18
November, and the conductor adds both to M1.03's row through the M1 lead. Nothing in M4 changes the compiler.

**On stage 3's path.** M4.10 and M4.16 are needed by stage 3 (ST3.07). What K10 adds to them is small and is needed by
the chat in any case: `Agent` as a thing read from declarations, the request key, the closed enums, and
`chat.addressees`. Everything else of the factory is in new slices off that path.

**Durability, from `spikes/durable-run`:** one SQLite Durable Object per run. A tool call's request key is namespaced by
(Durable Object id, Pi task id, provider call id), so a replayed tool call commits once. The limit of the no-repeat
guarantee is the model checkpoint: an eviction while a model request is in flight repeats that request (finding 2).

## 2. The building agents

The roster mirrors our own threads (Aaron, Q2 = A). Each agent is one file in `@orthograph/factory/blueprint/agents/`,
with fenced tools and the role bundles of `frame/skills.md` 3.10:

| Agent | Does | Its operations (all on its own workspace) | May write | Ends with outcome |
|---|---|---|---|---|
| `designer` | talks a decision through with a person; writes the record | `read`, `write`, `diff`, `push` | `design/` | `pushed`, `answered` (talk only) or `blocked` |
| `author` | journeys and checks from declarations, before any build | `read`, `write`, `check`, `prove --empty`, `diff`, `push` | `blueprint/journeys/`, `blueprint/starting-worlds/` | `pushed` |
| `builder` | fills one brief | `brief`, `read`, `write` (the brief's paths only), `check`, `prove`, `diff`, `push` | the brief's `write` paths | `pushed` |
| `reviewer` | reads a diff against its brief, `AGENTS.md` and `design/` | `read`, `diff`, `review.record` | nothing | `reviewed` |
| `spike` | answers one question in throwaway code | `read`, `write`, `check`, `prove`, `diff`, `push` | `spikes/<name>/` | `pushed` (a README with the answer) |
| `planner` | turns an idea into declarations | `read`, `write`, `add`, `generate`, `check`, `diff`, `push` | `blueprint/` except journeys' steps | `pushed` |

The manager is K11's and lives in `@orthograph/work`, not here.

- **`ortho` as actions.** Every `ortho` step an agent uses is an operation of `Workspace` (section 3): `check`,
  `prove`, `add`, `generate`, `brief`, `diff`, `push`. So each one is also a portal action, a CLI command, an MCP tool
  and an agent tool, all from the one declaration (Aaron: "anything you can do inside that portal should be an
  action"). A person in the portal, a Claude Code session over MCP, and a building agent call the same thing.
- **No shell.** A building agent has no shell and no `process.env`. Its tools are the whole boundary (H1.7,
  `frame/builder.md` section 6). The only way its work leaves the workspace is `workspace.push`, which pushes the branch
  and opens the pull request through the `github` adapter.
- **Sandboxes only, never production.** No building agent has a binding to a deployed environment. `bp.world.start`
  makes only local worlds inside the workspace. `promote` is not one of its operations.
- **The roster is declared data.** `factory.roster` is generated from the agents' files, and
  `factory.roster.for(kind)` gives the agent for an item kind: builder for `build`, `fix` and `improve` (M3.09's
  kinds); author for `write:journey`; reviewer for `review`; spike for `spike`; planner for `specify`. The designer is
  reached from the chat, not dispatched. K11's dispatch calls `roster.for`, so no string names an agent. K11 carries
  it the same way (the conductor's call, 18 November): an item has a `kind`, its `worker` is `person | agent`, and an
  agent worker's role is `factory.roster.for(kind)`, with no second copy of the roster. Dispatch has a review pass that
  starts the reviewer for items in `review`.
- **First two, then the rest.** The builder and reviewer come first. The others follow, each one file.

## 3. Sandboxes and environments

**A workspace is a sandbox holding one project at one revision on one branch.** It is a thing in
`@orthograph/workspaces`, with the machine `opening → open → pushed | closed`. Its operations:

```ts
// @orthograph/workspaces/blueprint/things/workspace/verbs/
open.ts      // { project, revision, branch } → { workspace }; refused WorkspacePoolFull when the slots are taken
read.ts  write.ts  list.ts   // write refused outside the caller's allowed paths: realpath, case-insensitive (check 4's rule)
brief.ts     // the brief for an item, from the model (`bp.brief`)
check.ts  prove.ts  add.ts  generate.ts   // `ortho` itself, run inside the sandbox; answers are values, never thrown
diff.ts      // { changed: string[], patch }
push.ts      // the branch and a pull request through the github adapter → { branch, pullRequest, revision, changed }
close.ts     // the sandbox and every world in it destroyed; idempotent
```

**Where a run executes.** The run's loop is in its own Durable Object (`@orthograph/agents`). The workspace is in a
sandbox the Durable Object drives, keeping only the sandbox's id (`spikes/e2b-sandbox`). Sandbox providers are
adapters of `@orthograph/workspaces`, chosen at the mount (_Superseded by K40, 22 November 2026: the sandbox is its own
adapter, `packages/sandbox`, Pi's `ExecutionEnv` over pi-env, and workspaces use it_):

| Choice | When | Status |
|---|---|---|
| `localCopy` | journeys, CI, and a person's machine; free and keyless | first rung: check 4's throwaway copy, made a provider |
| `e2b` | real runs, from the portal, with the machine off and many at once (Aaron, Q4 = A) | spiked in workerd (`spikes/e2b-sandbox`); needs our template |
| `cloudflare` | if E2B ever falls short | later; not spiked |

**How a sandbox gets the project.** The E2B template holds Node 24, pnpm and a warm clone of the project at its default
branch, with its store already installed. `workspace.open` fetches the revision and checks out a new branch. The local
copy does the same from the working tree, without `.git`, `node_modules` or `.ortho`. Long commands (`pnpm install`,
`prove`) run in the background, and the Durable Object checks back on an alarm (the spike found the sandbox carries on
while the object is gone).

**Spend.** Sandboxes get their own share of the $10 a day: **$5 a day by default** (Aaron agreed to the recommended
default), set on the mount. Each sandbox is tagged with its workspace id and has a `timeoutMs`. A sweep by tag removes
anything a crashed object leaves, and every script and journey ends by listing what is left: 0.

**From sandbox to production.** Production stays clean: only what passed `prove` and review lands there (Aaron, Q5 = A).

```text
workspace (sandbox) ─ push ─► pull request ─► CI proves it in a test world, signed verdicts to the logbook
                                           └► the reviewer agent (or a person) records a `review` verdict
   both green ─► merged to main ─► promoted to staging automatically
   staging green ─► attention "promote to production" ─► Aaron's yes ─► CI promotes the exact bundle
```

- **`review` is a verdict kind** in the logbook, keyed by revision. A person's review and the reviewer agent's are the
  same kind (K11 seam 3). It is built early, in its own slice (M3.20), because K11's board and K10's experiments both
  close on it.
- **Staging is automatic** once a revision on `main` has its prove and review verdicts. **Production is always a
  person's yes**, an attention that only Aaron, in person, approves (`notVia(Via.agent)`). Today `promote` refuses a
  revision whose verdicts from `main` are not all passing for every operation in the source environment
  (`packages/prove/src/modules/promote/types.ts:29-31`). Two things change (M4.24): promote also requires the
  revision's `review` verdict, and staging's promote is started by CI with nobody asked.
- The factory never holds release secrets. CI promotes, as today.

## 4. Experiments: cheap to start, cheap to throw away, clean when kept

This is Aaron's main aim. **An experiment is a plugin in its own workspace, by default** (Aaron, Q3 = C):

```bash
# the app's generated CLI (here acme's), from Experiment's operations; no hand-written command
acme experiment start voting-by-hats               # workspace + a new plugin package, mounted only in that workspace
# agents (or you) build it; a preview world runs in the sandbox; the portal shows it
acme experiment discard voting-by-hats             # workspace, worlds and branch gone; main never touched
acme experiment keep voting-by-hats                # refused without prove and review verdicts; then one pull request:
                                                   #   the package folder and one Blueprint.use file, nothing else
acme experiment start voting-by-hats --spike       # the spike lane: open, throwaway, README only, never kept
```

`Experiment` is a thing in `@orthograph/factory` with the machine `started → kept | discarded`. `keep` and `discard`
are its moves, so they are actions, buttons and tools with no page of their own (the portal's contract).

- **Cheap to start:** one workspace, one scaffolded plugin (`ortho new feature`, M2.10, run inside it), one mount
  file inside the workspace only. Its write set is its own package folder plus that mount file, so ten experiments at once never touch
  the same files, and K11's dispatch can run them all.
- **Cheap to throw away:** `discard` is `workspace.close` plus deleting the branch. Nothing reached `main`, so nothing
  needs untangling.
- **Kept clean:** `keep` can only land a plugin: a package under the six-slot rules, mounted with one line. A kept
  experiment that needs tidying gets a builder item ("refactor to the rules") before its review, never after. Unmounting
  it later is deleting one file.
- **The spike lane** is for questions about the core that can't be plugins, the way spikes work today (`AGENTS.md`):
  `spike/<name>`, a README, merged for the record, never imported.

## 5. The seam with the work board (agreed with 🗂, K11)

Agreed through the conductor on 18 November. K11 records it in "The seam with the factory", in the shape below.

```ts
// out: work → agents (M4.13), one call per claim
agents.run.start({
  agent: factory.roster.for(item.kind),                // declared data, never a string
  budget,
  brief: { project, revision, task?: TaskKey, item: { id, text, doneWhen } },
  key: claim.id,                                       // the request key: a replayed dispatch starts nothing twice
});
// back: through `on:`
agents.events.runFinished  { run, outcome, branch?, pullRequest?, revision?, changed? }
agents.events.runFailed    { run, reason, transient }
agents.events.runCancelled { run }                     // never a failure
```

1. **The brief.** With `task`, the agent calls `workspace.brief` (`bp.brief`). Without one (Aaron's words, a spec, a
   ledger row), it works from `item.text`. Work never sends file lists.
2. **Touches ahead of time.** `factory.brief.of({ task })` is a pure read of the model (`frame/builder.md:74`, today's
   `packages/cli/src/modules/brief/service.ts:19-43`). Its `write` is the plan-time touch set for K11's same-files
   rule. For items without a task, the manager declares the touches.
3. **`outcome` is closed:** `pushed` (a branch, a pull request, the changed paths), `reviewed` (a pass or a fail,
   recorded in the logbook), `answered` (a reply only, no branch), or `blocked` (a question for a person; the run ends
   rather than waiting). **`reason` is closed:** `budget`, `turns`, `wall`, `refused`, `model`, `sandbox` or `crash`,
   and `transient` is true for `model`, `sandbox` and `crash`. Cancelling stays its own move and event.
4. **A run never closes an item.** Only a verdict does (`item.close` is `service(logbook)` only). An agent's claim lasts
   as long as its run, with no heartbeat.
5. **Pool full is a signal, not a failure:** `RunPoolFull` and `WorkspacePoolFull` are typed refusals that dispatch
   reads as "no slot".
6. **Workspaces are opened by the factory's agent, not by work.** The board never knows a sandbox exists.

## 6. The factory as a portal extension (agreed with 📐 portal, M1.25)

The portal's contract, as the portal thread gave it on 18 November and still pending Aaron's answer to its Q11 in
M1.25: an extension is a feature whose package exports its face (the export's name, given here as `Portal.face`, is
M1.25's to fix), mounted with one file. Every page belongs to a thing, and every button is a generated action. A
lint rule is proposed to hold slots to actions and their own declared reads. The factory's face:

| Slot | Thing | Built from HeroUI Pro (Aaron, 18 November) |
|---|---|---|
| `sidebar` group "Factory" | Agent, Run, Workspace, Experiment | the shell's own |
| `views.list[Agent]`, the roster | Agent | Item Card Group, Item Card, Hover Card |
| `views.list[Run]` | Run | Chat List View |
| `views.one[Run]`, the live run | Run | Chat Conversation, Chat Message, Chat Message Actions, Chat Tool, Chain Of Thought, Chat Loader, Text Shimmer, Markdown, Code Block, Chat Source, Chat Attachment |
| `views.one[Workspace]` | Workspace | Code Block (the diff), Timeline (open, check, prove, push), KPI Group (spend, evals green), Widget (the preview) |
| `chat.addressees` (filled by `@orthograph/agents`) | Agent | Prompt Input, Prompt Suggestion |
| `rail.on(thing, RunsTouching)` | Run | Chat Loader, Text Shimmer |
| `context` | Workspace | `{ workspace: { branch, revision } }` |

**Chat Tool's states are our action states.** HeroUI Pro's `ChatTool` takes `state`: `input-streaming`,
`input-available`, `output-available`, `output-error` or `requires-action`, with `onApprove` and `onReject` (read on
heroui.pro, 18 November). They map one to one: arguments streaming, the call running, its answer, a typed refusal or
defect (`errorText` from the `ActionRefusal`, never a raw defect message), and `needsApproval` waiting in the wrapper
(M1.23). The run view renders the run's committed transcript (Pi Durable is the source of truth, H1.9). Experiments need
no view of their own: their moves are buttons on their lifecycle page.

## 8. No Docker: where everything runs (Aaron, 18 November, about 22:35)

> "I'm quitting Docker. I want to move everything to staging and sandboxes."

Aaron quit Docker Desktop on purpose, so nothing on his machine runs a container any more. "Local, not fake" still
stands: every service is real. What changes is where the real services run.

**What needs Docker today**, found by searching the repository:

| Service | Image today | Used by |
|---|---|---|
| OTel Collector | `otel/opentelemetry-collector-contrib:0.164.0` (`packages/prove/src/modules/telemetry/internal/docker.ts:8`) | `ortho prove`, `dev` with the viewer, every gate |
| The trace viewer | Grafana containers (`packages/prove/src/modules/viewer/README.md:5-15`) | `ortho dev`, by hand |
| OIDC issuer (GitHub's stand-in) | `ghcr.io/navikt/mock-oauth2-server:6.1.4` (`e2e/layer2/services.ts:11`, and about nine test files in logbook, cli, portal and prove) | signed verdicts, Gate 2 |
| npm registry | `verdaccio/verdaccio:6.11.1` (`e2e/layer2/services.ts:12`) | `publish`, Gate 2 |
| Anvil | a container in CI (M1.31), and a Durable Object Container locally (`spikes/world-anvil-container`) | chain worlds |
| Teardown | `docker ps` sweeps (`e2e/layer1/teardown.ts:6`, `e2e/layer2/teardown.ts:6`) | the gates |

**The architecture call: services are processes, the same in every place.** Each of these has a real form that isn't
a container. The Collector ships as a single pinned binary. Verdaccio is an npm package that runs under Node. Anvil is
Foundry's binary. A world starts each one as `Stand.process`, owns its PID and kills it at the end, the way prove
already owns workerd (`packages/prove/src/modules/environments/README.md:32-37`). The OIDC issuer becomes a small
issuer process of our own over `jose`. It stands in for GitHub's issuer exactly as the navikt image does today, so it
is no faker than what it replaces. The Grafana viewer goes: the portal's own trace view (K5) replaces it. So:

| Place | What runs there | Docker |
|---|---|---|
| **Aaron's Mac** | workerd, Node, and the services as processes: Collector, Verdaccio, the OIDC issuer, Anvil. `ortho check`, `prove` and `dev` work offline | none |
| **Sandboxes (E2B)** | the factory's workspaces (section 3); a whole project's `prove` and the gates before a push, many at once, with the laptop shut. The same processes in our template | none |
| **CI (GitHub Actions)** | the gates, unchanged until the process forms land; then the same processes, so CI, the Mac and the sandbox run one setup | the runner image has Docker preinstalled; after M1.33 no step uses it |
| **Staging (Cloudflare)** | the deployed Workers, D1, Durable Objects and R2, on a dedicated `orthograph-staging` account; Cloudflare Containers where a service must be a container there; the real OTLP sink. A spike now, then real staging after Gate M2 (round 2) | n/a |

**The rule holds for stand-ins still to come**: M5's stripe-mock, Mailpit and real MariaDB (M5.08, M5.09, M5.13) are
each a process, or run in a sandbox, never a local container. The Docker sandbox for agents (A7) is dropped.

Every world, sandbox and staging deploy is destroyed after use, and all of it stays under the $10 a day. Cloud
credentials need Aaron's written yes. The E2B key exists already. For Cloudflare, Aaron gave his written yes in round 2
(Q7 = A): a new account for Orthograph staging alone, on Workers Paid ($5 a month), with a token scoped to that account
(Workers Scripts, D1, Durable Objects, R2 and Containers, edit). He creates the account and the token himself. The
token lives in his keychain, read by name and never printed.

**Slices.** M1.33 ∥ replaces each container with its process, and M1.31's "a container in CI" becomes a process
everywhere. `spikes/workspace-e2b` now also checks that the process forms run in our template. Staging comes first
in M7: `spikes/staging-pass` any time, then M7.01, M7.03 and M7.04 for staging alone after Gate M2. npm, Homebrew
and the rest of M7 still wait on the stage 4 gate (_Superseded by K28, 21 November 2026: npm's `latest` tag, Homebrew and the rest of M7 wait on the stage 4 gate; the preview under `next` is M1.51_).

## 7. The order: floor, spikes, later

**Spikes, any time, off every gate:**

- `spikes/workspace-e2b`: our E2B template (Node 24, pnpm, a warm clone). Does `ortho check` and `ortho prove` run inside
  it, workerd and the Collector included? What do start-up and an hour cost against the $5 share? Does a preview world's
  port reach the portal?
- `spikes/experiment-loop`: the experiment lifecycle by hand, on the local copy, with Claude Code as the agent: start
  (workspace, scaffolded plugin, mount), discard (0 workspaces, worlds and branches left), keep (a pull request with only
  the package and one mount file). How long is start, and is anything left behind?

**Floor, built soon and small, in this order:**

1. The `review` verdict kind (M3.20) and the `github` adapter for pull requests (M4.25), each small.
2. `@orthograph/workspaces` with `localCopy`, after Gate M2 (it needs plugins and the `agent` and person principals).
   People and Claude Code sessions use it over MCP and the CLI before any Pi agent exists.
3. The `e2b` choice, after its spike.
4. `@orthograph/factory`'s floor: `Experiment`, `brief.of`, the roster as data. Experiments work for people and our own
   threads before M4.
5. Then, once `@orthograph/agents` (M4.10) and K11's join (M4.13) exist: the builder and reviewer, then the rest of the
   roster, the Factory face, and automatic promotion to staging.

**Later** (`later.md`): a `cloudflare` sandbox choice; a person's feedback on a run (HeroUI's Rating and Emoji Reaction
Button) as input to the bench (H2); experiments shared between projects.

The slices are in `milestones.md`: M3.20, and M4.17 to M4.25, checked against M4's existing rows. M4.07, M4.10, M4.11 and M4.16
are reused, not duplicated. M4.13 is K11's. Run's reference to any thing is M1.03's.

## Decided here

1. Four packages, each a plugin: `agents` (shared), `workspaces` (new), `factory` (new), `work` (K11's).
2. The chat and the building agents are both `@orthograph/agents` runs. They differ only in their declarations.
3. "Any function" is `toolsOf(operations)` over the generated actions, called as `agent for <person>`, as M4.07 has it.
4. `ortho`'s steps are operations of `Workspace`, so each is an action, a CLI command, an MCP tool and an agent tool.
5. Building agents have no shell. They write only their allowed paths, and leave only through `workspace.push`.
6. A workspace is a sandbox driven by the run's Durable Object, through adapters: `localCopy`, then `e2b`.
7. `review` is a logbook verdict kind, built early (M3.20). Staging is automatic after prove and review; production is a person's yes.
8. An experiment is a plugin in its own workspace. It is kept only as a package plus one mount file. Spikes are the
   other lane.
9. The factory's face, and the portal's agent UI in general, is composed from HeroUI Pro's components. **No agent UI (Through `@orthograph/portal-ui`, F7: no face imports Pro directly.)
   code is canon**: the docs canon shows the declarations (`Blueprint.agent`, Run, Workspace, Experiment) and their
   actions, never a page's code (Aaron, 18 November).
10. The seams with K11 and the portal are as sections 5 and 6 record.
11. No Docker anywhere we run. Services are processes owned by their world, the same on the Mac, in E2B and in CI.
    The Grafana viewer gives way to the portal's trace view (section 8).
12. Staging is real Cloudflare, on its own account: a spike now, and the staging part of the cloud pass right after
    Gate M2.

## Evidence

- `spikes/durable-run/README.md`: one Durable Object per run, eviction at the tool boundary commits once, keys need a
  run namespace (finding 3), the model checkpoint is the limit (finding 2), and a bundle of 419 KB gzip.
- `spikes/e2b-sandbox/README.md`: E2B from a Durable Object in workerd. Create takes 1.2 to 1.6 s; a sandbox survives
  the object's eviction and carries on with background work. The default template is too thin.
- `packages/prove/src/modules/promote/types.ts:27-31`: what promote refuses today.
- `spikes/agent-native-compat/README.md`: approvals in the wrapper, typed no-write refusals, and redacted defects. The
  run view's Chat Tool states map onto them.
- `e2e/layer1/04-agent-writes-a-handler.test.ts:27-56`: check 4's fenced tools are the first workspace operations.
- `design/frame/skills.md:270-278`: the role bundles the roster follows.
- `design/frame/examples/agents.md:103-113` and `factory.md:159-161`: `Blueprint.agent` with `operations:`.
- Habitat (Aaron's earlier work, outside this repository, `capxul-factory/habitat/README.md`) already runs its worlds
  in E2B sandboxes.
- heroui.pro docs, read 18 November 2026: `ChatConversation` is presentational (children we own), and `ChatTool` has
  the five states above, from `@heroui-pro/react/chat-tool`.

## Aaron's answers

Round 1, 18 November 2026, by speech: "I agree with all of your recommendations but any code about agents in the UI
non-canon, these are the components that we need from Hero UI," with a screenshot of HeroUI Pro's component list (Data:
Kanban, Item Card, Item Card Group, KPI, KPI Group, List View, Timeline, Widget, Hover Card; AI: Chain Of Thought, Chat
Attachment, Chat Conversation, Chat List View, Chat Loader, Chat Message, Chat Message Actions, Chat Source, Chat Tool,
Code Block, Markdown, Prompt Input, Prompt Suggestion, Text Shimmer; Feedback: Emoji Reaction Button, Number Value,
Pressable Feedback, Rating, Trend Chip).

| # | Question | Answer |
|---|---|---|
| Q1 | What his Pi Durable UI session covers | The recommended reading: the chat surface on a Pi Durable run, which K10 builds on. The factory designs the agents, Run, Workspace and Experiment views around it, from HeroUI Pro's AI components |
| Q2 | The building agents | A: our threads mirrored, each addressable from the chat; builder and reviewer first |
| Q3 | Experiments | C: a plugin by default, with a spike lane for questions about the core |
| Q4 | Sandboxes | A: E2B for real runs, a local copy for tests; a sandbox share of $5 a day (the default) |
| Q5 | Promotion | A: automatic to staging after prove and review; production by his yes |
| Note | The UI | Agent UI code is not canon. The UI is HeroUI Pro's components (decision 9) |

Round 2, 18 November 2026, after his no-Docker direction ("I'm quitting Docker. I want to move everything to staging
and sandboxes."). His answer, in writing: "All recommended."

| # | Question | Answer |
|---|---|---|
| Q6 | When staging comes in | A: `spikes/staging-pass` now, and real staging right after Gate M2 |
| Q7 | The Cloudflare credential | A, **his written yes**: a new account for Orthograph staging, with a token scoped to it |
| Q8 | What his Mac runs | A: real services as processes, the same on the Mac, in E2B and in CI; no Docker anywhere |
