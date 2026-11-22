# K39: the superagent, built on Orthograph and Pi Durable

**Decided 22 November 2026** by a 📐 designer thread with Aaron, following `AGENTS.md`, "Who decides". Aaron made
calls 1 to 9: calls 1 to 5 in one grill round, calls 6 to 9 the same evening, after reading the plan's first draft.
The calls under "The building agent's calls" are the thread's, made as the architecture owner. They shape Goal 17
(`design/goals/17-superagent.md`).

## The problem

Aaron wants a proactive coding agent like DeepSeek's `dsh-superagent-prototype`: it watches one GitHub repository,
takes on work when an allowed person asks for it, works each piece in its own agent session and folder, and
answers in the same conversation, usually with a pull request. Its docs (`README.md` and `docs/000` to `008`, read
on 22 November 2026) describe a domain of Sources, Triggers, Threads, Evals, Decisions, Mandates, Tickets,
Assignments and Subscriptions, a versioned Policy, versioned prompts, a durable effects queue, and a panel that
shows only what needs a person. It is also the hardest test of Orthograph from the outside, beside Aaron's GitHub
events app idea. Nothing on the goal map owned it: `design/goals/map.md:60-62` listed the GitHub adapter (M4.25)
and the workspaces (M4.17, M4.18) as off the 1.0 path and not a goal yet.

## Aaron's calls

1. **What it is.** A set of plugins plus one example app in this repository, built in parallel and folded back into
   Orthograph. Aaron: "we build this as a set of apps/plugins and we can add things back into orthograph also we want
   to build as much in parallel as possible". Foreman stays parked (20 November).
2. **Where the coding runs.** Locally first: the app in a workerd world on Aaron's Mac, its agents on M4-agents' Node
   host beside it, and the machine they code on a sandbox. E2B later. A Durable Object can't run a shell.
3. **GitHub in and out.** A GitHub App: signed webhooks into the adapter's door, its own `[bot]` identity, locally
   through `gh webhook forward`. "This should be its own build": `@orthograph/github`, which is M4.25. This departs
   from the prototype on purpose: it uses a user account because it reads that account's notifications
   (`006-deployment.md:33`); here signed webhooks replace reading notifications, so an App is the better fit.
4. **Who may ask, and where the rules live.** Runtime data: `PolicyVersion` (allowed lists, bots, admission, rules,
   accept mode) and the prompt sets are things with versions, edited in the portal; each Mandate records the version
   it was accepted under. The gaps this exposes (a role can't see the outside actor, and the others in the brief) are
   designed properly, with any similar systematic gaps, in their own 📐 thread, and fixed as the superagent is built.
5. **The sandbox is a plain feature.** `@orthograph/sandbox`, with its providers as adapters and M4.18's workspaces
   built on it later. Aaron: "this makes sense".
6. **An integration branch.** `goal/superagent` builds the app and the framework fixes together, and the conductor
   merges them back. Aaron: "we're going to be on our own integration branch building both the new application and
   fixing the issues in the framework … And then we're going to merge it back in." So nothing in Goal 17 waits on
   another goal's milestone: where it needs a piece that isn't on `goal/stage-1` yet, it builds that piece here, to
   its owner's design, and says so. This is an exception, for Goal 17, to the map's rule 1 (a goal touches only its
   own paths).
7. **Build in the app, then extract.** Aaron: "everything that works, we extract it out into plugins … We don't build
   things twice. We build it and then once it's worked, like we iterate on it. And then when it's good, it comes into
   the framework." So the five plugins are written inside `examples/superagent/plugins/`, each in its final shape,
   and moved into `packages/` once the goal check passes.
8. **One durable conversation per long-lived thing.** The agents sit on Pi Durable, whose unit is a conversation that
   can live for years: a ticket keeps one conversation from its first ask to its last review, and Pi handles the
   context window. Aaron: "you can have an agent that lasts for like years, like on the same thread, like that's kind
   of its whole purpose".
9. **The judge is a durable agent.** The "maybe" messages are read by one cheap-model agent with its own conversation,
   so it has context and gets better over time, not a one-shot call. Aaron: "it's just one Durable agent per thing …
   It stays there forever … we set it to a really low model … it's got its own memory".

And the order: the superagent's stage one comes first, as any app's does: its blueprint, the things, events and
operations, then its checks, then its handlers.

## The building agent's calls

- **The gate is code; only the maybe messages reach a model.** The gate reads the allowed list, the mention, the bot
  list and the admission table, giving explicit, inferred or none. Explicit asks are accepted and follow-ups on a
  followed thread go to their ticket, with no model. Inferred ones, which come only from people or bots the
  policy admits, go to the judge, which answers through one operation, `decision.record`; in `auto` that operation
  accepts the ticket. A stranger's text never reaches a model. The prototype's main session, which routed everything, becomes the judge narrowed to
  these. `observe` comes before `auto`.
- **The judge's memory.** Its conversation, summarised by Pi as it grows. A person's `decision.overrule` and every
  policy save are added to it, so it learns from being corrected.
- **The domain as things.** Source, Trigger, Thread, Subscription, Decision and PolicyVersion in intake; Ticket and
  Mandate in tickets; PromptSet in prompts; Sandbox in sandbox. Each is a thing with a machine. The prototype's
  Assignment is not a thing: the ticket's conversation is the work, and each answered message in it is a turn. The
  stage table is a derived read.
- **The ticket's agent.** One conversation per ticket, opened by `ticket.accept`, aborted by `ticket.stop`, and left
  idle by `end` so that `resume` finds it. New messages on its threads reach it through `ticket.tell`, keyed by the
  trigger, steering it if it is working. Its coding tools are Pi's `read`, `write`, `edit` and `bash`, run inside the
  ticket's sandbox only. Its outward tools (`ack`, `reply`, `report`, `handback`, `follow`, `unrelated`, `push`,
  `openPull`) are the ticket's operations, so the server's roles decide each one, and only the ticket's own
  conversation may call them.
