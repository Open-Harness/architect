# What works in Coworker today

Added 26 November 2026, after Aaron's line that the rebuild has "to replace everything that works currently". This is
the list of what that is: what was run, what each test tier proves, every module with a line, and what does not
count.

## What was run, and what was only read

For this addendum Coworker was installed and run in this container, with every outside thing faked and no
credential.

| What | Ran here? | Result |
|---|---|---|
| Install (`pnpm install --frozen-lockfile`, package scripts off) | yes | done |
| Typecheck | yes | passes |
| Lint, module shape, file size | yes | pass |
| Formatting check | yes | passes |
| The fast tier: 300 suites, 616 tests, in workerd with fakes | yes | **616 of 616 pass** |
| of which evals | yes | 45 flows, 13 single-module, 1 spike: all pass |
| Build | yes | builds; "No secrets in the build" |
| The browser tier: 20 Playwright specs, 65 tests, against the build in the fake world | yes | **65 of 65 pass**; 340 screenshots taken, a sample looked at |
| The live tier: real mail, a real GitHub App, real containers, on staging | **no** | needs staging and its credentials. Its four evals are recorded as passing in `status/score.json`; not reproduced |
| A real model | **no** | every model in every run above is scripted |
| Staging itself, by hand | **no** | Aaron did, and `docs/findings.md` is what he found |

So "works" below means: its tests pass here against fakes, **and** nothing in Aaron's own findings says it fails in
real use. Where the two disagree, the findings win. His finding F23 says why: the whole score was green while the
product was unusable.

## What works, by what a person can do

Each line names the eval or spec that is its evidence. "F" numbers are Coworker's own findings.

**Getting in and being someone. Works.**
- Sign in by an emailed link, Google or GitHub; one verified email is one person (`acc:auth/sign-up`,
  `acc:auth/google-github`).
- Create a workspace with a unique address and a region; hold several; delete one and its data
  (`flw:workspace/create`, `acc:workspace/address`, `flw:workspace/many`, `flw:workspace/delete`).
- Join by invite, by link, by approved domain, by request (`flw:join/*`, `ui:join/invite`).
- Owners, Builders and Members each open only their pages; per-person changes; another workspace's data is never
  seen (`ui:access/pages`, `flw:workspace/many`).
- People and their handles, with proof (`flw:people/handles`).
- First-run set-up, end to end in a browser (`ui:onboarding/first`). Finding F79: the "ask to join" button is wrong
  there.

**Settings. Work.**
- Every settings page exists and saves: profile, notifications, general, members, roles and permissions, keys,
  usage, billing, security, audit log (`ui:settings/all`, the `settings-*` flows).
- The audit log filters, pages and exports. Export of a workspace has no secrets in it.
- Agents and skills are saved as versions; environments are made and assigned. Findings F49 to F55: the editors are
  not the ones drawn.

**Keys and the vault. Work, in tests.**
- A key is stored sealed, used and never returned (`acc:vault/at-rest`, `acc:vault/use-once`).
- A provider key is tested and connected (`flw:models/test-key`).
- **Do not count:** ChatGPT sign-in and "own endpoint". Both pass their tests and fail on staging (F1 to F7).
- Rotation of the master key is tested (`acc:vault/rewrap`) and never called by anything.

**The board, tasks, mission, search. Work, and are not as wanted.**
- A board in four views showing the same tasks; lanes and fields set up in settings (`ui:manager/board`,
  `acc:board/stages`).
- A task page; comments; history. A mission page tree with a conflict choice (`ui:mission/page`,
  `flw:pages/mission`).
- Search that opens tasks, pages, managers and people by keyboard (`ui:search/open`).
- Home and a manager's Overview count real work.
- **His findings say most of the board and the task page are wrong** (F25 to F38): they follow none of the templates
  chosen for them, a task cannot be added from the board, nothing filters or sorts, the task page is a form, a lane
  that "asks first" asks nobody, an owner is never told. These are in the "must not be copied" list, not in parity.

**The inbox. Works.**
- An approval, a question or a notice reaches a person; they answer by option or in their own words; the first
  Owner's answer settles a shared one; email notices respect quiet hours (`flw:inbox/question`,
  `flw:inbox/own-words`, `ui:needs-you/page`, `flw:permissions/ask`).
