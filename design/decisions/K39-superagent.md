# K39: the superagent, built as Orthograph plugins

**Decided 22 November 2026** by a 📐 designer thread with Aaron, in one grill round, following `AGENTS.md`, "Who
decides". Aaron made calls 1 to 5 (his answers to questions 1 to 4 and 6); the eval (question 5) and the mapping calls under "The building agent's calls" are the
thread's, made as the architecture owner. They shape Goal 17 (`design/goals/17-superagent.md`).

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

1. **What it is (Q1, read from his answer to Q3).** A set of plugins plus one example app in this repository, each
   plugin its own build so they run in parallel and fold back into Orthograph. Aaron: "we build this as a set of
   apps/plugins and we can add things back into orthograph also we want to build as much in parallel as possible".
   Foreman stays parked (20 November).
2. **Where the coding runs (Q2 = A).** Locally first: the app in a workerd world on Aaron's Mac, and the agent's
   machine as an adapter, `@orthograph/sandbox`, whose stand-in is a local process (a git worktree per ticket); E2B
   later as the same calls. A Durable Object can't run a shell, and there is no Node host for an app's server
   (`Host.node` exists only for an agent run, `M4-agents.md:49`).
3. **GitHub in and out (Q3 = A).** A GitHub App: signed webhooks into the adapter's door, its own `[bot]` identity,
   locally through `gh webhook forward`. "This should be its own build": `@orthograph/github` is a separate package
   and lane, and it is M4.25. This departs from the prototype on purpose: it uses a user account because it reads that
   account's notifications (`006-deployment.md:33`); here signed webhooks replace reading notifications, so an App,
   with its own identity and a webhook secret, is the better fit.
4. **Who may ask, and where the rules live (Q4 = A).** Runtime data: `PolicyVersion` (allowed lists, bots,
   admission, rules, accept mode) and the prompt sets are things with versions, edited in the portal; each Mandate
   records the version it was accepted under. Aaron asked that the gap this exposes (a role can't see the outside
   actor) be fully understood and properly fixed, with any similar systematic gaps, in its own 📐 thread, and fixed as
   the superagent is built.
5. **Who builds the missing pieces (Q6 = A).** Goal 17 co-builds them with the example: `@orthograph/github` and
   `@orthograph/sandbox` as framework packages, beside the three feature plugins.

## The building agent's calls

- **Eval (Q5).** Aaron didn't need to decide this one. The gate is plain code: allowed list, mention, bot list,
  admission table, giving explicit, inferred or none. A model is asked only about the inferred ("maybe") messages,
  once per batch, by a cheap model that returns a fixed-shape judgement. It runs inside a workflow keyed by the
  thread, so one batch per thread is judged at a time and a crash loses nothing. The prototype's always-open "main
  Session" router is not ported, because Orthograph's operations do its routing. Explicit requests come first and
  need no model; `observe` and then `auto` come after.
- **The domain as things.** Trigger, Thread, Subscription, Decision and PolicyVersion live in `@orthograph/intake`.
  Ticket, Mandate and Assignment live in `@orthograph/tickets`. Prompt sets live in `@orthograph/prompts`. Each is a
  thing with a machine. The prototype's stage table is a derived read, not a state.
- **Execution.** One Goal 10 agent run per Assignment. Its tools are the ticket's own operations (`exec`, `read`,
  `write`, `push`, `openPull` and the prototype's six executor tools), so the server's roles decide each call. A new
  run re-reads the ticket's threads instead of carrying an old transcript, which is what the prototype's executor
  does on resume. Runs act for one operator person, and the Mandate narrows what they may do.
- **The sandbox under the workspace.** `@orthograph/sandbox` is the plain machine: a folder and a shell, with the
  `local` and `e2b` choices. K10's `localCopy` and `e2b` choices of `@orthograph/workspaces` move to it, so E2B has one
  owner. M4.18's workspace, still unowned, opens a sandbox and adds `ortho` (`check`, `prove`, `generate`) on top.
- **The GitHub adapter's shape.** M4.25 is widened to what the superagent uses, with names generated from GitHub's
  OpenAPI document: `pulls.create` for `pullRequests.open`, and the `pullRequest` event, whose merged close replaces
  `pullRequest.merged`. Goal 17 owns the row.
- **Pushing.** `ticket.push` bundles the branch from the sandbox and pushes it through the GitHub adapter, so the
  key never enters the sandbox.
- **Their effects queue and outbox** become Goal 11's outbox and Goal 8's workflows. Their retries and backoff go
  through Goal 9's `Timers`.
- **Their panel** becomes portal pages on the app map (K31, K36), with "Needs you" first.
- **The model.** The model is DeepSeek, through `@orthograph/openai` (M4-agents call 5), mounted as `deepseek` with
  its key declared. Every check runs on the stand-in model with no key.