- **The sandbox is Pi's execution environment.** A `Sandbox` per owner, handed to the owner's conversation as Pi's
  `ExecutionEnv`: the `local` provider is a git worktree served by pi-env's `LocalExecutionEnv`, the `ssh` provider is
  pi-env's `RemoteExecutionEnv` on a box you own, and `e2b` comes later. K10's `localCopy` and `e2b` choices of
  `@orthograph/workspaces` move here, so E2B has one owner. M4.18's workspace opens a sandbox and adds `ortho`
  (`check`, `prove`, `generate`) on top.
- **Pushing.** `ticket.push` bundles the branch from the sandbox and pushes it through the GitHub adapter, so the key
  never enters the sandbox.
- **No effects queue of our own.** Pi stores each tool call's intent before it runs. The outward operations are
  declared `replay: "safe"`, so a call a kill cut off is rerun as the same call, and each has a natural key that makes
  the rerun a no-op (`push` by its head, `openPull` by its branch, `ack` and `reply` by their trigger). So a reply goes
  out once and in order without the outbox or a workflow.
  Every wait goes through Goal 9's `Timers`.
- **The GitHub adapter's shape.** M4.25 is widened to what the superagent uses, with GitHub's names (`pulls.create`,
  the `pullRequest` event, whose merged close replaces `pullRequest.merged`), typed by hand from GitHub's OpenAPI
  document until M5.07 exists. Goal 17 owns the row.
- **The panel** becomes portal pages on the app map (K31, K36), with "Needs you" first.
- **The model.** DeepSeek, through `@orthograph/openai` (M4-agents call 5), mounted as `deepseek` with its key
  declared; the judge on the cheapest model that judges well. Every check runs on the stand-in model with no key.
- **Status `ready`.** The framework fixes are designed as K40 by their own 📐 thread. K40 is slice 2's first step, as
  `AGENTS.md` places a decision before the first step that needs it: taken from that thread if it has landed, written
  from its notes if not. Nothing else stops the goal starting.

## What it touches

| Dependent | How |
|---|---|
| `design/goals/map.md` | Goal 17's row; M4.25 is now Goal 17's; rule 1's exception for an integration branch |
| `AGENTS.md`, "How work flows" | K34's rule gains the integration branch's exception: it builds what it needs there |
| Goals 3, 10, 11 | the framework fixes made on `goal/superagent` to K40's design, each announced by an Ask issue and merged back by the conductor |
| M4.25 | built in Goal 17's slice 9, as `@orthograph/github` |
| M4.17, M4.18 | stay unowned; the `ortho` workspace later sits on `@orthograph/sandbox` |
| M5.14, M3.19 | M5.14 reuses `@orthograph/github`; M3.19 may reuse `@orthograph/intake` if K11's inbox agrees |

## Evidence

- The prototype's docs, read on 22 November 2026 with `gh api repos/deepseek-ai/dsh-superagent-prototype/contents/docs/<file>`.
  The facts quoted: the GitHub account must be a user because it reads notifications (`006-deployment.md:33`);
  every Mandate records its Policy version (`002-authorization.md:109`); accept modes, `observe` by default
  (`002-authorization.md:91-99`); the main Session only routes (`004-prompts.md:77`); immutable prompt versions
  (`004-prompts.md:93`); work is stored first and done afterwards (`003-execution.md:155`).
