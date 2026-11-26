# Codex handoff: the portal, the plan and the agent fleet

Written 16 November 2026 by a 📐 Designer thread with Aaron, live. This is the whole prompt. Paste it into Codex as is.
Codex reads `AGENTS.md` by itself, but it gets nothing else from the conversation that made this, so everything it needs
is written here. Where this file and the repository disagree, the repository wins: fix this file in your first pull
request and say so in your report.

---

## 0. Who you are and what you own

You are a 🔨 builder, and for the design phases a 📐 designer, working on **Architect**, the framework in this
repository (github.com/AaronAbuUsama/architect). You own one track: **the portal, the plan inside it, and the agent fleet
that works the plan.** It is one cohesive application. A person opens the portal, sees the whole blueprint as rich,
filterable tables, picks operations into a milestone, launches a manager agent, and watches a fleet of worker agents
climb those operations from red to green. The portal shows the verdicts arriving.

Another agent, the 🎼 conductor, owns the main line: stage 3 (Gate 2) on the branch `layer/3`. **You must not collide
with it.** Section 6 says exactly how.

Aaron is the person you report to. He listens rather than reads (section 10).

---

## 1. What Architect is, in plain words

Architect is Effect, one level up. Effect makes a piece of code declare its errors and what it needs. Architect makes a
whole system declare what it is: its things and their state machines, the events each change emits, the errors, the
steps and telemetry, who may call each operation, how fast it must be, where it runs, and what depends on what. That
declaration is the **blueprint**.

The blueprint is TypeScript, not Markdown. It is typed declarations a compiler reads, so it cannot drift. Everything
else is generated from it, or checked against it: the server, the API, the SDK, the CLI, the MCP server, the docs, the
infrastructure, and later the Solidity and the portal. Architect scaffolds blanks where behaviour goes, for agents to
fill, and it proves every operation from its telemetry with built-in evals, in every environment.

It is opinionated, and in exchange the code is measurable, hill-climbable, monitorable and auditable:

- Every operation has nine evals, a budget, declared errors and events **before** its handler exists.
- Instrumentation can't be skipped. The generated wrapper makes every operation, and every declared step inside it, an
  OpenTelemetry span. So investigating and debugging are mechanical, and an agent can climb a handler from red to green
  by running `architect prove` until every eval passes.
- A change sends exactly what depends on it back round. `architect impact` says what a change puts back in doubt.

The work runs in two loops. **Design:** ideate, spike and specify until the blueprint has no blanks. **Build:** build,
test (climb the evals), deploy (promote through environments provisioned from code), and watch (the same evals on the
running system).

The blueprint is a foundation for other tools. The portal and the agent fleet you build are the first two.

Everything runs on Cloudflare. Locally that means real workerd (Miniflare) with real D1, Durable Objects and R2, plus
Docker for the OpenTelemetry Collector. **Nothing is faked or mocked** (Aaron: "local but not fake"). The cloud is one
later pass, behind config switches.

---

## 2. Vocabulary: each term once

| Term | Meaning |
|---|---|
| **blueprint** | The folder `blueprint/` in a project: typed declarations of what the system is. Code imports `Blueprint` from `@architect/blueprint`; the command is `architect`. |
| **thing** | A noun with an identity and fields (`Blueprint.thing`). It says where its state lives: `lives: "database"` (D1, the default) or `"actor"` (a Durable Object per instance); later, the chain. |
| **verb** | Something done to a thing. Two kinds: an **operation** (`Blueprint.operation`: payload in, answer out, declared errors, maybe a move, a handler you write) and a **read** (`Blueprint.read`: no move, no handler, answered from records). A verb's name is its path: `blueprint/things/allowance/verbs/spend.ts` is `allowance.spend`. |
| **machine** | A thing's states and the moves between them (`Blueprint.machine`). Each move says `from`, `to` (several outcomes allowed) and the event it `emits`. The refusal "you can't do that from this state" is generated: `<Thing>NotActive`. |
| **journey** | A short story through real operations, played by a cast of principals from a starting world, with checks on answers, events, refusals and spans (`Blueprint.journey`). Journeys are written by a different agent from the builder. |
| **eval** | A rule checked against the evidence a run leaves (spans, logs, journal). Nine are built in (listed below). A tenth, "on time", arrives with layer 5. |
| **world** | One running copy of an environment, made for a purpose and destroyed afterwards. A world is a Durable Object with its own clock, destroyed by its own alarm at expiry. |
| **environment** | A place the application runs, one file each in `blueprint/environments/`: `local`, `test`, `staging`, `production`. |
| **verdict** | All of an operation's evals together, at one revision, in one environment: `{revision, environment, operation, verdict: "pass"|"fail"}`. Only CI writes one, signed with an OIDC token. |
| **logbook** | `@architect/logbook`: the small Worker each project runs to keep verdicts and releases (in a Durable Object) and each revision's compiled model (in R2). State lives here, not in git. |
| **generator** | Code that writes files from the blueprint. Scaffold generators (`architect add …`) write once, with blanks, and the file is yours after. Output generators write `generated/`, rewritten every run and never edited. |
| **target** | A language the blueprint writes into: Effect always (`target-effect`); Solidity once a thing lives on chain (`target-solidity`, layer 4). |
| **host** | Where the generated code runs: `host-cloudflare` (Workers, Durable Objects, D1, R2, alarms, workerd locally). |
| **kit** | Existing packages wrapped behind a primitive Architect declares, from the standard library `@architect/std` (layer 3). A kit arrives finished, with no blanks. |
| **portal** | The whole blueprint's site, docs included: every thing and operation with its own page, each machine walked through its events, which journeys use which operation, what is proven where and by which evals, what is stale and why. Generated per project, supplied by Architect, read only apart from answering asks. **You build it.** |

