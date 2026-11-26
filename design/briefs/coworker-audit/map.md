# Coworker on Orthograph: the map and the gap list

Each finding of `audit.md`, looked up in `docs/canon/status.md`, the decision records, `packages/`, the examples and
the open pull requests, on 26 November 2026. Standing is one of four:

- **runs today**: green on `main`, with the example or suite that proves it;
- **being built**: code exists and is not proved, with where it is;
- **decided**: a record, and no code;
- **missing**: nothing.

"Row" is the id in `docs/canon/status.md`, section 2. Nothing below was run by this audit: "green" means the
repository's own records and ratchet lists say so.

## The short version

- **The declared core holds Coworker's model today.** Things, machines, operations with typed refusals, events,
  database and actor stores, the generated server, SDK, command line, MCP tools and docs, and `ortho prove`: all runs
  today, proved by Plugged In's journeys.
- **The superagent is Coworker's nearest relative, and it is parked.** Its `intake` and `tickets` plugins
  (`examples/superagent/plugins/`) carry the same nouns as Coworker's `docs/model.md`: trigger, gate, policy, mandate,
  decision, thread, a ticket with a derived stage, attention, report. No record says one was written from the other. Much of it passes its checks on `main`. Goal 17
  is parked (K44), so its open slices are free for an app goal to take (`design/goals/map.md`, collision rule 1).
- **The agent runtime is the hinge.** `@orthograph/agents` on `main` is a thing and three operations, two with blank
  handlers. The Pi Durable runtime is draft pull request #781, on Pi 1.5.0, unmerged, with seven checks red.
- **Nothing generated draws a screen.** The UI layer is spiked.

## The map

### The core