- Pi Durable 1.5.0's README, read on 22 November 2026: a conversation is a transcript of stored entries; every step is
  committed before it is shown and a reopened storage resumes it; `submit` with a `requestId` is answered once, and
  `whenBusy: "steer"` places a message after the current tool round; compaction summarises older entries and keeps
  them in storage; `env` builds an `ExecutionEnv` per conversation; a subagent on a cheaper model is a conversation of
  its own. Earendil's post of 1 October 2026 promises "infinitely long conversations". pi-env 1.4.0's README:
  `RemoteExecutionEnv` runs the tools on another machine while storage and credentials stay local.
- `design/decisions/M4-agents.md:20-50` (PR #469): `Run` is one job with closed outcomes, one SQLite store per run,
  started only by a person; the Node host keeps one file per run.
- `packages/orthograph/src/modules/roles/types.ts:18` on `goal/stage-1`: a role's rule takes only a person.
- `design/decisions/M2-auth.md:180` on `goal/stage-1`: `service` carries only its mount.
- `design/decisions/K10-factory.md:144-145`: `localCopy` and `e2b`.
- `design/frame/adapters.md:93-108`: events in through `on:`, as `service(<mount>)`.

## Open risks

- Framework fixes made on an integration branch can collide with the owning goal's own work on the same files. Each
  is announced by an Ask issue before its slice merges, so the owner can say so early; the conductor merges them back.
- A conversation that lives for months costs a summary each time its window fills; Pi counts that spend in its usage,
  and the portal shows it per ticket.
- A webhook door loses events while the local world is down; a catch-up read is a gap for Goal 11.
- The sandbox's local provider runs as Aaron's own user, as the prototype does: defaults, not isolation. E2B is the
  isolated choice later.
- The stand-in GitHub is our own small server over a real bare repository; its conformance against real GitHub runs
  only in the cloud pass. Gitea is the second rung (M4.25).

## Supersedes

- `design/goals/map.md`: "the builder's tools and workspaces (M4.11 to M4.15, M4.17 to M4.25)" → "the builder's tools and workspaces (M4.11 to M4.15, M4.17 to M4.24; M4.25 is Goal 17's, K39)"
- `design/milestones.md`, M4.25: "The `github` adapter for pull requests (K10 section 3): `branches.push`, `pullRequests.open`, the `pullRequest.merged` event;" → "The `github` adapter, `@orthograph/github`, built by Goal 17 (K39; K10 section 3): a GitHub App; calls typed from GitHub's OpenAPI document, `branches.push`, `pulls.create`, …; signed webhook events …, `pullRequest` (its merged close among them), …;"
- `design/milestones.md`, M4.25's done-when: "a merge emits `pullRequest.merged` once" → "a merge emits `pullRequest` closed and merged once; a webhook with a bad signature is refused"
- `design/milestones.md`, M4.25's needs: "| Gate M2 | build | the adapter's" → "| Gate M2 and M5.03, or Goal 17's own build of them on its integration branch (K39, its slice 9) | build | the adapter's"
- `design/milestones.md`, M4.18: "`@orthograph/workspaces` with the `localCopy` choice (K10 section 3):" → "`@orthograph/workspaces` on `@orthograph/sandbox`'s `local` provider (K10 section 3; K39: the sandbox holds the machine, the workspace adds `ortho`):"
- `design/milestones.md`, M4.18's needs: "| M4.17, M4.25 | build |" → "| M4.17, M4.25, the sandbox (Goal 17's slice 6) | build |"
- `design/milestones.md`, M4.19: "The `e2b` choice: our template," → "The sandbox's `e2b` provider (`@orthograph/sandbox`, K39), for workspaces: our template,"
- `design/later.md`: "for `@orthograph/workspaces`, beside `localCopy` and `e2b`" → "for `@orthograph/sandbox`, beside `local`, `ssh` and `e2b` (K39)"
- `design/milestones.md`, beside the stages: "(M3.20, M4.17 to M4.25, K10)" → "(M3.20, M4.17 to M4.25, K10; M4.25 built by Goal 17, K39)"

Dated records keep their words and gain a "Superseded by K39, 22 November 2026" note: `design/decisions/K10-factory.md`
section 3's choices table and its floor items 2 and 6 (`localCopy`, `e2b`), and `design/scope.md`'s off-path list.
`K10-factory.md`'s `pullRequests.open` and `pullRequest.merged` stay as the record of that day.