- Findings: an approval does not show what will be sent (F66); a person's own words on an approval count as no
  (F65); mail held outside working hours is dropped (F72).

**Hearing the world. Works.**
- Email in: an allowed person's mail becomes a candidate task, replies follow the thread, and ten awkward cases are
  handled (`flw:email/*`). On staging, by its own record: a round trip, and a stranger gets nothing.
- GitHub in: install by an Owner, signatures, duplicates, allowed and unknown authors, events not chosen, own
  comments, a pull request following its task, a failed check, forks, uninstall (`flw:github/*`).
- "Who may ask": the gate, the allowed list, admission per place, bots. Finding F60: accept mode "auto" does the
  same as "observe".
- Events lists what arrived and what it became (`ui:events/list`). Finding F46: only a title is kept.
- **Out is thin**: a threaded reply by mail, a comment on GitHub. Nothing else (F77).

**Permissions and the audit. Work for a manager's actions.**
- On, ask or off per action; off is refused and logged; the audit says who was asked (`acc:permissions/check`,
  `flw:permissions/off`, `acc:audit/sentence`).
- 30 of 76 actions exist (F12, F61). A worker's tools are under no permission (F48).

**Sandboxes and money. Partly.**
- A command runs in a container with a fresh token for one repository; hours are metered once (`flw:sandbox/*`):
  against a fake container here. Real containers ran on staging only, by its own record.
- Seats are counted (`flw:billing/seats`). Nobody is ever billed: the real billing does nothing.

**The agents. Not counted.** See `agents.md`. The tests that say otherwise (`flw:manager/chat-task`,
`flw:manager/run`, `flw:manager/restart`, `ui:chat/talk`, `ui:run/transcript`) pass against a scripted model.

**The older chat app. Not part of the rebuild.** Chats, Library, Admin, schedules, documents. Its own README says it
is "kept until the app is rebuilt". Finding F21 treats it showing up on staging as a bug. If Aaron wants any of it
kept, that is a seventh decision; this audit assumes not.

## Every module, in a line

Lines of source are without tests. "Holds it" is what the rebuild would stand that module on in Orthograph, with
its standing from `map.md`.

### The manager product's server

| Module | Lines | What it is | Works today? | What holds it in Orthograph |
|---|---|---|---|---|
| `http` | 1,765 | every route under `/api/` | yes | the generated API and server: **runs today** |
| `actions` | 355 | the list of 76 actions and the one door for a button and a tool | yes, for 30 | the operations themselves, and a generated action each: **runs today** |
| `access` | 121 | which pages a person may open | yes | roles; and K46's "what this caller may do" per thing: **decided** |
| `auth` | 575 | Better Auth: people, sessions, organisations, invitations | yes | sign-in in the host, the starter's things: **being built** |
| `workspaces` | 993 | a workspace kept in step across auth, its object and the directory | yes | organisations copied from the starter: **being built** |
| `workspace` | 1,944 | one tenant's Durable Object: people, inbox, logs, sources, policy | yes | things in the database. **Missing:** a store per tenant, and a region per workspace. Orthograph binds one database per environment |
| `settings` | 1,684 | everything the Settings screens change | yes | operations on things: **runs today** |
| `board` | 64 | lanes, fields, and the stage a task waits in | yes | a derived read: **being built** |
| `dashboards` | 332 | the numbers behind Home and Overview | yes | derived reads and lists: **being built**, **decided** |
| `search` | 91 | finds pages, tasks, managers and people | yes | **missing** |
| `triggers` | 257 | the trigger, the policy and the gate | yes; "auto" is not built (F60) | the `intake` plugin: **being built**, parked |
| `email` | 289 | mail in becomes a trigger; replies go back threaded | yes | **missing**: an adapter to write, with these tests as its checks |
| `mail` | 71 | sending mail | yes | **missing** |
| `github` | 699 | the App, webhooks in, comments out, tokens | yes; comment only | a generated adapter, the door, `intake`: **being built** |
| `models` | 1,046 | a workspace's model keys, endpoints and ChatGPT sign-in | keys yes; the other two fail on staging | **missing** |
| `vault` | 240 | a workspace's secrets, sealed | yes; rotation unwired | **missing**. Small, tested, worth lifting as a plugin |
| `sandboxes` | 882 | environments and commands in containers | staging only | `@orthograph/sandbox`: **being built**, draft |
| `billing` | 220 | seats and sandbox hours | the arithmetic; nobody is billed | **missing** |
| `clock` | 56 | injected time and ids | yes | the `Timers` rule and the world clock: **runs today** as a rule |
| `transcript` | 327 | turns a conversation into what the page draws | yes | **missing**: nothing reads Pi's turns out |

