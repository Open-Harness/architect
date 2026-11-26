# Coworker, audited from eight sides

Read on 26 November 2026 from `Open-Harness/Coworker` at `58f1f0e` (25 November 2026; the clone is one commit deep),
by the `app-audit` skill's eight passes, six of them in subagents that reported facts with paths. Paths below are in
that repository unless they start `packages/`, `examples/` or `design/`.

**What was run.** The eight passes below only read. A second pass then installed and ran Coworker with every outside
thing faked: it typechecks, builds, and all 616 fast tests pass; its browser tier ran too. `inventory.md` has the
table, what "works" means given Coworker's own finding that a green score proved little, and every module on a line.
Not run: real mail, a real GitHub App, real containers, any real model, staging. Pi Durable's source was not read in these eight passes; its spec and examples were read later, for `end-to-end.md`
(its use is described from imports and the app's own docs).

## What Coworker is

A hosted workspace where people give work to **managers**. A manager is a durable AI agent with a job, a mission page,
a board of tasks and an email address. It hears from people in chat and from outside (email, GitHub), decides what is
work, starts **worker** agents on tasks in sandboxes, and asks a person through an **Inbox** when something needs a
decision or an approval. People are Owners, Builders or Members. Every action a manager or a person takes is checked
against a setting of on, ask or off, and written to an audit log as a sentence.

Three facts shape everything below.

1. **Two apps live in one repository.** An older chat app (`src/routes/_app`, Durable Objects `Directory` and
   `Workspace`, modules `agent`, `chat-host`, `chats`, `schedule`, `history`, `documents`, `admin`) and the manager
   product (`src/routes/_team`, objects `WorkspaceObject` and `ManagerObject`). `docs/screens.md` does not mention the
   older one. The rebuild is of the manager product.
2. **Its own docs call what is built "a spike"** (`docs/first-principles.md`), and list 78 fixes, by its own count, found by using
   staging (`docs/findings.md`), none started. The redesign exists in docs only: `docs/model-next.md`,
   `docs/connectors.md`, `docs/screens.md`.
3. **`docs/screens.md` is a delta, not a description.** Of 49 screens it keeps 3, adapts 27, redoes 7, adds 11 and
   drops 1. So "the screens are the authority" has two readings: the screens that are built, or the screens that page
   agrees. They imply different models. This is the first decision on the board.

## 1. The screens

Stack: TanStack Start on React 19 with server rendering off; `@astryxdesign/core` 0.7.17 in 184 of 227 component
files, enforced by `scripts/check-ui.ts` (no raw HTML, no own CSS); Heroicons; recharts in one file. StyleX is in
`package.json` and imported nowhere. UI SDK is not used. About 15,500 lines of `.tsx`.

**The built screens** (`src/routes/_team`, modules `team-*`):

- **Shell** (`team-shell/internal/AppNav.tsx`): workspace switcher; Home, Inbox with a count, Search, New manager; each
  manager with Chat, Overview, Board, Mission, Events, Settings; Build (Agents, Skills, Templates); People;
  Environments; account. Settings has its own sidebar.
- **Home**: tiles (open tasks, agents running, waiting on people, needs you), two charts, a "Needs you" rail and a
  managers rail (Needs you, Working, Idle).
- **Inbox** and **a question as a page** (`team-app/NeedsYou.tsx`, `Options.tsx`): kind, "blocks" a task, what
  happened, what the manager knows with sources, option cards with what happens next, risk, cost and the manager's
  recommendation; answer by option or in your own words.
- **Board**: Kanban, List, Console and Inbox views; cards with id, title, stage badge and field values; a lane header
  says "Asks first". No drag, add, filter or sort.
- **Task**: title and description, lane, owner, a custom field each, "Agents on this task", "Why this is allowed"
  (asked by, through, strength, request), comments, history.
- **Run**: brief, report, transcript, Stop.
- **Chat** with a manager; **Overview** charts; **Mission** as a page tree with markdown and a conflict choice;
  **Events** (what arrived, with outcome and strength).
- **A manager's settings**: Sources (email built in, GitHub repos and events, Slack "not available yet"), Who may ask
  (accept mode, allowed list, admission per scope, bots), Permissions (eleven categories, on, ask or off, per action),
  Board (lanes and fields).
- **Build**: Agents and Skills with versions, Templates. **People** with handles and their proof. **Environments**
  with setup script, size, status and secrets.
- **Workspace settings**: Profile, Notifications, General, Members (team, invites, links and domains), Roles and
  permissions, Keys and connections, Usage, Billing, Security, Audit log.
- **Getting in**: sign-in by Google, GitHub or an emailed link; join by invite, link, approved domain or request;
  create a workspace (name, address, region); a five-step start; a getting-started checklist.

Every screen waits with a centred spinner and refuses with "<X> did not load" and the server's words. A person whose
action is set to ask sees "Waiting for an Owner".

**Live data is polling**: chat every 0.6 seconds, a run every 0.8, the board every 3, the inbox and mission every 5,
home every 10, each set by its own page through `team-core/internal/use-loading.ts`. No sockets in the manager product.

**Separable: yes.** Each `team-*` module talks to the server through one interface (`createXApi(server)` in
`internal/api.ts`, types in `types.ts`); screens take `api` or props; route files are the only composition roots.
Re-pointing the screens means writing about seven interfaces again: ShellApi, TeamApi, HomeApi, BuildApi, SettingsApi
with AccountApi, StartApi, JoinApi. Two couplings come along: the shell imports the server's own `access` rules, and
board, permission and task changes post to `actions/<id>` and may answer "Waiting".

**The agreed screens that are not built** (`docs/screens.md`): a tree sidebar; System scorecard in place of Home; the
root manager's tree and "versions compared"; a new-manager wizard (job, connectors, authority); Threads as a tree, and
one thread with its trace; "In and out" in place of Events; a connector's own view (WhatsApp, Slack, a mailbox, a CRM
list and deal); Connectors and accounts; One connector; MCP servers; a task with done-when, steps and evidence; Build
moved into Settings.