The nine evals, exactly as `packages/prove/src/modules/evals/README.md` names them:

1. **answer shape**: every answer decodes against its declaration, and no secret or private value appears in any span,
   log or journal entry.
2. **declared errors**: every refusal is one the operation declares, and it carries the model's code (`[AL-001]`).
3. **machine path**: every move ends in a declared state, and the stored state matches.
4. **events**: every move that happened journalled its event.
5. **who may call**: decided beforehand from the world's facts and `allowed`; a caller without the role is refused.
6. **steps**: every declared step of an answered call ran in its own span, in declared order.
7. **performance**: p50 and p95 against the budget. Over 1.5 times the budget is a review line, never a failure.
8. **coverage**: every operation, move, outcome and declared error is reached by some journey or starting world.
9. **explainability**: every declared refusal has a log inside the operation's span.

---

## 3. The worked example: acme's allowance

`examples/acme` is the reference project. Read it on `origin/layer/3`. The idea: an owner lets a member spend some of
the organisation's money each month, up to a limit. A project has three folders, named for who writes them:
`blueprint/` (what the system is), `src/<thing>/<verb>.ts` (how it does it: the handlers), and `generated/` (everything
Architect builds; never edited). The one loose file is `architect.config.ts`.

The thing, `blueprint/things/allowance/thing.ts`:

```ts
export const Allowance = Blueprint.thing({
  description: "Money a member may spend from their organisation, up to a limit each month.",
  fields: { id: Blueprint.id("alw"), organization: Organization.fields.id, member: Person.fields.id, limit: Amount, spent: Amount },
});
```

Its machine, roles and errors (`machine.ts`, `roles.ts`, `errors.ts` beside it):

```ts
export const machine = Blueprint.machine(Allowance, {
  states: ["active", "exhausted", "revoked"],
  moves: {
    grant: { from: [], to: "active", emits: Events.AllowanceGranted },
    spend: { from: ["active"], to: ["active", "exhausted"], emits: Events.AllowanceSpent }, // two outcomes
    revoke: { from: ["active", "exhausted"], to: "revoked", emits: Events.AllowanceRevoked },
  },
  notFrom: { exit: 40 }, // generates AllowanceNotActive
});
export const grantee = Blueprint.role(Allowance, { rule: (allowance, principal) => allowance.member === principal.person });
export class AllowanceExceeded extends Blueprint.error({ remaining: Amount }, { exit: 41 }) {}
```

An operation, `blueprint/things/allowance/verbs/spend.ts`:

```ts
export default Blueprint.operation(Allowance, {
  description: "Spend from what is left of this month's allowance.",
  payload: { allowance: Allowance.fields.id, amount: Amount, memo: Memo },
  answer: { remaining: Amount },
  move: machine.moves.spend,
  errors: [AllowanceExceeded],
  allowed: [grantee],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  idempotent: "request", // retried with the same request key, it spends once
  budget: { p95: "150 millis" },
});
```

The handler the builder fills, `src/allowance/grant.ts` (scaffolded once, then yours):

