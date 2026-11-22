# K40: what a superagent on Orthograph needs that Orthograph lacks

**Decided 22 November 2026 by Aaron**, in two grill rounds with the 📐 designer thread that the superagent plan started
(the plan itself is K39). Round 1 asked eight questions; after Aaron pointed us at Pi Durable, round 2 asked three
again. His answers: outside accounts are things (round 2, Q1 A); settings with versions (round 1, Q2 A); **an agent is
its own thing**, reached through the outbox (his own call, against round 2 Q2's A, "why can't the agent just be its
own thing?"); the sandbox is an adapter speaking pi-env over a socket (round 2, Q3 A); catching up after sleep with
events keyed by their object (round 1, Q6 A); a short-lived token lent to the sandbox (round 1, Q8 A).

Grounded at `origin/main` `52dddce9` (still clean against `9f5def91`), `origin/goal/stage-1` (22 November, 07:44 UTC), `origin/goal-3/m2-03-check`,
`origin/goal-10/s1-decision` (#469), `origin/goal-8/m3-01` (#472) and `origin/goal-11/m5-01` (#479), Pi Durable 1.5.0
and pi-env 1.4.0 as published, and the prototype's docs 000 to 008 (`deepseek-ai/dsh-superagent-prototype`, read as
data). Line numbers are at those commits.

## Where these fixes are built

> "We don't build things twice. We build it and then once it's worked, like we iterate on it. And then when it's good,
> it comes into the framework." (Aaron, 22 November 2026)

The superagent and these fixes are built together on the superagent's integration branch, `goal/superagent`. A fix
that works there is extracted into the package or module that owns its seam, and the conductor merges it back. Each
fix below names the seam's owner. Its Ask tells that owner the shape now, so nobody builds the opposite shape
meanwhile, and so the owner can review the seam before it moves.

## The problem, in one example

octocat comments on issue 12 of `acme/api`: "@superagent the login test is flaky, can you fix it?". GitHub posts the
event to the app's door:

```ts
{ action: "created", comment: { id: 9001, body: "@superagent the login test is flaky…" },
  issue: { number: 12 }, repository: { full_name: "acme/api" }, sender: { id: 583231, login: "octocat", type: "User" } }
```

The steps, and the fix each one needs:

| Step | What the superagent does | Fix |
|---|---|---|
| 1 | the door verifies it; was the Mac asleep when it came? | 5 |
| 2 | the gate's role asks "is octocat listed?" | 1 |
| 3 | Ticket T-42 is accepted; its Mandate pins Policy version 3 | 2 |
| 4 | T-42's agent gets the comment; the judge gets the "maybe" messages | 3 |
| 5 | the agent runs `pytest` and `git push` in a sandbox | 4, 6 |
| 6 | three weeks later a reviewer comments; T-42's agent wakes with all its memory | 3 |

## The fixes

### 1. The door keeps the outside account; accounts are things; a role reads them

**The gap.** A role's rule is given a person (`Acting`, `packages/orthograph/src/modules/roles/types.ts:22, :41`, `goal/stage-1`), and
a door's caller carries only the mount (`host-cloudflare/src/modules/auth/types.ts:44`, `goal-3/m2-03-check`;
`M5-reach-out.md:212`, `goal-11/m5-01`). GitHub's `sender` is thrown away, so "only listed accounts may ask" can only be
handler code.

**The call.**

```ts
// the adapter names each event's account (packages/github)
events: { issueComment: Blueprint.event(IssueComment, {
  actor: (e) => ({ id: String(e.sender.id), name: e.sender.login, bot: e.sender.type === "Bot" }),
}) },
// the caller the door makes: M2.03's service kind, with the account
{ kind: "service", mount: "github", actor: { id: "583231", name: "octocat", bot: false } }

// the app: an outside account is a thing, and listing it is a move made in the portal
export const Account = Blueprint.thing({ fields: { id: Blueprint.text(), login: Blueprint.text(), bot: Blueprint.bool() }, machine });
// machine: seen → listed → unlisted
export const listed = Blueprint.role(Account, { actor: Account.fields.id, while: [machine.states.listed] });
// blueprint/things/ticket/verbs/accept.ts
allowed: [listed.of("account")],
```