**Nouns the screens imply.** Built: workspace, person and member, handle, invite and join request, manager, lane,
field, task (with a derived stage), run, inbox item, chat line, mission page, event, source, policy, permission,
saved agent, skill, environment, secret, model connection, template, audit line, usage and billing. Agreed and not
built: a manager's parent and versions, the root manager, account, connector, MCP server, thread as a fork, note and
rule, schedule, a task's done-when and evidence.

## 2. The model the app says it has

- **Control database** (D1, `migrations/control/`): Better Auth's tables with its organization plugin (organization is
  the workspace; member role owner, builder or member; invitation), `workspace_directory`, `github_installation`.
- **One Durable Object per workspace**, raw SQLite (`src/modules/workspace/internal/`): profile and settings, join
  settings and requests, the manager roster with budget and policy, handles (there is no person table: a person's id
  is `email:<address>`), per-person permission changes and settings, inbox items, person asks, the action and audit
  logs, events, GitHub sources, saved agents and skills with versions, environments, the vault, model connections,
  billing.
- **One Durable Object per manager**, as Pi Durable documents (`src/modules/manager/internal/state.ts`):
  `dt.manager-profile`, `dt.board` (lanes, fields, tasks and runs in one document), `dt.pages`,
  `dt.manager-permissions`, `dt.questions`, `dt.heard`, and the conversations themselves.
- **R2** for attachments and skill files.

**Disagreements, each a question and not a silent choice:**

| Where | One side | The other |
|---|---|---|
| `model.md` against the code | Source instance, Policy with versions and rules, Person, Mandate with a policy version, Decision with stop | none of those: email and GitHub are hard-wired, Person is not stored, three decisions only |
| `model-next.md` against `model.md` | a manager tree (`above`), Grant handed down, Account, Connector, Work with done-when, doer, `next` and evidence, Session, Ask with a deadline and a stand-in, Note, Rule | flat managers, permissions per manager, Source, Task with a lane, Run, inbox item |
| `model-next.md` against `first-principles.md` | lanes are gone from Work; WorkerKind is a stored kind | point 28 keeps the board; points 19 to 23 say a worker is the same agent in a role. model-next says it is "behind" on this |
| The screens that are built against `screens.md` | the built screens show the old model | the agreed screens show the next one |
| The catalogue against the code | 76 actions in `docs/actions.md` and `actions/internal/catalogue.ts` | 30 have a handler |