| Coworker needs | Standing | Where |
|---|---|---|
| Things with fields, states and moves | runs today | row `things-machines-ops`; `e2e/stage1/01-plugged-in-journeys.test.ts` |
| Every verb an operation with typed refusals | runs today | rows `things-machines-ops`, `errors-refusals` |
| One registry for people's buttons and agents' tools | runs today as generated SDK, command line and MCP per operation; being built for MCP's request key | rows `generated-outputs`, `generated-mcp` |
| The audit log: who did what, under which role | being built | traces carry the call and the request key (`request-key`, built); "the role a caller held" is named missing in `portal-viewer` |
| A list of things kept in a database; a thing that is its own actor | runs today | row `stores` |
| A stage worked out from other rows (the board's badge) | being built | row `derived-reads`; in use as `ticket.stage` in `examples/superagent/plugins/tickets` |
| Versions of a thing (saved agent, skill, manager, page) | being built | row `versions`; `versions: { key }` in use in `examples/superagent` |
| Journeys and checks before handlers | runs today | row `prove-evals` |
| Fakes for every outside thing ("worlds") | runs today | worlds and stand-ins in `packages/prove`, `packages/services` |
| Lists with filter, sort and paging (board as a list, audit log, events) | decided | row `lists`, provisional, Capxul's books |
| A record under a parent (manager tree, page tree, thread tree) | decided | row `trees`, provisional, Capxul's books |
| Dates and deadlines | being built for calendar days | row `dates`, lane goal-16; an instant as a value is missing |

### Who is who

| Coworker needs | Standing | Where |
|---|---|---|
| Sign-in with Better Auth, sessions, API keys | being built | row `sign-in`: runs in the host, copied into each app; `packages/auth` does not exist |
| Emailed link, Google and GitHub as ways in | missing as declared choices | the starter signs up and signs in; providers per environment are not in a row |
| Workspace, membership, invitation | being built | row `teams`: things copied into `examples/starter`; `packages/organizations` does not exist |
| Owner, Builder, Member | decided | row `roles-who-holds`, provisional: only `rule` exists; a role held on a company admits a create (`gap-company-roles`, landed #768, #939) |
| An agent as a caller in its own right | being built | row `principals`; the form `Blueprint.role(T, { agent })` is on `main`, the caller is in #781 |
| A person told apart from an agent acting for them | being built | the same; `examples/work` records the wall (F5, section 4) |
| Join by link, by domain, by request | missing | Coworker's own things; a request is an Ask |
| A region per workspace (EU or US) | missing | no row; the host makes one object namespace |
| People outside, known by a proved handle | being built | `intake`'s `Account` and the gate, on `main`, parked |

### Agents

| Coworker needs | Standing | Where |
|---|---|---|
| A durable agent that survives a restart | being built | row `durable-agent-run`; draft #781 on `goal/superagent`: `agentActor` opens Pi's harness on the actor's SQLite |
| One conversation per manager, for good | being built | the same; `Agent` thing with `lives: "actor"` is on `main` |
| Tools from operations | decided | row `agent-tools`; K40 fix 3, M4.07; #781's README says "Tools are not wired yet" |
| A manager starts a worker and hears back | being built as one fixed pattern | the superagent's main and executor, through events, seats and assignments; checks 41 to 47 red |
| Managers above managers, to any depth | missing | no generic parent among agents; `Manager.above` is a plain field, and a manager telling a manager is one more event hop |
| Work reaches an agent as an event, retried in order | being built | row `outbox`, provisional; draft #905 |
| An agent asks a person and carries on | decided | K46 call 2: the wait is a thing's state. In use as data in `tickets` (`Attention`, `ticket.waiting`) |
| On, ask or off per action, handed down | missing | `gap-approval-declaration` and `approvals-once` are spiked, no slice; a role decided by rows of data does not exist |
| A fake model for tests | being built | `@orthograph/stand-in-model` in #781 |
| A workspace's own model key, never held by the agent | missing | a model is an environment setting (`MODELS_BASE_URL`); `secrets` are per environment only |
| A sandbox to run commands in | being built | row `sandbox`; `@orthograph/sandbox` over pi-env in #781; E2B spiked |
| A manager woken on a date | being built in part | row `timers`, building; `world-clock-keeper`, spiked; `intake` has a timer source |
| Memory: notes and rules a person accepted | missing | Coworker's own things; nothing in the framework is needed beyond versions |
| The transcript and a live line while it writes | missing | Pi keeps the turns in the actor; nothing reads them out |

### The outside

| Coworker needs | Standing | Where |
|---|---|---|
| A signed webhook in, taken once | being built | rows `webhook-doors`, `events-in`; `packages/host-cloudflare/src/modules/inbound` verifies GitHub and Slack on `main` |
| GitHub: comments, pull requests, reviews | being built | row `service-adapters`; `examples/superagent/plugins/github`, generated from the spec, passes against a stand-in |
| Slack | being built | the same; Coworker itself only has a spike |
| Email in and out | missing | row `stripe-resend`, provisional; no inbound mail door |
| An adapter made from a service's spec | being built | row `adapters-from-spec`, lane goal-16 |
| A connector as a plug-in with set-up, in, out, know-how and a view | decided in part | K27's adapter kind covers in and out and a stand-in; a plugin that ships a page waits on `pages`; know-how (skills) is missing |
| An account held by a manager or lent by a person | being built | `intake`'s `Account`; `lend` tokens only in #781 (K40 fix 6) |
| MCP servers a manager can use | missing | Orthograph generates an MCP server; consuming one is nowhere |
| A vault per workspace | missing | `secrets` is per environment; `@orthograph/wallets` keeps chain keys only. Goal 13 (vault) is parked |
| Billing | missing | row `stripe-resend`, provisional |
| Files and attachments | missing | R2 is named in the host; no storage module, no row |

### Screens and running

| Coworker needs | Standing | Where |
|---|---|---|
| A generated piece per operation | decided | K29; row `ui-pieces`, spiked (`spikes/ui-sdk-real-world`) |
| A reference per thing: state, what this caller may do, what it waits for | decided | K46 call 9; no row |
| Pages, routes and a shell from a declared map | being built | row `pages`; `packages/shell`, #584; Goal 6, parked |
| A kanban board | missing | UI SDK has none (K24); `spikes/kanban-components` and `spikes/mission-board` show one on HeroUI Pro |
| "Needs you" and chat parts | being built | row `portal-chat`: `portal-ui` has the parts and nothing uses them |
| Live updates without polling | missing | no row |
| Search across things | missing | no row |
| Staging on Cloudflare, made and destroyed | runs today as a plan with no credential; being built live | rows `infra-staging` (built), `staging-run` (building) |
| A public address for webhooks | decided | row `live-deploy`, provisional |
| Traces of every call | being built | row `telemetry-model`; Coworker has none, so this is a gain |

## The gap list

For each gap: fix it in the framework, or work round it for now, and who owns the paths. Owners are read from
`design/goals/map.md` and the Lane column. Three goals run: 18 (the framework), 16 (Capxul), 19 (the lander). A parked
goal's slice is not scheduled, so "the app goal that needs it takes it" (collision rule 1). **Coworker's goal** below
means the goal Goal 18 would make if Aaron accepts this audit; this audit claims nothing.

Ids are the ones the blueprint sketch's `GAP` blanks use.

| Gap | Fix or work round | Paths | Who |
|---|---|---|---|
| `durable-agent-run`: the agent runtime is a draft on Pi 1.5.0 | **Fix.** Land #781's `resident` module in pieces, moved to Pi 1.6.0, which Coworker already runs on and whose `SubmissionSettled` closes the worker-reports loop | `packages/agents`, `packages/host-cloudflare/src/modules/actors` | unclaimed (lane none); Goal 17 parked. Coworker's goal takes it, told to Goal 18 |
| `outbox`: an event's hop to an agent is not retried or ordered | **Fix.** Land #905 | `packages/host-cloudflare` | unclaimed; Coworker's goal |
| `agent-tools`: an agent has no tools from operations | **Fix.** This is the heart of "tools are actions", and every agent app needs it | `packages/agents`, `packages/projections` | unclaimed; Coworker's goal |
| `grants`: on, ask or off per action, handed down the tree | **Work round first, then fix.** A guard in the handler reads Grant rows and raises an Ask. The fix is two framework pieces: a role decided by data, and ask as an outcome of a call (`gap-approval-declaration`, `approvals-once`) | `packages/orthograph/src/modules/roles`, `packages/language-effect/src/modules/access`, `packages/projections` | unclaimed; touches `access`, where Goal 16 landed company roles: an Ask to Goal 18 before starting |
| `roles-who-holds`: Owner, Builder, Member | **Work round.** Use the company-role form Capxul landed. The fix is Capxul's by rank (beta, books) | `packages/orthograph/src/modules/roles` | lane none; pulled by Capxul. Wait for it or take the landed part |
| `teams`: no organisations package | **Work round.** Copy the starter's things, as the starter does | `examples/starter`, `packages/organizations` | row `companies` is lane goal-16 and shares `packages/organizations`: settle through Goal 18 before any extraction |
| `person-not-agent`: an answer must come from a person | **Fix**, with #781's agent caller | `packages/orthograph/src/modules/roles` | row `principals`: Goal 18 "brings what the alpha needs to `main`, starting with #446". Goal 18 |
| `clock-moves`: deadlines, reminders, a stand-in, a run gone silent | **Work round.** A timer source from `intake` fires an event that makes the move. The fix is the keeper | `packages/host-cloudflare/src/modules/clock`, `timers` | `timers` is Capxul's by rank (payroll), lane none; `world-clock-keeper` unclaimed |
| `move-by-payload`: one verb, several moves | **Work round.** Three operations (`run.report`, `run.wait`, `run.end`); the worker's one tool picks | — | Coworker's own |
| `trees`: roll-ups and "one root" | **Work round.** A plain `above` field and a derived read | `packages/orthograph/src/modules/things` | pulled by Capxul's books, lane none |
| `custom-fields`: a board's own fields | **Work round.** One struct field, unchecked. Ask whether it is still wanted (decision 1) | — | Coworker's own |
| `dates`: an instant as a value | **Work round.** A number of milliseconds. Days are Capxul's | `packages/orthograph/src/modules/values` | lane goal-16 |
| `workspace-models`: a workspace's own model key | **Fix**, with the vault. Until then one model per environment, which is enough for the first slices | `packages/orthograph/src/modules/secrets`, `packages/agents` | `secrets` pulled by Capxul's banking, lane none; Goal 13 parked |
| vault per workspace | **Work round, then lift.** Coworker's vault module is small, tested and worth keeping as a feature plugin | a new plugin | Coworker's goal; later the vault goal's |
| `email`: no mail in or out | **Fix as an adapter**, written inside the app first: a door for inbound mail and a send call, with a stand-in. Coworker's parsing and threading tests are the checks | `examples/coworker/plugins/email`, `packages/host-cloudflare/src/modules/inbound` | Coworker's goal; `inbound` is in `webhook-doors`, pulled by Capxul's banking, lane none |
| superagent plugins are not packages | **Work round.** Mount them from `examples/superagent/plugins` by path. Extraction is Goal 17's slice 14 | `examples/superagent/plugins` | parked; Coworker's goal would be the second app to mount them, which is the test extraction wants |
| `realtime`: chat and runs stream | **Work round.** Poll, as Coworker does today. Raise it as a framework question | `packages/host-cloudflare` | nobody; an Ask to Goal 18 |
| `transcript`: Pi's turns are not readable | **Fix**, small: a read over the Agent's entries | `packages/agents` | Coworker's goal, with the runtime |
| `waiting-list`: the Inbox | **Work round.** A plain read over Ask. K46 leaves the general form open | — | Coworker's own; a Decision issue when the general form is wanted |
| no generated screens, no kanban | **Work round.** Keep Coworker's screens (see `README.md`, question 2) | — | Goal 5 and Goal 6 are parked |
| sandboxes | **Wait for #781's `@orthograph/sandbox`**, or keep Coworker's Cloudflare Containers module behind the same adapter | `packages/sandbox` | unclaimed |
| MCP servers, billing, files, search, a region per workspace | **Later.** None is needed for a manager to close its loop | — | `design/later.md`, when Aaron accepts |

## Two things found on the way

- `docs/canon/plugins.mdx` still says "None of this is built yet"; `status.md` and the code say plugins and mounts are
  building, and doors are on `main`. For the canon's owner.
- The parked superagent and Coworker read as two tellings of one product. `intake` and `tickets` hold the same nouns
  as Coworker's `docs/model.md`, and no record in this repository names Coworker. Coworker's `docs/model-next.md` has
  since moved on from that model. Whoever resumes Goal 17 should read `model-next.md` first.
