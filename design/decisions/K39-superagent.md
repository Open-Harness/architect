# K39: the superagent, an always-on agent pattern on Orthograph

**Decided 22 November 2026** by a 📐 designer thread with Aaron, following `AGENTS.md`, "Who decides". Aaron made
calls 1 to 14 below over the day: 1 to 5 in one grill round, 6 to 9 after the plan's first draft, 10 to 14 on the
whiteboard the thread drew of the whole spec. The calls under "The building agent's calls" are the thread's, made as
the architecture owner. They shape Goal 17 (`design/goals/17-superagent.md`). The framework fixes the pattern needs
are K40 (`design/decisions/K40-superagent-gaps.md`), decided the same day.

## The problem

Aaron wants an agent like DeepSeek's `dsh-superagent-prototype`: it listens to a repository and a chat, decides under
its own rules whether a message is work, does the work in its own session and folder, and answers where it was asked,
usually with a pull request. Its docs (`README.md` and `docs/000` to `008`, read on 22 November 2026) describe a domain
of Sources, Triggers, Threads, Correlations, Evals, Decisions, Mandates, Tickets, Subscriptions, Assignments, Inputs,
Reports, Attention, outgoing messages, a versioned Policy, versioned prompts, settings, a main session that routes and
one executor session per ticket, a durable effects queue, and a panel that shows only what needs a person.

Aaron wants more than that one product. He wants the pattern: an always-on agent anyone can make, for any job, from
any streams of events. It is also the hardest test of Orthograph from the outside. Nothing on the goal map owned it:
`design/goals/map.md:60-62` listed the GitHub adapter (M4.25) and the workspaces (M4.17, M4.18) as off the 1.0 path.

## Aaron's calls

1. **What it is.** A set of plugins plus one example app in this repository, built in parallel and folded back into
   Orthograph. Aaron: "we build this as a set of apps/plugins and we can add things back into orthograph also we want
   to build as much in parallel as possible". Foreman stays parked (20 November).
2. **Where the coding runs.** Locally first: the app in a workerd world on Aaron's Mac, and the machine its agents code
   on a sandbox beside it. E2B later. A Durable Object can't run a shell.
3. **GitHub in and out.** A GitHub App: signed webhooks into the adapter's door, its own `[bot]` identity, locally
   through `gh webhook forward`. "This should be its own build": `@orthograph/github`, which is M4.25. This departs
   from the prototype on purpose: it uses a user account because it reads that account's notifications
   (`006-deployment.md:33`); here signed webhooks replace reading notifications, so an App is the better fit.
4. **Who may ask, and where the rules live.** Runtime data: the policy (allowed lists, bots, admission, rules, accept
   mode), the prompts and the settings are things with versions, edited in the portal or by the main agent on a
   person's ask; each Mandate records the version it was accepted under. The gaps this exposes are designed in their
   own 📐 thread: that is K40.
5. **The sandbox is its own piece.** Aaron first took a plain `@orthograph/sandbox` feature ("this makes sense"); in
   K40's second grill round he chose an adapter that speaks pi-env over a socket (K40 fix 4). `@orthograph/sandbox` is
   that adapter, and M4.18's workspaces are built on it later.
6. **An integration branch.** `goal/superagent` builds the app and the framework fixes together, and the conductor
   merges them back. Aaron: "we're going to be on our own integration branch building both the new application and
   fixing the issues in the framework … And then we're going to merge it back in." So nothing in Goal 17 waits on
   another goal's milestone: where it needs a piece that isn't on `goal/stage-1` yet, it builds that piece here, to
   its owner's design, and says so. This is an exception, for Goal 17, to the map's rule 1.
7. **Build in the app, then extract.** Aaron: "everything that works, we extract it out into plugins … We don't build
   things twice." So the plugins are written inside `examples/superagent/plugins/`, each in its final shape, and moved
   into `packages/` once the goal check passes.
8. **One durable conversation per long-lived thing.** The agents sit on Pi Durable, whose unit is a conversation that
   can live for years: a ticket's executor keeps one conversation from its first ask to its last review. Aaron: "you
   can have an agent that lasts for like years, like on the same thread, like that's kind of its whole purpose".
9. **The main agent is durable, cheap and remembers.** One agent with its own conversation, on a low-cost model, so it
   has context and gets better over time. Aaron: "it's just one Durable agent per thing … It stays there forever … we
   set it to a really low model … it's got its own memory".
