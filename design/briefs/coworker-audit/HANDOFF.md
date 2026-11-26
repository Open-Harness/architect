# Handoff: rebuild Coworker on Orthograph, as a fast experiment

For the agent that takes this over (Aaron is running it in Codex). Written 26 November 2026 by the 📐 designer thread
that audited Coworker (pull request #1179). Read this file first, then `AGENTS.md`, then the files it points to.

## How to start

Paste this as the opening message:

> You lead the Coworker experiment. In `Open-Harness/orthograph`, read `AGENTS.md` and
> `design/briefs/coworker-audit/HANDOFF.md` (on branch `design/coworker-audit`),
> and run it. Start with step 0.

## What Aaron decided

All on 26 November 2026, in the designer's session unless marked. These are his words; follow them.

1. **Rebuild Coworker on Orthograph, and replace everything that works.** "it needs a front end, it needs to replace
   everything that works currently in the vibe coded version" (relayed by the thread that started the audit).
2. **The agents are Pi Durable, and each agent is an actor, following Pi's own patterns.** "they need to be actors and
   they should follow the same pattern from pi durable and its examples in the repo."
3. **Headless, not our UI library.** "i dont want the whole ui library i only want headless componnets that work with
   any library like astryx." Orthograph generates hooks and headless state; Coworker's own Astryx components draw
   everything. This replaces the audit's earlier "rebuild every screen on Orthograph's components".
4. **A fast experiment on a fork branch.** He asked: "can this be done on its own fork like a faster experiment fixing
   the things in the framework as its going not waiting on ci for merging and sprinting to the end", then "give me a
   proper handoff ill do it in codex instead". So: one branch, framework fixed inline as you go, no CI wait between
   steps. The rules that still hold are under "The rules on the branch".
5. **Earlier, relayed as "agreed on all"** to the audit's recommendations, which are listed in the README's last
   section: the built screens are the authority for what works, and his agreed screens (`docs/screens.md` in Coworker)
   for the board, the task, the manager tree and the agents; his look kept exactly; the rebuild lives in this
   repository; on, ask or off as Coworker's own guard first; a task keeps both its lane and what happens next; a worker
   is a saved agent (a role) with versions; a person's own permission changes stay; a connector's own view waits.
6. **The agent's login is Better Auth.** He asked "dosnt better auth have something": it does, and it is already wired
   (step 4).

**Not decided, and not yours to decide:** whether "the canvas" Coworker's findings mention is a real file the screens
must follow (ask Aaron when the board or task page is reached), and the framework's long-term answer for live updates
(poll for now).

## What exists, and where

| What | Where |
|---|---|
| The audit: what Coworker is, what works, every module, the gaps, the end-to-end proposal | `design/briefs/coworker-audit/` in this repository: `README.md`, `inventory.md`, `end-to-end.md`, `agents.md`, `map.md`, `audit.md`, `front-end.md`, `board.html` |
| A first blueprint sketch (does not compile; 8 of about 25 nouns) | `design/briefs/coworker-audit/blueprint/` and `web/` |
| Coworker itself, public, read-only | `https://github.com/Open-Harness/Coworker` at `58f1f0e`; package `pi-exp`. Its intent: `docs/first-principles.md`, `docs/model-next.md`, `docs/screens.md`, `docs/github-journey.md`; what is broken: `docs/findings.md` |
| Pi Durable, public, read-only | `https://github.com/earendil-works/pi`, `packages/durable/`: `README.md`, `docs/spec.md`, 48 examples in `test/examples/`, a Durable Object wiring in `test-workers/worker.ts` |
| A draft agent runtime to borrow from, not to merge | pull request #781, branch `goal-17/s9-agents-build`: `packages/agents/src/modules/resident/` (`agentActor`), the stand-in model, the sandbox |
| A draft outbox, optional here | pull request #905, branch `goal-17/s9-outbox-build` |
| The superagent's plugins: intake (triggers, gate, policy, threads, accounts) and tickets | `examples/superagent/plugins/` on `main` |
| Generated actions per operation, with refusals and `needsApproval` | `packages/orthograph/src/modules/actions/`, `examples/plugged-in/generated/actions/` |
| Sign-in with Better Auth, API keys, agent keys | `packages/host-cloudflare/src/modules/auth/` |
| The actor store | `packages/host-cloudflare/src/modules/actors/service.ts` |

Coworker, run here with fakes and no credential: typecheck, build, 616 of 616 fast tests and 65 of 65 browser tests
pass. Its own finding F23: "81 of 81 passed with all of the above true", so its green score proves little on its own.

## The goal, and the one check that says it is done

Every screen and flow that works in Coworker today works in the rebuild, on Astryx over Orthograph's generated headless
hooks; managers run workers as actors on Pi Durable; and a worker's report wakes its manager, which Coworker never did.

**Done when** both ratchet folders are empty: `e2e/coworker/expected-failing/` (Coworker's 36 flow files as journeys,
plus the agent journeys below) and `e2e/coworker-parity/expected-failing/` (its 20 Playwright specs, ported), and each
finding in Coworker's `docs/findings.md` that is about something kept has a check that passes.

## The plan

Work on a branch `experiment/coworker`, cut from `main`. Each step ends with a check you ran and its output.

**0. Set up.** Clone Coworker and Pi read-only beside this repository. In Coworker: `pnpm install --frozen-lockfile
--ignore-scripts`, `pnpm typecheck`, `pnpm exec vitest --run`, `pnpm build`, then its Playwright suite against
`scripts/serve.ts --world fake` (point Playwright at the preinstalled Chromium if there is one). Keep the results, and
the 340 screenshots from `test-results/shots/`: they are the parity reference.

**1. Map the whole model first.** This is the real gap. Write `examples/coworker/blueprint/` with every noun the
screens imply, its fields, its machine and its operations, until `ortho check --root examples/coworker` passes.

The nouns, from `inventory.md` and `audit.md`:
- Getting in and people: workspace, person and handle, member and role, invite, join request.
- Managers and work: manager (with `above`), lane, field, task (lane plus "what happens next", done-when, evidence),
  comment, run (one per worker instance), ask (approval, question, notice, join request), grant.
- What comes in: trigger, thread and event (from `intake`), account and connector.
- What managers use: saved agent with versions, skill with versions, environment, model connection, secret (names
  only), template.
- Memory: note and rule.
- Money and the log: usage, billing, and the audit (Orthograph's own journal and traces).

Start from the sketch in `design/briefs/coworker-audit/blueprint/` and the decisions above. Leave out what exists only
for the old code (the list is in `blueprint/README.md`). Write down, in `examples/coworker/GAPS.md`, everything the
blueprint cannot say. That list is what the framework fixes are.

**2. The loop by hand.** `Manager`, `Task`, `Run`: make a manager, add a task, start a run, report, finish. People play
both parts. Journey: `e2e/coworker/01-the-loop-by-hand`. No framework change.

**3. An agent is an actor with its own Pi harness.**
- The `Agent` thing already lives as an actor (`packages/agents`); `agent.tell` and `agent.close` are blank handlers.
- Add a hook to the host's actor (`packages/host-cloudflare/src/modules/actors/service.ts`) so code runs after a
  commit. #781 added `committed(entries)`.
- In the actor: open `Harness.open(await openDurableObjectSqliteStorage(ctx.storage), …)` inside
  `blockConcurrencyWhile`. A committed tell becomes `root.submit({ type: "input", content, requestId, whenBusy:
  "steer" })`. A turn's end becomes `agent.idled` and its event.
- Drive Pi's timers from the Durable Object's alarm, and arm the alarm before any call that starts work. This is Pi's
  own rule; see `test-workers/worker.ts`.
- References: Coworker's `src/modules/manager/internal/engine.ts` and `alarm.ts` (working, about 80 lines), and #781's
  `resident` module.
- Use Pi Durable **1.6.0**: it is older than the three-day rule. Use 1.6.1 once it is three days old; it renamed
  `submit(tx, …)` to `admit`.

**4. The agent's own login, with Better Auth.**
- The host already runs Better Auth's API-key plugin with metadata on (`auth/internal/options.ts`).
- A key whose metadata says it acts for an agent already becomes an agent caller (`auth/service.ts`, `markOf` and
  `principalFor`), but an agent *acting for a person*: `{ kind: "agent", person }`.
- Add the agent's own id to that metadata, and map it to the caller `{ kind: "agent", agent }`. The role
  `Blueprint.role(T, { agent })` already checks that caller (`packages/language-effect/src/modules/access/service.ts`).
- Each agent's key is made when its `Agent` is opened, and kept as a secret the actor reads.
- Today this caller exists only in test worlds (`auth/internal/world-token.ts`).

**5. Tools are the generated SDK.** Each Pi tool calls one generated SDK operation with the agent's key. The
generated MCP server already lists every operation as a tool, with its schema. A tool that is "off" in the agent's
grants is not offered (Pi `configure`, remove tools). One rule, from Pi's own spec ("a parked call keeps its run
busy") and K46: **a tool never waits for another agent or a person.** It writes a run or an ask and returns at once.

**6. Agent to agent.**
- A thing keeps the record of what is awaited: a `Run`, an `Ask`.
- The other agent hears through a tell with the record's id as `requestId`, which Pi takes once per conversation.
- Delivery from inside an actor is a Pi background task that calls the other actor's tell and retries until it is
  accepted. That is Pi's example 22, the reporter. You do not need #905's outbox for this.
- A report becomes the manager's follow-up input, `onAbort: "keep"`.
- Stop is a close, which aborts the conversation inside the worker's own harness.

**7. The loop by agents.** Step 2's journey with the people taken out, on a scripted model (#781's
`stand-in-model`, or Pi's faux provider as Coworker uses it). Then: kill the actor mid-turn and it still ends; a
worker's model goes silent and its run ends, not "running for ever". Journey:
`e2e/coworker/02-one-manager-one-worker`.

**8. Headless hooks, generated.**
- Per thing: `use<Thing>(id)` gives its state, the fields this caller may see, the moves open now (`can`), and what
  it waits for (`needs`).
- Per operation: `use<Operation>()` gives `run`, `pending`, `refusal` (typed, from the generated action),
  `needsApproval`, and the answer.
- They are React hooks over the generated SDK and actions, with no UI library: `generated/web/` imports only
  `orthograph`, the SDK, the actions and `react`.
- A read reloads after any write on a thing it shows. Polling is fine for now: Coworker polls chat every 0.6 s, the
  board every 3 s.
- This is K46 call 9, "a reference per thing", spelled as hooks. K29's UI SDK pieces are not used.

**9. Port the screens.**
- Coworker's screens already come apart. Each `team-*` module talks to the server through one
  `createXApi(server)` interface. Replace each interface's body with the hooks. The Astryx components stay.
- Routes are kept, so its Playwright specs find the same pages.
- Do the inbox and the question page first. The task page and the board are drawn again, not ported: Aaron's findings
  F25 to F38 reject them.
- After each screen, put the old screenshot beside the new on one page.

**10. Then, in this order:**
- Ask and grants.
- A manager above a manager.
- Getting in and settings.
- Hearing the world: mount `intake` and the GitHub adapter from `examples/superagent/plugins`; write an email adapter
  and its door in the app, with Coworker's ten email flows as its checks.
- Keys and the vault: lift Coworker's `src/modules/vault`.
- The charts.
- Sandboxes and billing.
- Last, once, a real model and a real repository on staging. That needs Aaron's written yes for the credentials.

## The rules on the branch

Relaxed for this experiment, by Aaron's call:
- No waiting on CI between steps. Run the checks yourself.
- One lead does authoring and building. Keep journeys and the code they judge in separate commits anyway, so a
  reviewer can tell them apart later.
- Change framework packages inline. Put each framework change in its own commit with a message starting
  `framework:`, so it can be lifted into a proper pull request later.

Still holding, from `AGENTS.md`:
- Effect rules inside `packages/` and handlers (no `async`, `await`, `try`, `throw` or wall clock there). Screens and
  React hooks are browser code.
- Pin versions exactly, three days old.
- Never print or commit a key; never create a cloud credential without Aaron's written yes; at most $10 a day.
- Never connect to Aaron's computer.
- **Never push to `main`** or to another goal's branch.
- Merge `main` into the branch, never rebase. Merge it often: Goal 16 (Capxul) changes `access`, `store` and the
  outbox paths every day.
- Coworker's own stories are the judge, not an agent's review alone (F23).

## Facts that will save you time

- **Pi keeps a parent and its children in one harness.** Nothing in Pi joins two harnesses. With each agent an actor,
  agents talk the way a webhook talks to Pi: a submission with a `requestId`, or a signal (examples 39, 40).
- **A parked tool call keeps its conversation busy** (Pi's spec, section 12). That is Coworker's finding F68.
- **An actor cannot be listed.** Lists of managers, runs and asks are reads over rows in the database. The actor holds
  only the conversation, and its turns end by writing an event that updates its row.
- **A request key on an actor's operation does not hold yet.** For tells, Pi's `requestId` covers it.
- **Pi Durable is marked "Experimental. The API changes without notice."**
- **Coworker's worst findings, so the rebuild doesn't repeat them:**
  - F56: a worker's report wakes nobody.
  - F58: the manager's prompt lacks its mission.
  - F59: a worker isn't given its task.
  - F10: the manager is never told when to ask.
  - F26: "asks first" lanes ask nobody.
  - F66: an approval doesn't show what will be sent.
  - F77: GitHub can only comment.

## What happens to the other pieces

- **Pull request #1179 (the audit)** passed its review, then was closed unmerged on 26 November by Goal 18's lead,
  because Aaron asked for no open pull requests while K47 waits. Its branch, `design/coworker-audit`, is kept and the
  pull request is listed in #1218; reopening it resumes it.
- **Decision record K47** ("Coworker as a third build") is drafted in `k47-draft.md` beside this file, and its id is
  held by Goal 18's lead until Aaron confirms.
  Its screens call must be rewritten for decision 3 above before it lands. Aaron's choice of a fast experiment may
  change its scope, so ask him before landing it.
- **Lifting the result into `main`:**
  - Each `framework:` commit goes up as its own pull request, through the normal process, with Goal 18 giving lanes.
  - The app goes up as Coworker's goal once Goal 18 numbers it.
  - Tell Goal 18's lead (its brief is `design/goals/18-framework.md`) when the experiment starts and when it ends.