```ts
// Scaffolded from blueprint/things/allowance/verbs/grant.ts. Yours from now on.
const grant: Handler = ({ organization, member, limit }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* records.find(Organization, organization);
    const cap = typeof found?.["cap"] === "bigint" ? found["cap"] : 0n;
    if (limit > cap) {
      yield* Effect.logInfo("the limit is over the organisation's cap");
      return yield* new AllowanceLimitTooHigh({ cap });
    }
    const allowance = yield* Ids.of(Allowance.fields.id);
    yield* steps.insert(records.insert(Allowance, { id: allowance, organization, member, limit, spent: 0n }));
    yield* move("active");
    return { allowance };
  });
```

A journey, `journeys/spend-within-allowance.ts` (journey-author file; builders never edit it):

```ts
export default Blueprint.journey("spend within an allowance", {
  cast: { olga: grantee },
  starts: "funded",
  steps: (s) => [
    s.step("olga spends some",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 120n, memo: "train" }),
      expect((a) => a.remaining).toBe(380n),
      emits(AllowanceSpent, { allowance: s.world.allowance, amount: 120n, memo: "train", remaining: 380n }),
      spans({ present: ["allowance.spend", "allowance.spend.load", "allowance.spend.record"] })),
    s.step("olga can't spend more than is left",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 400n, memo: "hotel" }),
      refuses(AllowanceExceeded, { remaining: 380n }), noEvents()),
    // … spends the rest (exhausted), then the machine refuses
  ],
});
```

The walkthrough in `design/docs/index.html` has 22 steps over five layers. The ones you need, with real commands:

1. `npx create-nx-workspace acme --preset=@architect/preset`, then `pnpm architect check`.
2. `architect spike allowances`: `spikes/` is never built.
3. `pnpm architect add thing allowance` writes the thing's files with `Blueprint.todo(...)` blanks; `check` fails until
   they are filled.
4. to 6. Fill the machine, errors and roles; `architect add operation allowance.grant allowance.spend allowance.revoke`,
   `architect add read allowance.get`; `check` says "ready to generate".
7. `pnpm architect generate` writes `generated/api`, `sdk`, `cli`, `docs`, `server` and scaffolds `src/allowance/*.ts`.
8. `pnpm architect brief allowance.spend` prints the job: the file to fill, what to read, what not to touch, and what
   "done" means ("these journeys pass locally; all 9 evals green").
9. Journeys and starting worlds (`blueprint/starting-worlds/funded.ts` seeds by running declared operations).
10. `pnpm architect prove --env local` prints `allowance.spend  9 evals ✔  p95 12ms  budget 150ms` per operation and a
    coverage line.
11. A push: CI runs `prove --env test` in a fresh world `test-<id>` and posts signed verdicts to the logbook.
12. A change: adding `allowance.list` gives `impact new read · minor · stale none`, `next 1.1.0`.
13. `architect promote --to staging`, then `--to production`: the exact built bundle, only with green verdicts.
14. `architect watch --env production`: p95 against budget, refusal counts, drift.
15. to 22. Kits (layer 3), the allowance on chain with Solidity (layer 4), and time moves with a keeper (layer 5).

acme today: 8 things (allowance, api-key, invitation, membership, organization, person, session, system), 15 verbs,
11 journeys, starting worlds `founded`, `funded`, `invited`. The compiled model is
`examples/acme/generated/model/model.json` (keys `refusals`, `values`, `things`, `operations`, `environments`) and
`edges.json` (`{from, to, kind}`, kinds refers, reads, acts-on, allowed-by, emits). Types:
`packages/compiler/src/modules/model/types.ts`. **This model and the logbook are your only data sources.**

---

## 4. Where everything stands (16 November 2026)

Layers: 1 declare and call; 2 prove and ship; 3 reach out; 4 on chain; 5 time. Each ends in a gate. (The build plan
numbers steps `L1.*` for layer one, `L2.*` for layer two; the goal calls its slices "stages", so stage 3 is Gate 2.)

- **On `main`:** stages 1 and 2, Gate 1 passed. Packages: `blueprint`, `compiler`, `cli`, `target-effect`,
  `host-cloudflare`, `generators`, `prove`, `lint`, `preset`. `architect prove --env local` in acme prints every eval ✔
  in about 6 seconds and leaves nothing running. Design records H1, H2, O1 are merged.