10. **The spec is translated whole.** Every concept, command, event and page of the prototype has its place in the app;
    nothing is cut down to a first version. Where Orthograph can't say something, that is a gap to fix, not a part to
    drop.
11. **A general pattern.** A superagent is made for any job, by a person or by another agent, from any streams of
    events, for a short, medium or long goal. Aaron: "you or another agent can then create one of these for any sort
    of thing … a triage agent or a PR agent … It's a generalized pattern." His example, a triage agent: PostHog
    issues come in, it works out whether each can be fixed, researches it, and opens a pull request.
12. **Slack, not Feishu.** Aaron: "we're not going to use Faishu … but we are going to use Slack." The prototype's
    Feishu source becomes Slack.
13. **Connections, not sources and outputs.** A superagent is an actor, and what it can do is tools. Aaron, on the
    board: "the outputs generally they're going to be some sort of tools". So a superagent names its connections, each
    giving events in, tools out, its own identity there and the channels it answers in. Its "horizon" field is dropped
    too; when a ticket ends is the playbook's `endsWhen` (Aaron: "Yes, drop both").
14. **Connections are generated from each service's own spec.** Aaron: "Ideally, we want to like be able to point
    somewhere and get like a typed thing back." `ortho new adapter <name> --from-openapi` (M5.07) gives an adapter's
    calls, events, errors and types; a source adds only a short mapping. Aaron chose this over hand-written wrappers
    ("Yes, from the spec"; on the plan, "agreed").

## The building agent's calls