- `actor` is optional on the `service` caller. It holds the sender's **stable id**, never a login, which can change,
  plus a name for people and `bot`.
- `actor:` is a fourth declared role form beside `rule`, `who` and `holds` (K20). It admits a `service` caller whose
  account is the instance's field, in the states `while` names. It never admits a person, an agent or the system.
- The span records `principal.actor` as the id only. The portal says "a GitHub account in the state listed".
- An outside account is never linked to a person. The prototype refuses that mapping too (001, "Rejected concepts").

**Owner.** The caller and the role form belong to Goal 3 (`roles`, M2.03). Reading `actor` from an event at the door
belongs to Goal 11 (M5.03). **Needed by** the superagent's GitHub door and gate slice.

### 2. A thing can have versions

**The gap.** Every row has a `version`, but a lost race runs the call again (`host-cloudflare/src/modules/store/internal/rows.ts:47`),
so a stale save from the portal silently overwrites the newer one. The journal keeps a move's event fields, not the
record (`language-effect/src/modules/journal/types.ts:4-14`). The superagent's Policy and Prompts must have exactly one
current version, keep every save unchanged, refuse a stale save and keep its draft, and let a Mandate pin a version
(prototype 002, "Policy version"; 004, "Versions").

**The call.**

```ts
export const Policy = Blueprint.thing({
  fields: { repository: Repository.fields.id, mode: Blueprint.choice("off", "observe", "auto"), rules: Blueprint.list(Rule) },
  versions: { key: "repository" },          // one current version per repository; each save is kept and never changed
});
// generated:
//   policy.save    { repository, base: 7, …fields } → { revision: 8 } | StaleRevision { current: 8 }
//   policy.get     { repository, revision? }
//   policy.history { repository }                    → { revision, at, by, from }, newest first
//   policy.restore { repository, revision: 6, base: 8 } → { revision: 9 }
export const Mandate = Blueprint.thing({ fields: { policy: Policy.revision /* pinned */ } });
```

A blueprint that doesn't use `versions:` generates byte for byte what it did before (map rule 2).

**Owner.** Goal 3: a new `versions` module in `orthograph`, the compiler and the store. The forms are Goal 5's, and
history in the portal is Goal 6's, later. **Needed by** the superagent's Policy and Prompts slice, and its Mandates.

### 3. An agent is its own thing, living in its own actor, fed through the outbox

**The gap.** M4-agents makes the durable unit a run that ends, started only by a person:

```text
design/decisions/M4-agents.md:23-24  `Run` … (`working`, `waiting`, `done`, `failed`, `cancelled`)
design/decisions/M4-agents.md:30     "Only a person starts a run, through `Via.session` or `Via.key`"
design/decisions/M4-agents.md:39     "one SQLite Durable Object per run"
design/decisions/M3-workflows.md:75  `Blueprint.activity.call` "as the run's `system` principal"
```