- **On `layer/3` (the conductor's, in flight):** L2.01 build and environments, L2.02 test worlds, L2.03 the logbook,
  L2.04 versions and staleness, L2.05 promote, L2.07 device sign-in, L2.P privacy seams, L2.L the `src/<thing>/<verb>.ts`
  layout. Still to do there: L2.06 publishing, L2.08 remote MCP with OAuth, L2.09 watch, L2.O local trace viewer,
  **L2.10 the portal (now yours)**, L2.11 Gate 2.
- **Commands that exist:** `architect model | dev | prove [--env local|test] | promote --to staging|production |
  add thing|operation|read|journey | check | generate | brief <op> | impact | version --next | build |
  env up|down|status <env> | worlds reap`. No `watch`, `mcp` or `portal` yet.
- **The logbook's routes** (`packages/logbook/src/modules/http/types.ts`): `GET /health`, `POST /verdicts`,
  `GET /verdicts`, `GET /verdicts/latest`, `PUT /models/<rev>`, `GET /models/<rev>`, `POST /releases`,
  `GET /releases/latest`. Writes need an OIDC token; reads are open. It stores aggregate verdicts, not per-eval rows.
- **`packages/portal`** is a stub (`export {};`). No generated portal output exists. The Gate 2 check
  `e2e/layer2/08-watch-and-the-portal.test.ts` is written and red.
- **The front end design (F1)** is done and open as pull request 12, branch `origin/design/frontend`:
  `design/decisions/F1-frontend.md` plus a static spike in `spikes/frontend-dx/`. It proposes the data contract
  (`generated/portal/blueprint.json`, a `PortalSnapshot` read from the logbook, an Effect read adapter on workerd),
  React Router in the browser, Fumadocs components for docs, and audits HeroUI Pro 3.2.x. **It never opened the Figma
  kits' canvases.** Start from it; don't redo it.
- **The agent harness (H1, H2)** is designed, not built: `design/decisions/H1-agent-harness.md`,
  `H2-agent-runs-and-benchmarks.md`, a second pass open as pull request 9 (branch `claude/design-agent-harness-e6e8ff`),
  build-plan rows A0 to A9. It wraps Pi Durable 1.5.0 (`@earendil-works/pi-durable`) behind an Effect seam in a new
  package `@architect/agent`. **It has no manager and no workers yet**: that is new, and yours (section 5, phase 6).

---

## 5. Your job, phase by phase

Each phase ends green with its own "done when" check, as one or more commits, with evidence under
`design/evidence/P<n>/` (command output as `.txt`, in the style of `design/evidence/L2.02/`). Loop generate, run, fix
until the check passes, then move on. Record every decision you make in `design/decisions/P1-portal.md`, numbered
(`P1 #1`, `#2`, …), with the evidence. Grade real forks on: floor-first, reversibility, blast radius, correctness, fit.

### Phase 0: set up without colliding

1. `git fetch origin`. Make a worktree on a new branch `codex/portal` from `origin/layer/3`.
2. Merge `origin/design/frontend` into it (F1's record and spike), so you build on F1.
3. Find the assets folder Aaron put next to you. Today it is `~/Desktop/gmx`. It holds:
   - `figma/HeroUI Pro Figma Kit V3-v1.0.5.fig` (web, **the one you use**) and
     `figma/HeroUI Pro Native Figma Kit-v1.0.3.fig` (native, reference only);
   - `zips/template-chat.zip`, `template-crm.zip`, `template-dashboard.zip`, `template-email.zip` (**the four you
     use**), and `template-crypto-wallet (2).zip`, `template-finances.zip` (ignore unless one solves a gap);
   - `.env` with `HERO_UI_PERSONAL_TOKEN` (your local installs) and `HERO_UI_CI_TOKEN` (for CI). **Read values by name
     only. Never print, log, copy or commit them.**
4. Unzip the templates **outside the repository** (into `~/Desktop/gmx/unzipped/` or your scratch folder). The
   repository is public. HeroUI Pro source, its Figma frames and screenshots of its templates are licensed, so they
   never enter git. Only your own notes, your own code and your own frames' exported images do.

**Done when:** `codex/portal` exists on origin, contains F1's files, and `pnpm install && pnpm nx run-many -t test`
passes on it as it does on `layer/3`.

### Phase 1: audit the components (run it as a sub-thread)

Spawn a subagent for this. It runs each of the four templates locally (`pnpm install` with the Pro token by name,
`pnpm dev`), screenshots every screen at desktop width in light and dark, and lists every HeroUI Pro and HeroUI
component each screen uses, with its import path and the template file it is in. Live demos for comparison:
`template-crm.heroui.pro`, `template-chat.heroui.pro`, `template-dashboard.heroui.pro`, `template-email.heroui.pro`.

What each template is for in the portal (Aaron's call):

- **CRM** is the backbone. Its rich data tables (filter, sort, owner, stage, display columns, bulk select, saved
  lists), its kanban of opportunities, and its tasks and meetings lists become the blueprint's tables: things,
  operations, evals and verdicts, journeys, environments, and the plan (milestones and tasks).
- **Chat** becomes the agent console, restyled toward Grok Bot (below).
- **Dashboard** gives the project home: stat cards, charts and a table (proven, stale, unproven, p95 against budget).
- **Email** only where its three-pane list-and-reader layout helps, such as an agent run's inbox of asks and reports.

**Take Grok Bot's UI elements, not its design patterns** (Aaron, 17 November). Grok Bot ("AI teammates that do real
work", iOS) is not xAI's Grok app. Aaron's link, the source of truth for how things look:
https://mobbin.com/apps/grok-bot-ios-c5e50da8-b7fc-423a-a264-5ea9c387d5ad/862b66ab-c959-4a0d-85ec-bdfe42eb2eb5/screens
(117 screens, and its Flows tab). Its flows are saved in the Mobbin collection "Architect: Grok Bot agent console":
https://mobbin.com/collections/28bfec56-d666-461c-b6e7-7eaa68f6335d/mobile/screens. Ignore the older collection
"Architect: Grok-style agent"; it holds xAI Grok screens.

The elements to borrow, as components:

- **The agent row**: avatar, name, a status dot, a chip for what it is on now ("Filling allowance.spend"), the last line
  and the time.
- **Message bubbles**: short, plain, the agent's avatar pulsing while it works.
- **The file chip and its sheet**: a named file with its size that opens in a sheet with real headings, tables and code.
  In Architect: a worker's filled handler, its brief, its verdict.
- **The lettered choice card**: a question with options A to E, the chosen one ticked, "dismissed" when ignored.
- **The authorize card**: a small card with one button, for asking for a key by name or for leave to deploy.
- **The system line**: one dim centred line for an event ("Task claimed by worker 2", "Milestone proven").
- **The long-press menu, the instructions editor, the search list** (rows labelled by kind) and **the composer** (plus,
  input, dictation, send).

Do not copy its patterns. **No group chats, no agents @mentioning each other, no routines, no conversation-per-bot
home.** The shape of Architect's agent side is fixed by Aaron:

- **One manager, a fleet of workers.** The manager does no work itself; it only manages. It plugs straight into the
  blueprint: it reads the plan (milestones and tasks, phase 5) and the model, hands each task to a worker, caps how many
  run at once, watches the verdicts, reassigns a failed task, and closes the milestone when every task is green.
- **Workers do the work**, one task each, and are never talked to as teammates.
- **The plan is the main view, not a chat**: a board of milestones and tasks. Draw it as a kanban whose columns are the
  task's states (open, claimed, climbing, proven, failed) with one swim lane per milestone, and the same data as a list
  grouped by milestone. A task card shows its operation, its variant, the worker on it (an agent row in small) and its
  evals as small ticks.
- **The person talks only to the manager**, in one console beside the board: to start a milestone, ask why something is
  red, or answer a worker's question (which the manager passes on as a choice card). The console uses the elements
  above; opening a task card shows the worker's live run (its steps, spans and evals ticking).

The other four templates' screens and other agent apps on Mobbin are not the reference for these elements. If the Mobbin
connector is available to you, pull more Grok Bot screens; if not, work from these.

Write the audit as `design/decisions/P1-portal.md` section 1: a table of view, template screen, components, and gaps.
Keep screenshots outside the repository and reference them by path.

**Done when:** every portal view in phase 2's list maps to named components or is a named gap, and the four templates
each ran locally with the token read by name.

### Phase 2: the information architecture and the screens, in Figma

Open the web kit in Figma. If it is not yet in Aaron's Figma account, ask him once to import
`HeroUI Pro Figma Kit V3-v1.0.5.fig` and send the file link, and carry on with phase 3 while you wait. Use the Figma
MCP. Build the frames from the kit's own components, filled with **acme's real generated data** (from `model.json`
and a logbook with real verdicts from `prove --env test`), never lorem ipsum.

The information architecture, as a sidebar like the CRM's:

- **Home**: what is proven, where, what is stale and why; p95 against budget; the latest release.
- **Records**: Things, Operations (verbs and reads), Evals and verdicts (one row per operation, a column per eval,
  per environment), Journeys, Starting worlds, Environments, Releases (versions from the model diff).
- **Plan**: the board (a kanban with task states as columns and one swim lane per milestone, or the same as a list
  grouped by milestone), Tasks, saved lists ("stale in staging", "red evals", "no handler yet").
- **Agents**: the manager's console beside the board, Runs (a table of every run), Fleet (the manager and its workers,
  live).
- **Docs**: the generated MDX docs, inside the same shell.

Detail screens (a thing's page, an operation's page) are generated per project from the model, so design one template
of each, filled with acme's `allowance` and `allowance.spend`: fields; the machine walked through its events; payload
and answer as type tables; errors with codes and exit codes; who may call; the journeys that use it; its nine evals and
verdicts per environment; its traces (O1's `TraceSource`); its budget.

The two-way loop must be drawn: a person selects rows in a table, makes a milestone, launches a manager; a change asked
for in the portal becomes a blueprint change an agent makes in a pull request, which comes back through `prove` before
it shows as proven. The portal never edits the blueprint or writes a verdict itself.

**Done when:** frames exist for home, the operations table, an operation's page, a thing's page, the milestones board,
the agent console, a run, and the fleet; their links are in `P1-portal.md` section 2; and Aaron has seen them (report
and wait for his word only on this phase, carrying on with phase 3 meanwhile).

### Phase 3: Fumadocs inside HeroUI (a spike)

The generated docs become MDX so Fumadocs can render them. Prove the mix in `spikes/fumadocs-in-heroui/` (throwaway
code, on a `spike/fumadocs-in-heroui` branch, with a README: question, tried, found, the decision it supports, open
risks; merged into `main` for the record; never imported by packages). Use Fumadocs' headless core and its UI
components (table of contents, search, code blocks, tabs, callouts, type table) inside a HeroUI shell, with Fumadocs'
styles scoped so the two don't fight and one Tailwind 4 theme shared. MDX compiles at build time; nothing executes
project code in the browser.

**Done when:** the spike renders acme's `allowance.spend` page as MDX inside the HeroUI shell, with payload and answer
in a Fumadocs type table built from `model.json`, in light and dark, and the README says yes or no with the rules.

### Phase 4: the portal (build-plan step L2.10)

Build `@architect/portal` and the generated `generated/portal/` output, on F1's data contract (adjust it where phase 2
or 3 proved it wrong, recorded in `P1-portal.md`). Rules:

- It reads only generated data and the logbook, never project source, git or the compiler at run time.
- It stays fresh by itself: pages from `architect generate`; proof, staleness and runs live from the logbook's Durable
  Object (poll or subscribe; your call, recorded).
- React Router in the browser, an Effect read adapter on workerd, Fumadocs for docs, HeroUI Pro for the face.
- `architect env up <env>` serves it at `/portal`; `env down` leaves nothing running.
- Generators emit the docs as MDX (`generated/docs/<thing>/<verb>.mdx`) and `generated/portal/`. This touches
  `packages/generators`, which the conductor also edits: keep your change in a new module
  (`packages/generators/src/modules/portal/`) and one line in the render list.
- HeroUI Pro installs in CI with the `HERO_UI_CI_TOKEN` secret, by name. Decide and record how a project without a Pro
  licence gets a portal (for example the open HeroUI components as the fallback), because generated projects are other
  people's.

**Done when:** L2.10's check passes: "The deployed portal shows `allowance.spend` with `test ✔ staging ✔`, and after a
budget edit, `stale` on spend only", and the portal half of `e2e/layer2/08-watch-and-the-portal.test.ts` passes
unedited. Then open a pull request from `codex/portal` into `layer/3`, run the 🔍 reviewer on it, and merge when CI is
green and the review passed.

### Phase 5: the plan as blueprint things

Aaron's original intent: the way work gets done is codified as blueprint things (goal, milestones, tasks, runs). No
decision or build-plan row exists for this yet: you make it, in `P1-portal.md`. The shape to start from:

- Don't add new declaration kinds to `@architect/blueprint` (the conductor owns it). Instead, **dogfood**: a new
  Architect project, `examples/workbench`, whose own blueprint declares `milestone`, `task` and `run` as things, with
  machines (a task: `open → claimed → climbing → proven | failed | abandoned`), errors, events, roles and journeys.
  Its generated server runs on Cloudflare with `lives: "actor"` where a Durable Object should own the state.
- A task is derived from a target project's model: one per operation and variant (H2 names the variants `blank`,
  `isolated`, `repair`, `review`). Its context falls out of the declarations: what to build, its errors, events,
  journeys and evals, and what "done" means, exactly as `architect brief <op>` prints it today.
- Plan declarations are reviewed code; observed state (claimed, climbing, proven) lives in the workbench's Durable
  Objects and the logbook, never in git.
- The portal shows the plan from the workbench's generated model and state, in the CRM-style tables and kanban.

**Done when:** in the portal, a person filters acme's operations, selects three, makes a milestone, and sees three
tasks whose briefs match `architect brief` for each; `architect prove --env local` passes all nine evals for every
workbench operation; and its journeys were written by a different agent from you (a subagent with no access to your
handlers).

### Phase 6: the manager and the workers

Build `@architect/agent` along H1 and H2 (rows A0 to A6, in that order), then add what they don't have:

- **A worker** is one durable Pi run on one task, in its own Durable Object (H1: SQLite storage, `onWake` on the
  object's alarm, clock and timers injected). Its tools are derived from the blueprint's operations and the `architect`
  commands; it fills only the handler `architect brief` names, and it loops `check` and `prove` until the nine evals and
  the journeys pass, or it gives up and says why.
- **The manager** is its own Durable Object per milestone. It does no work itself: it reads the milestone's tasks from
  the plan, hands each to a worker, caps how many run at once, watches their verdicts, reassigns a failed task once,
  and marks the milestone proven only when every task's verdict is green.
- **The board and the console**: the plan board (phase 2) moves cards across columns as workers claim, climb and prove
  tasks; the console beside it is the HeroUI chat template built from Grok Bot's elements (phase 1), where a person
  talks only to the manager. Opening a card shows that worker's run, each eval ticking green, every step linked to its
  span (one trace with the world's).
- Runs are scored by `check` and `prove` (H2.7: untampered, `check` ✔, the nine evals and journeys ✔). The CI bench
  uses H2's `oracle` and `null` runners with no key.

Defaults for H1's four open questions (Aaron agreed to the recommendations; record them as P1 decisions): Command Code
is commandcode.ai through `pi-ai`; keys are read by name only (`ANTHROPIC_API_KEY`, `COMMANDCODE_API_KEY`); free models
first (`glyph-cluster:free`, `inkling-2-small:free`); the sandbox is a copy of the project on this machine, then
Docker (A7).

**Done when:** from the portal, a person selects three acme operations with emptied handlers into a milestone, launches
the manager, watches three cards cross the board as three workers run in parallel, and sees the milestone turn proven with a fresh
verdict per operation; evicting a worker's Durable Object mid-turn resumes it from its alarm; and in CI the same flow
passes with the `oracle` runner and no key.

---

## 6. How you avoid colliding with the main line

- Work only on `codex/portal` (and `spike/*` branches). **Never push to `layer/*` or `main` directly.** Never edit the
  conductor's files: the other build-plan steps, `design/handoff.md`, `design/decisions/D3.md`.
- Merge `origin/layer/3` into `codex/portal` at the start of every phase and at least once a day. After merging
  generator code, run `pnpm nx reset` before `nx sync`, and run Nx with `NX_DAEMON=false`.
- Use the blueprint and the generated model as they are. If you need a change in `blueprint`, `compiler`, `prove` or
  `logbook`, keep it as small as you can, in its own commit, and name it in your report so the conductor can take it.
- L2.10 is yours. The conductor will skip it. Your phase 4 pull request goes into `layer/3`. Phases 5 and 6 are a side
  track like A0 to A9: they land by pull request into `main` once Gate 2 is on `main`, or into `layer/3` if the
  conductor asks.
- Ports: use 8970 to 8999 for anything you run, so you never take the conductor's.

---

## 7. The rules (from `AGENTS.md`, binding)

- **Effect everywhere**; no `async`, `await`, `try`, `throw`, `Date.now`, `new Date()`, `setTimeout` or plain
  `Effect.sleep` outside named entry files. Every wait goes through `Timers`; all handler, workflow and keeper work is
  counted work.
- **Names come from paths and exported identifiers**; a declared name is never written as a string outside
  `generated/`.
- **Generated files open with a `// Generated from … Do not edit.` line** (naming the blueprint or the declaration's
  path; after a shebang when there is one) and are never edited, except an ABI adapter's `src/generated/` written by
  hand to `--from-abi`'s shape until its first run overwrites it (CX-from-abi). Scaffolds start with
  `// Scaffolded from <path>. Yours from now on.`
- **Package rules** (Nx module boundaries): `blueprint` depends only on Effect; generated code imports only the
  target's runtime, `blueprint`, the host and project code; `compiler` and `generators` never run in production.
- **Pin dependency versions exactly, and use versions published at least two weeks before you add them.** pnpm's
  `minimumReleaseAge` enforces this tree-wide.
- **Inside each package, `src/` follows the six-slot module shape**: `main.ts` as the only entry file;
  `modules/<name>/{README.md, types.ts, service.ts, internal/, <name>.test.ts}`; no module imports another module's
  `internal/`; no source file over about 250 lines.
- **Journeys and checks come first.** A different agent from the builder writes an operation's journeys and checks, and
  they fail on empty handlers before the builder starts. **A builder never edits journeys, the evals or the runner's
  generic checks.** Use a separate subagent as the journey author for the workbench.
- **Real, not fake.** Real workerd, D1, Durable Objects, R2, Docker, Verdaccio, a real OIDC issuer, a real Collector.
  No mocks.
- **Layers and gates.** Nothing in a layer starts until the previous layer's gate passes on `main`. Ideas for later
  layers go in `design/later.md`, never into code.
- **Spikes** live under `spikes/<name>/` on a `spike/<name>` branch, end with a README, are merged into `main` for the
  record, and are never imported by packages.
- **Decisions** are recorded with their evidence. Don't reopen one without new evidence.
- Spend at most **$10 a day** on cloud resources and models, across everything (the bench's own cap is $5). Phases 1 to
  4 need no cloud.
- **Every world, stage and site you make is destroyed; nothing is left running.** Touch only your own resources.
- **Never print a key or connection string, or write one to a file or a commit.** Never create a cloud credential
  without Aaron's written yes.
- Keep people's emails and personal details private.
- For plants, back up with `cp` and restore with `cp`, never `git checkout`.
- Merge your own pull requests when CI is green and a 🔍 reviewer subagent passed them. Push on until truly blocked.

---

## 8. Read first, in this order

All from `origin/layer/3` unless named (`git show origin/layer/3:<path>`, or read your worktree after phase 0).

1. `AGENTS.md`, then `.agents/skills/threads/SKILL.md` ("Talking to Aaron") and `.agents/skills/reviewer/SKILL.md`.
2. `design/handoff.md`: where everything stands.
3. `design/docs/index.html` in a browser: the concepts page and the walkthrough, steps 1 to 22.
4. `design/decisions.md`, then `design/decisions/` D1, D2-stage-two, D3 (#14 commands, #15 Gate 2's eight checks), G1,
   O1, N1, H1, H2.
5. `design/build-plan.md`: L2.10, L2.11, A0 to A9, and what layers 3 to 5 add.
6. `design/history/spec-drafts.md` section 6 ("The portal") and `design/history/blueprint-context-pack.md` section 1:
   Aaron's original intent.
7. `design/briefs/F1-frontend.md`, then F1's record on `origin/design/frontend`: `design/decisions/F1-frontend.md` and
   `spikes/frontend-dx/`.
8. The code: `packages/blueprint/src` (every declaration kind), `packages/compiler/src/modules/model/types.ts`,
   `packages/generators/src/modules/render/service.ts`, `packages/prove/src/modules/evals/README.md`,
   `packages/logbook/src/modules/http/types.ts`, `examples/acme` (blueprint, `src/`, `generated/model`, `journeys/`),
   `e2e/layer2/08-watch-and-the-portal.test.ts`.

---

## 9. When you are blocked

Decide for yourself everything the repository can settle (AGENTS.md, "Who decides"). Come back to Aaron only for:
money beyond the cap, a credential, the Figma link (phase 2), production, something outward-facing or irreversible,
or a fork where the goal itself is unclear. Batch those questions in one report.

---

## 10. How to report

Report at the end of each phase, and whenever you are blocked.

- **To Aaron, first, for the ear.** He listens through text-to-speech. Short, plain sentences: the answer first, then
  why, then what waits on him. No tables, no code blocks, no arrows, slashes or emoji mid-sentence. Decisions as a few
  numbered options with your recommendation first. Put numbers, links, branch names and commands at the end, after
  the spoken part.
- **Then, for the conductor, exact and complete:** the phase, the commits, the pull request link, the evidence folder,
  the decisions added (`P1 #n`), any change you made outside your own files and why, and what is not done or not
  verified.