- **A superagent is a thing, and the actor.** `Superagent` holds its name, purpose, connections, playbook and slots,
  with versions (K40 fix 2). Its machine is `observing → live ⇄ paused → retired`; its operations are `create`,
  `update`, `goLive`, `pause`, `resume` and `retire`. `create` is allowed to a person and to a superagent's main agent.
  A blueprint can also declare one (`Superagent.declare`), which is the same create at the first deploy. Its main agent
  acts as it; each executor acts as it for its own ticket only (K40 fix 3's `agent:` role form).
- **Rules change at runtime; the engine changes by deploy.** Connections, policy, prompts, playbook and settings are
  data with versions. The things, operations and pages are the blueprint.
- **A connection is a mount plus a mapping.** The adapter is generated from the service's spec; its events carry their
  own id and sender (K40 fixes 1 and 5) and catch up after sleep. The superagent adds `Source.from(adapter, mapping)`:
  which events are triggers and how each maps to one (thread, text, link), the call that replies, the call that reads
  a thread's history, the event that closes a thread, and its part of the policy. Every call the mount includes becomes
  an agent tool, its schema generated from the blueprint (`D2.md:59`). A timer is a source too, for a standing goal.
- **The specs, checked on 22 November 2026.** GitHub publishes an OpenAPI 3.1 description with 842 paths and 276
  webhook events (`github/rest-api-description`, `descriptions-next/api.github.com/api.github.com.json`). PostHog serves
  an OpenAPI 3.1 schema at `/api/schema/`; its alerts reach us through a webhook whose payload we write, so that schema
  is written once beside the mapping. Slack's Web API description is OpenAPI 2.0 in `slackapi/slack-api-specs`, archived
  in 2021: Slack is generated from it, the few calls used are checked against the live API by hand, and the conformance
  test keeps them honest. A service with no spec gets a payload schema written once and the same mapping
  (`@orthograph/webhook`).
- **M5.07 is built first, here.** The generator and its conformance harness are built on `goal/superagent` (call 6),
  to `design/frame/adapters.md`'s design, and merged back with the rest.
- **The spec, as things.** In `@orthograph/intake`: Source, Account (K40 fix 1), Trigger, Thread, Correlation, Eval,
  Decision, PolicyVersion, the gate and the Source contract. In `@orthograph/tickets`: Mandate, Ticket, Subscription,
  Assignment, Input, Report, Attention and Outgoing message, and the ticket stage as a derived read. In
  `@orthograph/prompts`: PromptSet. In `@orthograph/superagent`: the Superagent and its two kinds of agent. In the app:
  Settings and the pages. Each spec command is an operation on its thing; each spec event is a declared event.
- **The gate is code, and the main agent judges what it lets through.** The gate reads the sender's account, the
  mention, the bot list and the admission table, and gives explicit, inferred or none. `none` stops there: a stranger's
  text never reaches a model. Everything else is a candidate: `evals.due` batches a thread's waiting triggers every two
  seconds, and the main agent reads the batch and its context, records one judgement per enabled rule (`eval.decide`),
  and routes it (`decision.route`: accept, attach, stop or ignore). In `observe` an accept is recorded as "would
  accept" and starts nothing. A trigger on a thread a ticket follows goes straight to that ticket's executor, with no
  eval. This is the prototype's own flow (`004-prompts.md:77`, the main session only routes); K40 fix 3 says the same.
- **The two agents are K40 Agents.** The main agent is one `Agent` of kind `main`, about its superagent, for good. Each
  ticket's executor is one of kind `executor`, about its ticket, opened by the accept and left idle when the ticket
  ends, so a resume finds it with its memory. Both are fed by `agent.tell` through the outbox, keyed by the event's id,
  steered when busy. The executor runs in the ticket's sandbox (K40 fix 4) with Pi's coding tools, the ticket's own
  operations, the connections' tools and the playbook's extra tools; `git push` and `gh` use a token the GitHub
  adapter lends for an hour (K40 fix 6).
- **No effects queue of our own.** The prototype's effects become Orthograph's own stored work: a launch is a
  workflow, a delivery or a relay is `agent.tell` through the outbox, a reply goes through the outbox in order per
  ticket and conversation, the eval pass and retries are `Timers` waits (Goal 9's). Every outward operation is
  declared `replay: "safe"` with a natural key, so a call a kill cut off runs again as the same call and lands once.
- **When a ticket ends is the playbook's.** `endsWhen` is `reported` (the executor reports it ready), `threadsClosed`
  (every thread it owns closed, the default) or `never` (a standing goal, such as a weekly sweep). A person's message on
  its threads resumes an ended ticket, after its mandate is revalidated.
- **Goal 17 designs four seams itself,** in slice 2's decision step, as `GOAL17-<slug>` records: sources on generated
  adapters (gap G3), executor slots with one kept for a person's message (G6), one switch that pauses evals, launches,
  deliveries and replies while sources keep recording (G9), and derived reads the portal and agents share (G11).
- **Two instances prove the pattern.** The coding agent (GitHub and Slack, declared in the blueprint) is the prototype
  translated. The triage agent (PostHog, GitHub issues, Slack `#triage` and a weekly timer) is made by a
  `superagent.create` call at runtime, with no new code. If it needs new code, the pattern is wrong.
- **The model.** DeepSeek through `@orthograph/openai` (M4-agents call 5), mounted as `deepseek` with its key
  declared; the main agent on the cheapest model that judges well. Every check runs on the stand-in model with no key.
- **The panel** becomes the portal's pages on the app map (K31, K36): Agents first, then one superagent's Overview,
  Source, Trigger, Eval, Execution and Settings.
- **Status `ready`.** K40 is decided (#529). Slice 2's decision step settles the four seams above before any slice
  needs them. Nothing else stops the goal starting.

## What it touches

| Dependent | How |
|---|---|
| `design/goals/map.md` | Goal 17's row; M4.25 is now Goal 17's; rule 1's exception for an integration branch |
| `AGENTS.md`, "How work flows" | K34's rule gains the integration branch's exception: it builds what it needs there |
| Goals 3, 10, 11 | K40's fixes, built on `goal/superagent`, each announced by its Ask and merged back by the conductor |
| M4.25 | `@orthograph/github`, generated from GitHub's spec, built in Goal 17 |
| M5.07 | `ortho new adapter --from-openapi`, built first in Goal 17 to `adapters.md`'s design |
| M4.17, M4.18, M4.19 | stay unowned; the `ortho` workspace and its E2B provider sit on `@orthograph/sandbox` |
| M5.14, M3.19 | M5.14 reuses `@orthograph/github`; M3.19 may reuse `@orthograph/intake` if K11's inbox agrees |

## Evidence

- The prototype's docs, read on 22 November 2026 with `gh api repos/deepseek-ai/dsh-superagent-prototype/contents/docs/<file>`.
  The facts quoted: the GitHub account must be a user because it reads notifications (`006-deployment.md:33`);
  every Mandate records its Policy version (`002-authorization.md:109`); accept modes, `observe` by default
  (`002-authorization.md:91-99`); the main Session only routes (`004-prompts.md:77`); immutable prompt versions
  (`004-prompts.md:93`); work is stored first and done afterwards (`003-execution.md:155`).
- Pi Durable 1.5.0's README: a conversation is a transcript of stored entries, committed before it is shown and resumed
  from storage; `submit` with a `requestId` is answered once, and `whenBusy: "steer"` places a message after the
  current tool round; compaction summarises older entries and keeps them. pi-env 1.4.0's `RemoteExecutionEnv` runs the
  tools on another machine while storage and credentials stay local.
- The specs: `github/rest-api-description` (OpenAPI 3.1.0, 842 paths, 276 entries under `webhooks`); PostHog's
  `/api/schema/` (OpenAPI 3.1.0); `slackapi/slack-api-specs` (Swagger 2.0, 174 paths, archived, last pushed 7 September
  2021). Each fetched and counted on 22 November 2026.
- `design/frame/adapters.md`: an adapter's six parts, and `ortho new adapter --from-openapi` (its "Writing an adapter").
- `design/decisions/K40-superagent-gaps.md`: fixes 1 to 6, and the main agent's flow in fix 3.

## Open risks

- Framework fixes made on an integration branch can collide with the owning goal's own work on the same files. Each
  is announced by an Ask issue before its slice merges; the conductor merges them back.
- A generated adapter is only as good as the spec. Slack's is old; the conformance test against the live API, in the
  cloud pass with Aaron's yes, is what catches drift.
- A conversation that lives for months costs a summary each time its window fills; Pi counts that spend, and the portal
  shows it per ticket.
- The sandbox's local bridge runs as Aaron's own user, as the prototype does: defaults, not isolation. E2B is the
  isolated choice later.
- The stand-in GitHub is our own small server over a real bare repository; Gitea is the second rung (M4.25).

## Supersedes

- `design/goals/map.md`: "the builder's tools and workspaces (M4.11 to M4.15, M4.17 to M4.25)" → "the builder's tools and workspaces (M4.11 to M4.15, M4.17 to M4.24; M4.25 is Goal 17's, K39)"
- `design/milestones.md`, M4.25: "The `github` adapter for pull requests (K10 section 3): `branches.push`, `pullRequests.open`, the `pullRequest.merged` event;" → "The `github` adapter, `@orthograph/github`, built by Goal 17 (K39; K10 section 3): a GitHub App, generated from GitHub's published API description (M5.07); the mount includes `pulls.create`, …; signed webhook events …, `pullRequest` (its merged close among them), …"
- `design/milestones.md`, M4.25's done-when: "a merge emits `pullRequest.merged` once" → "a merge emits `pullRequest` closed and merged once; a webhook with a bad signature is refused"
- `design/milestones.md`, M4.25's needs: "| Gate M2 | build | the adapter's" → "| Gate M2, M5.03 and M5.07, or Goal 17's own build of them on its integration branch (K39) | build | the adapter's"
- `design/milestones.md`, M5.07: "`ortho new adapter --from-openapi` and the conformance harness | M5.03 | build" → "`ortho new adapter --from-openapi` and the conformance harness, built first by Goal 17 on its integration branch (K39) | M5.03 | build"
- `design/milestones.md`, M4.18: "`@orthograph/workspaces` with the `localCopy` choice (K10 section 3):" → "`@orthograph/workspaces` on `@orthograph/sandbox`'s `local` provider (K10 section 3; K39: the sandbox holds the machine, the workspace adds `ortho`):"
- `design/milestones.md`, M4.18's needs: "| M4.17, M4.25 | build |" → "| M4.17, M4.25, the sandbox (Goal 17) | build |"
- `design/milestones.md`, M4.19: "The `e2b` choice: our template," → "The sandbox's `e2b` provider (`@orthograph/sandbox`, K39), for workspaces: our template,"
- `design/later.md`: "for `@orthograph/workspaces`, beside `localCopy` and `e2b`" → "for `@orthograph/sandbox`, beside `local`, `ssh` and `e2b` (K39)"
- `design/milestones.md`, beside the stages: "(M3.20, M4.17 to M4.25, K10)" → "(M3.20, M4.17 to M4.25, K10; M4.25 built by Goal 17, K39)"

Dated records keep their words and gain a "Superseded by K39, 22 November 2026" note: `design/decisions/K10-factory.md`
section 3's choices table and its floor items 2 and 6 (`localCopy`, `e2b`), and `design/scope.md`'s off-path list.
`K10-factory.md`'s `pullRequests.open` and `pullRequest.merged` stay as the record of that day.