So nothing an event or a workflow does can start one. A Ticket that resumes weeks later would need a new run with the
old context copied in. Pi Durable's unit is a conversation that can last indefinitely: an inbox, `submit` with a
`requestId`, steering when busy, compaction of its own context, and one SQLite Durable Object as its home
(`openDurableObjectSqliteStorage`, Pi's README, "Sleeping and Waking Up"). A run is one input-to-answer inside it.

**The call.**

```ts
// @orthograph/agents: an agent is a thing; each one lives in its own actor, whose SQLite also holds its Pi harness
export const Agent = Blueprint.thing({
  fields: { id: Blueprint.id("agt"), kind: AgentName, about: Blueprint.text() },  // about: "ticket/T-42", or "gate"
  machine,                                    // idle ⇄ working, and stopped
  lives: "actor",
});
// agent.tell: one input, submitted to Pi with the delivering event's id as its requestId
// blueprint/agents/superagent.ts: what an agent of this kind runs with
export default Blueprint.agent({ model: "commandcode/small", tools: [ticket.report, ticket.ask], env: sandbox });

// the superagent app
export const Ticket = Blueprint.thing({ fields: { id: Blueprint.id("tkt"), agent: Agent.fields.id /* … */ }, machine });
// ticket.comment records the comment; its move emits Commented { ticket, agent, text } into the outbox
// agent.tell listens for it:
export default Blueprint.operation(Agent, {
  allowed: [Blueprint.system],
  on: [Blueprint.on(Commented, (e) => ({ agent: e.agent, input: e.text }))],
});
// the agent's tools call as itself; a role admits it only on its own Ticket
{ kind: "agent", agent: "agt_…" }
export const itsAgent = Blueprint.role(Ticket, { agent: Ticket.fields.agent });
```

- **Making an agent is an ordinary create.** Any operation allowed to create an `Agent` makes one, under its own
  roles. The superagent's `ticket.accept` makes T-42's agent. "Only a person starts a run" no longer exists as a rule.
- **Input arrives through the outbox** (M5-reach-out Q1, Q3): delivered at least once, and once only by the event's
  id, which is also Pi's `requestId`. An agent mid-task is steered (`whenBusy: "steer"`); an idle one starts a turn.
- **The agent acts as itself.** The `agent` caller gains a form with no person, `{ kind: "agent", agent }`. A role
  admits it through a new role form, `agent:`, which matches the caller's agent id to a field, as fix 1's `actor:`
  matches an account. The role checks the id itself, as a service role checks its mount, so `Acting` and every rule
  given it stay person-only: `acting(principal)` returns nothing for the new form, and `who` never matches an agent
  id. A handler that needs a person still refuses an agent acting as itself. The portal's chat keeps the form "an
  agent for a person" (M2-auth fork 2). `Via.agent` names both forms: the one with no person has `via: "agent"` too,
  so an operation marked `.notVia(Via.agent)` refuses both.
- **The judge** is one `Agent` of kind `judge`, about `gate`, on a cheap model. It gets the "maybe" messages through
  `agent.tell` and answers through a `decide` tool, which is an operation. It judges only; it never routes.
- **The runs list** becomes Pi's runs inside each agent, read from its conversation. A run is no longer a row.

**Owner.** Goal 10. This changes M4-agents calls 1 and 2, `@orthograph/agents`' things and the M4.10 row. The `agent`
caller without a person is Goal 3's (M2.03). **Needed by** the superagent's Tickets-and-agents slice and its judge
slice.

### 4. The sandbox is an adapter that speaks pi-env over a socket

**The gap.** The planned workspace runs only `ortho` (`K10-factory.md:132`). Pi runs tools against an `ExecutionEnv`,
and pi-env is its remote one, but pi-env's client starts its daemon as a child process
(`@earendil-works/pi-env/dist/connection.js:1`, `import { spawn } from "node:child_process"`). A Durable Object can open
a socket but can't spawn anything. The daemon speaks plain frames over a byte stream (pi-env `docs/protocol.md`).

**The call.**

```ts
// packages/sandbox (Blueprint.adapter): Pi's ExecutionEnv, over a socket an actor can open
export default Blueprint.adapter({
  calls: { open, close },                       // one sandbox per agent, tagged, swept at the end
  env: (sandbox) => new RemoteExecutionEnv({ connection: socketConnection(sandbox.address), id: sandbox.id, cwd: "/work" }),
  standIn: Stand.process(bridge),               // on the Mac: listens on localhost, starts `pi-env serve` per sandbox in a temp folder
});
// later: an E2B provider runs pi-env inside the E2B sandbox, through the same socket client
```

The agent's tools are Pi's own (`bash`, `read`, `write`, `edit`), unchanged. `@orthograph/workspaces` (M4.18) becomes
a layer over it: `check`, `prove` and `generate` are `ortho` commands run in a sandbox.

**Owner.** No goal owns sandboxes yet; M4.17 to M4.25 are off the 1.0 path (`design/goals/map.md`). The superagent goal
builds `packages/sandbox` first. Letting an agent kind name its `env` is Goal 10's. **Needed by** the superagent's
executor slice.

### 5. Catching up after sleep, with events keyed by their object

**The gap.** The door keys an event by its delivery (`M5-reach-out.md:161-162`, "sends its delivery id separately"), and
a poll is named but not designed (`:176`, "A poll or change feed (K3 item 9) is the same"). GitHub doesn't resend a
failed delivery by itself, so a world that was down misses it. A poll that finds the same comment has no delivery id,
so the comment would count twice.

**The call.**

```ts
// packages/github (Blueprint.adapter)
events: { issueComment: Blueprint.event(IssueComment, {
  id: (e) => `comment:${e.comment.id}:${e.action}`,    // the same id from the door and from the poll
}) },
catchUp: {
  every: "5 minutes",                                  // through Timers, and once when the world starts
  since: (cursor) => listIssueCommentsSince(cursor),   // Effect<{ events, cursor }>
},
// the runtime keeps `_cursors (mount, cursor)` beside `_journal`; each event found goes through Inbox.accept;
// the cursor moves only after its events are accepted
```

An event's id is the identity of what it's about, so a webhook and a poll of one comment settle once. An adapter
whose sender offers no object id keys by delivery and declares no `catchUp`.

**Owner.** Goal 11 (M5.03 and a slice for `catchUp`). The interval is a `Timers` wait (Goal 9's). **Needed by** the
superagent's GitHub door slice.

### 6. The sandbox is lent a short-lived token, never the app's key

**The gap.** Only an adapter's layer reads a secret (`design/frame/adapters.md:20`). The agent must run `git push` and
`gh` in its sandbox, and the model can read anything in a sandbox's environment.

**The call.**

```ts
yield* sandbox.exec({ sandbox, command: ["git", "push", "origin", branch],
  env: { GH_TOKEN: github.lend({ repository, permissions: { contents: "write", pull_requests: "write" }, for: "1 hour" }) } })
```

`lend` is declared on the adapter. Its layer mints a GitHub App installation token for one repository, which expires by
itself. The value is redacted from every span, transcript and log, and the portal lists each loan with its scope and
expiry. The App's private key never leaves the adapter.

**Owner.** Goal 3 (`orthograph`'s secrets: a lent kind). The GitHub adapter's `lend` is built first on `goal/superagent`.
**Needed by** the superagent's executor slice.

## Asked and dropped

- **A run started by an event, through a standing delegation from a person** (round 1, Q3 A). Fix 3 makes it
  unnecessary: the agent acts as itself, with authority from its Ticket's Mandate.
- **A new run that `continues` the last one** (round 1, Q4 A). A Pi conversation lasts indefinitely.
- **One model call as an adapter step** (round 1, Q7 A). The judge is a durable agent with its own memory
  (Aaron: "it's not like a one-time thing… it can get better over time").
- **The agent inside its thing's actor** (round 2, Q2 A). Aaron: "Why can't the agent just be its own thing?" The
  outbox already carries the hop.
- **A plain `@orthograph/sandbox` feature with exec operations** (round 1, Q5 A). Pi's `ExecutionEnv` is that seam
  already; fix 4 adapts it.
- **The agent on a Node host, and an HTTP bridge** (round 2, Q3 B and C). The first leaves the actor; the second
  reinvents pi-env.

## Checked, and not a gap

- One judgement at a time per thread: an actor runs one call at a time (M5-reach-out Q1.4).
- Waiting conditions ("no assignee for N hours"): a workflow's `after` (M3-workflows section 4).
- Ordered replies retried with backoff: the outbox (M5-reach-out Q1 and Q5).
- The GitHub App's own sign-in (a JWT exchanged for installation tokens): the adapter's layer.

## Open risks, each a short spike on `goal/superagent`

- **Pi beside an actor's tables.** Pi's tables and the actor's `instance` and `_journal` share one Durable Object's
  SQLite. Pi's commits are async, while the actor's `commit` runs inside `transactionSync`. `agent.tell` must submit
  inside Pi's own commit and mark the request key there.
- **A socket from workerd to localhost.** Whether a local world's Durable Object reaches the bridge, and whether pi-env's
  frames run over a socket rather than a pipe. The fallback is the bridge speaking WebSocket.
- **GitHub's event ids.** Each kind the superagent takes (comments, reviews, pull requests, CI) needs an object id that
  the door and the poll both see.
- **A lent token's hour.** A prompt injection can misuse it within that hour, inside one repository. Branch protection
  holds the merge; the token's permissions hold the rest.

## Evidence

- The prototype's docs: 001 (Source, Trigger, Policy, Mandate, Ticket, Subscription; identities never mapped across
  Sources), 002 (the gate, admission, Policy version, revalidation), 003 (Executor Sessions and directories,
  `gh` in the worker), 004 (prompt versions, base revisions).
- Pi Durable 1.5.0's README: Concepts, Persist and Resume, Sleeping and Waking Up (the Durable Object host), Busy
  Conversations (`submit`, `whenBusy`, `requestId`), Environment (`ExecutionEnv`), Abort and Subagents. Also
  `https://earendil.com/posts/pi-durable/`.
- pi-env 1.4.0: `README.md`, `docs/protocol.md`, `dist/connection.js:1`.
- `host-cloudflare/src/modules/actors/README.md` and `types.ts:1` (`goal/stage-1`): one Durable Object per instance of
  a thing that `lives: "actor"`.
- The grill, both rounds: `side-session-notes/local_af3d229e-…/superagent-gaps-grill.md` (round 1) and this thread.

## Supersedes

Live docs, rewritten in this change:

- design/frame/adapters.md: "**a principal**, `service(<mount>)`, for what comes in through that door" → "**a principal**, `service(<mount>)` with the outside account that sent the event (K40), for what comes in through that door"
- design/frame/adapters.md: "the door uses `idempotent: "request"` keyed by the event's id" → "the door keys each event by the object it is about, never by a delivery id, so a webhook and a catch-up poll settle once (K40)"
- design/frame/examples/agents.md: "// a person starts a run; an agent may not, unless the mount allows it" → "// a person starts this run; under K40 an agent is its own thing instead"
- design/frame/examples/agents.md: "unless the app narrows its mount to allow agents" → "Answered by K40 (22 November 2026): an agent is its own thing"
- design/ledger.md: "Who may start an agent run: only a person, unless the app's mount allows agents (S15)." → "Who may make an agent: any operation allowed to create one, under its roles; an agent is its own thing (K40, replacing S15)."
- design/docs/index.html: "only a person can start a run. A mount can allow agents to start runs, but you have to choose that." → "its own thing, living in its own actor; any operation allowed to create one makes one, and events reach it through the outbox (K40)."
- design/frame/questions.md: "**A**: an agent starting agents spends money with no person." → "K40 (22 November 2026) replaces all three: an agent is its own thing, made by any operation allowed to create one, under that operation's roles."

## Dated records

A "Superseded by K40, 22 November 2026" note is added beside these words, which stay as written:

- `K10-factory.md` section 3, "Sandbox providers are adapters of `@orthograph/workspaces`" (now the sandbox is its own
  adapter, `packages/sandbox`, and workspaces use it).
- `K2-forman-frame.md`, S15's line, "only a person starts a run unless the mount allows agents" (now an agent is its
  own thing).

## Left to their owners

These are on other goals' branches, so each goes by Ask, never by an edit here: M4-agents calls 1 and 2 and the M4.10
row (Goal 10); M5-reach-out Q2.1 and Q4 (Goal 11); M2-auth's `service` and `agent` kinds and K20's role forms (Goal 3).

The Asks, filed 22 November 2026: Goal 3, #531 (the outside account and `actor:`), #532 (versions), #533 (an agent
caller with no person, and `agent:`), #534 (a lent token); Goal 10, #535 (an agent is its own thing; its `env`);
Goal 11, #536 (the door's account and object keys), #538 (catch-up after sleep).