- **Status `ready`.** The four lanes' checks can start now: GitHub, sandbox, intake and prompts, tickets. The sandbox
  builds at once; the GitHub, intake and tickets builds wait for Goal 3's callers and secrets (Gate M2, M2.03, M2.04),
  and the rest wait on Goals 11, 10, 8 and 6, as the brief's slice table says.

## What it touches

| Dependent | How |
|---|---|
| `design/goals/map.md` | Goal 17's row; M4.25 is now Goal 17's |
| Goals 3, 10, 11 | Ask issues from the gaps thread, never edits to their paths |
| M4.25 | built in Goal 17's slices 2 and 3, as `@orthograph/github` |
| M4.17, M4.18 | stay unowned; the `ortho` workspace later sits on `@orthograph/sandbox` |
| M5.14, M3.19 | M5.14 reuses `@orthograph/github`; M3.19 may reuse `@orthograph/intake` if K11's inbox agrees |

## Evidence

- The prototype's docs, read on 22 November 2026 with `gh api repos/deepseek-ai/dsh-superagent-prototype/contents/docs/<file>`.
  The facts quoted: the GitHub account must be a user because it reads notifications (`006-deployment.md:33`);
  every Mandate records its Policy version (`002-authorization.md:109`); accept modes, `observe` by default
  (`002-authorization.md:91-99`); the main Session only routes (`004-prompts.md:77`); immutable prompt versions
  (`004-prompts.md:93`); work is stored first and done afterwards (`003-execution.md:155`).
- `packages/orthograph/src/modules/roles/types.ts:18` on `goal/stage-1`: a role's rule takes only a person.
- `design/decisions/M2-auth.md:180` on `goal/stage-1`: `service` carries only its mount.
- `design/decisions/M4-agents.md:46-49` (PR #469): the hosts a run lives on.
- `design/decisions/K10-factory.md:144-145`: `localCopy` and `e2b`.
- `design/frame/adapters.md:93-108`: events in through `on:`, as `service(<mount>)`.

## Open risks

- A webhook door loses events while the local world is down; a catch-up read is a gap for Goal 11.
- The sandbox's local process runs as Aaron's own user, as the prototype does: defaults, not isolation. E2B is the
  isolated choice later.
- The stand-in GitHub is our own small server over a real bare repository; its conformance against real GitHub runs
  only in the cloud pass. Gitea is the second rung (M4.25).

## Supersedes

- `design/goals/map.md`: "the builder's tools and workspaces (M4.11 to M4.15, M4.17 to M4.25)" → "the builder's tools and workspaces (M4.11 to M4.15, M4.17 to M4.24; M4.25 is Goal 17's, K39)"
- `design/milestones.md`, M4.25: "The `github` adapter for pull requests (K10 section 3): `branches.push`, `pullRequests.open`, the `pullRequest.merged` event;" → "The `github` adapter, `@orthograph/github`, built by Goal 17 (K39; K10 section 3): a GitHub App; calls generated from GitHub's OpenAPI document, `branches.push`, `pulls.create`, …; signed webhook events …, `pullRequest` (its merged close among them), …;"
- `design/milestones.md`, M4.25's done-when: "a merge emits `pullRequest.merged` once" → "a merge emits `pullRequest` closed and merged once; a webhook with a bad signature is refused"
- `design/milestones.md`, M4.25's needs: "| Gate M2 | build | the adapter's" → "| Gate M2; its events in: M5.03 (Goal 17 builds the calls in its slice 3, the events in its slice 10) | build | the adapter's"
- `design/milestones.md`, M4.18: "`@orthograph/workspaces` with the `localCopy` choice (K10 section 3):" → "`@orthograph/workspaces` on `@orthograph/sandbox`'s `local` choice (K10 section 3; K39: the sandbox holds the machine, the workspace adds `ortho`):"
- `design/milestones.md`, M4.18's needs: "| M4.17, M4.25 | build |" → "| M4.17, M4.25, Goal 17's slice 5 (the sandbox) | build |"
- `design/milestones.md`, M4.19: "The `e2b` choice: our template," → "The sandbox's `e2b` choice (`@orthograph/sandbox`, K39), for workspaces: our template,"
- `design/later.md`: "for `@orthograph/workspaces`, beside `localCopy` and `e2b`" → "for `@orthograph/sandbox`, beside `local` and `e2b` (K39)"
- `design/milestones.md`, beside the stages: "(M3.20, M4.17 to M4.25, K10)" → "(M3.20, M4.17 to M4.25, K10; M4.25 built by Goal 17, K39)"

Dated records keep their words and gain a "Superseded by K39, 22 November 2026" note: `design/decisions/K10-factory.md`
section 3's choices table and its floor items 2 and 6 (`localCopy`, `e2b`), and `design/scope.md`'s off-path list.
`K10-factory.md`'s `pullRequests.open` and `pullRequest.merged` stay as the record of that day.