### The agent layer (not counted as working)

| Module | Lines | What it is | What holds it |
|---|---|---|---|
| `manager` | 3,423 | one manager in one Durable Object: its harness, its board and pages as Pi documents, its tools | `Manager`, `Task`, `Run`, `Ask` as things; an `Agent` actor: `agents.md` |
| `agent-engine` | 130 | how a kind of agent becomes a conversation | `Blueprint.agent`: **on `main`** as a declaration |
| `agents` | 141 | what a saved agent is | a thing with versions: **being built** |
| `brain` | 246 | routes a manager's model call through its workspace's key | model adapters: **being built**; a workspace's own key: **missing** |
| `fake-model` | 225 | a scripted model, deployed for staging | `@orthograph/stand-in-model`: **being built**, draft |

### The screens

| Module | Lines | What it is | Works today? | What holds it |
|---|---|---|---|---|
| `team-shell` | 858 | the frame, the sidebar, search, the gate | yes; the sidebar is to change (F80) | the app's own web project, kept |
| `team-core` | 300 | loading, polling, errors | yes; keeps nothing between pages (F18) | kept; a live read is **missing** |
| `team-join` | 702 | signing in and joining | yes | kept |
| `team-start` | 1,055 | creating a workspace, first set-up | yes (F79) | kept |
| `team-home` | 793 | Home and a manager's Overview | yes | kept |
| `team-app` | 2,250 | board, task, chat, inbox, mission, run | inbox and mission yes; board and task not as wanted | inbox and mission kept; board and task drawn again |
| `team-build` | 4,829 | agents, skills, templates, events, sources, permissions | yes; editors not as drawn | kept where `docs/screens.md` says so |
| `team-settings` | 4,912 | workspace settings, people, environments | yes | kept |

### The older chat app (not rebuilt)

`agent` (408), `agent-config` (100), `chat-host` (1,168), `chats` (201), `documents` (258), `history` (144),
`schedule` (400), `web` (270), `directory` (699), `directory-client` (149), `manager-client` (300), `connection`
(187), `protocol` (701), `admin` (1,224), `app` (1,165), `ui` (1,910). Two things in it are worth reading before
they are needed: `schedule`, a working "tell me later" with repeats, for when a manager is woken on a date; and
`chat-host`'s real streaming over a socket, for when polling is replaced.

### Tooling for tests and staging (replaced, not ported)

| Module | Lines | What it is | What replaces it |
|---|---|---|---|
| `score` | 287 | the evals and the ratchet | `ortho prove` and this repository's ratchet: **runs today** |
| `live` | 603 | staging's settings and plan | `ortho env up` and the staging workflow: **runs today** as a plan |
| `liveapp` | 221 | the live runner's own client | the generated SDK |
| `credentials` | 451 | staging's credentials, from a password manager | declared secrets: **being built** |
| `mailbox` | 325 | test mailboxes for staging | a stand-in for the email adapter |
| `outsiders` | 248 | test people on email and GitHub | stand-ins |
| `chat-sdk` | 252 | a Slack spike | the generated Slack adapter: **being built** |

## What this adds to the gap list

Two gaps the first pass did not name, both from reading `workspace` and `workspaces` again:

- **A store per tenant.** Coworker gives each workspace its own Durable Object and keeps only a directory in the
  shared database. Orthograph binds one database per environment and keeps tenants apart by roles. That is a weaker
  wall, and Coworker's "delete a workspace and its data key goes with it" has no equal. Work round: rows with a
  workspace id and roles. Fix: a store chosen per instance of a root thing, which K46 call 5 already decides for a
  chain ("a contract per company, from a factory"). Paths: `packages/host-cloudflare/src/modules/store`. Unclaimed.
- **A region per workspace.** EU or US, fixed at creation. No row. Later.