**Left out of the blueprint, because it exists only for how the old code works:** dedupe tables (`trigger`,
`notice_sent`, receipts), fan-out links (`join_item`, `person_ask_item`, `inbox_item.waiters`), outboxes (`dt.sends`,
`dt.audit-outbox`), the routing index (`follow`, `workspace_directory`, `github_installation`), caches (`run_image`,
`environment_build`, the Directory's `chats` and `documents`), `schema_version`, and the whole older chat app.

## 3. The verbs

About 180 named, about 140 that do something.

- **One action registry, for a manager's own screens only.** `createActions(...).call(actionId, input, by)` in
  `src/modules/actions/service.ts`. A model tool is made per catalogue action that has an input schema
  (`manager/internal/tools.ts`), and a person's button posts to the same handler. So a manager's tools and a person's
  buttons are the same verbs. The answer is Done, Refused, Ask, Failed or Unknown.
- **Permission** (`actions/internal/permissions.ts`): on, ask or off. For a manager: its action setting, else its
  category, else the default. For a person: their own change, else their preset, else off.
- **Ask**: a manager's call puts an Inbox item to the manager's creator and parks; a person's call answers 202
  "Waiting" and goes to every Owner's Inbox, first answer wins. "Always allow" turns the action on.
- **Audit sentence** (`actions/internal/describe.ts`): one template per action gives the ask prompt, the audit line
  and the task history.
- **Everything else is a second mechanism**: about 75 plain HTTP verbs for workspace, people, settings, keys, models,
  environments, agents, skills and billing, with a role gate of their own (`workspaces.reach`), plus about 15 Better
  Auth routes the UI calls directly, and a settings RPC of about 37 calls.
- **A worker's four tools** (`report`, `read_file`, `run_command`, `read_skill`) are under no permission and leave no
  audit line.
- **Two refusal shapes**: the action result, and tagged results mapped to HTTP status. A state refusal comes back as
  Done with `ok: false`.
- **A third surface**, 27 socket commands (`src/modules/protocol`), belongs to the older chat app.

## 4. The lives

| Noun | States | What moves it | How a wait is held today |
|---|---|---|---|
| Workspace | none stored | a person creates, renames, deletes | — |
| Invite | open, used, expired, withdrawn | a person; expiry worked out on read | no timer |
| Join request | pending, approved, declined | an Owner's answer in the Inbox | an inbox row per Owner |
| Manager | none | created; destroyed with the workspace | — |
| Trigger | duplicate, follow-up, candidate, ignored, dropped, failed | an email or a signed webhook, through the gate | the `follow` table routes a later event |
| Task | lane (data), archived flag; stage derived on read | a person or the manager | — |
| Run | queued (never written), running, ended | the worker's `report`, or a stop | nothing: a report wakes nobody, and a model that stops without reporting leaves it running for ever |
| Inbox item | waiting, done | the addressee's answer | **a tool call parked inside Pi Durable on a signal**; no deadline, reminder or stand-in |
| Person ask | pending, allowed, denied | any Owner | inbox rows, first answer wins |
| GitHub install | none, connected, lost | a person's claim; an uninstall webhook | — |
| Model connection | works, failed; ChatGPT tokens expire | a recheck; the workspace object's alarm refreshes 5 minutes early | a Durable Object alarm |
| Environment | not started, ready, failed | built on first use | an in-memory promise map |
| Outbound reply, audit line | queued, sent, gone | flushed after the commit, retried by an alarm | Pi documents as outboxes |

Under K46 the parked tool call is the thing to change: the wait belongs to the Ask, as a state, and the manager's
conversation stays free. The findings suspect the parked call blocks the manager's whole conversation (F68).

## 5. The agents

- **Pi Durable 1.6.0**, with `pi-ai`, `pi-schema` and `chord`. One harness per manager object:
  `Harness.open(openDurableObjectSqliteStorage(...))` in `manager/internal/engine.ts`. The root conversation is the
  manager; each run is a separate ownerless conversation in the same harness (`runs.ts`). State is Pi documents
  (`defineDoc`); asking is `defineSignal` with `ToolPark` (`asking.ts`); restart is `resume()` under
  `blockConcurrencyWhile` and one alarm.
- **The hierarchy that exists is one level deep**: person, manager, worker. There is no manager above a manager: no
  parent field, `manager.create` has no handler, and no manager knows of another. Nested managers are in
  `first-principles.md` (points 10, 25, 26) and nowhere in code.
- **The loop is open.** A worker's report writes a field on the board and the manager is never woken (finding F56).
  The manager's prompt is four fixed sentences without its mission (F58); the worker is not given the task's
  description (F59). There is no memory (F63) and no schedule for a manager (F64). `dx-refactor.md` proposes closing
  the loop with Pi 1.6's `SubmissionSettled`; it is not implemented.
- **Tools are actions**: 30 of 76 offered. Actions set to off are removed from the conversation.
- **Sandboxes**: Cloudflare Containers behind a `CommandBox` object, on staging only. An environment is a setup
  script and a size, snapshotted. A command gets vault secrets as its process environment for one run, and a GitHub
  token for one repository, fresh per command. No repository is cloned (F78).
- **Models**: a workspace's own connection (Anthropic or OpenAI key, an OpenAI-compatible endpoint, ChatGPT sign-in).
  A manager never holds a key: its model call is routed to the workspace object, which adds the credential inside
  `vault.use` and streams back. Three fakes: Pi's faux provider, a scripted brain, and a deployed scripted endpoint.
- **Streaming**: the manager product polls a live document. The older chat app has real push over a socket.

## 6. The outside

| Connector | In | Out | Secret | Stand-in | Standing in Coworker |
|---|---|---|---|---|---|
| GitHub App | `POST /in/github`, signature checked first, deduped by delivery id; issues, comments, pull requests, reviews, failed checks, uninstall | a comment as a reply; a per-command token for a sandbox | six app settings in the Worker's environment | `gitHubWorld`, signed example payloads; a live test | real, and can only comment |
| Email in | Cloudflare Email Routing to `<manager>.<workspace>@domain`; DKIM through the trusted receiver; loops, bounces, duplicates and oversize handled | — | none | an `.eml` builder | real |
| Email out | — | threaded replies, sign-in links, invites, notices | none | an outbox | real |
| Model providers | — | a probe, then streamed calls from inside the vault | the workspace's own, in the vault | scripted models, a fake endpoint Worker | real; ChatGPT sign-in and own endpoint fail on staging (F1 to F7) |
| Sandboxes | — | Cloudflare Containers | environment secrets in the vault | a fake container | real on staging only |
| Billing | none | seats and overage | none | a recorder | stubbed: the real one does nothing |
| Slack | a spike, not wired | — | — | — | docs and a spike |
| WhatsApp, MCP servers, a CRM | — | — | — | — | docs only |

**The vault** (`src/modules/vault`): per workspace, in its own object's SQLite. One data key per workspace, wrapped
by a master key from Cloudflare's Secrets Store; each secret sealed with its name as associated data; plaintext only
inside `use(name, fn)`. Rotation is written and never called.

**The intended connector** (`docs/connectors.md`, a proposal): a plug-in on one contract with five parts: set up, in,
out, know-how, and a view (chats, mail, records or reviews). None of it is built; the built shape is a narrower
"source" with two kinds.

**No committed secret was found.** Test fixtures use fake keys; `wrangler.jsonc` holds placeholders; the real domain
name is in the config, and that is all.

## 7. Who is who

- **Sign-in**: Better Auth with an emailed link, Google and GitHub; no password; one verified email is one user.
- **Workspace**: Better Auth's organization. Addressed by id in the path; the address (a slug) is used for mail and
  join requests, and there is no subdomain routing. A region, eu or us, fixed at creation, sets the Durable Object's
  jurisdiction.
- **Joining**: an emailed invite, a shared link, an approved email domain, or a request the Owners answer.
- **Roles**: owner, builder, member. Two layers: Better Auth's coarse one, and presets over the action catalogue with
  per-person overrides. Pages are gated by the same rules on the server and in the shell.
- **People outside**: someone who emails in or opens an issue is known by a handle (an email proved by DKIM, a GitHub
  user id proved by the signed webhook). What they may ask is each manager's policy. They sign in to nothing and see
  nothing.
- **Isolation**: a workspace's data is in its own object; D1 holds only the directory. Every read checks membership
  first.
- **No operator surface** in the manager product. The older app's `/admin` treats everyone as an administrator when
  its list is empty (`directory/service.ts`).

## 8. How it is proved and run

- **Tests**: 93 server test files in workerd with every outside thing faked (`src/world.ts` picks fake or real per
  outside thing, and a test asserts only the roots build real ones), 21 page tests, 20 Playwright specs, 3 live tests
  against staging.
- **The score** (`status/score.json`, `src/modules/score`): `docs/build-plan.md` is the one list of evals; a test's
  title is its eval id; a pass that stops passing fails the run; a red gate makes the score zero. 81 of 81 pass.
- **Its own caveat** (`docs/findings.md` F23): 81 of 81 passed while the product was unusable. One eval passes with 30
  of 76 actions built; another passes without checking its claim.
- **Checks**: a module shape close to Orthograph's own (`README.md`, `types.ts`, `service.ts`, `internal/`, one test;
  250 lines a file; no cross-module internals), Astryx only, no secret in the build.
- **Staging**: a real Cloudflare deployment made by `scripts/staging.ts`: three Workers, D1, R2, Secrets Store,
  Containers, Email Routing, a GitHub App with a test organisation. Credentials come from a password manager at run
  time. There is no CI: the gate is local.
- **Telemetry**: one error line. No traces, no timings (F16). In the product: the audit log, events and usage.

**The stories its tests tell, as first journeys.** A person creates a workspace and holds several. An owner connects
a model and a manager answers through it without ever holding the key. A person makes a manager; a chat becomes a
task. A run starts, reports, survives a restart, and a person stops it for good. An action set to ask goes to the
Inbox, off is refused, and the audit says who was asked. A question is answered by an option or in the person's own
words. Mail from an allowed person becomes a task and replies follow the thread; a stranger gets nothing. A GitHub
issue from an allowed author becomes a task; a bad signature is refused; a duplicate delivery is taken once. A command
runs in a container with a token for one repository. Members, Builders and Owners each open only their pages. People
join by invite, link, domain and request.
