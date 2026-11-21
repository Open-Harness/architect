# Where everything stands

Kept by the conductor after every merge, decision, new thread or archive, so a fresh agent (Claude or Codex) continues
exactly where the last one stopped. The narrative of goal 1 (layers 1 and 2) is in
[`history/handoff-layers-1-2.md`](history/handoff-layers-1-2.md).
Everything open, promised, deferred or stale, with its source, canon page and owning slice: [`ledger.md`](ledger.md).

## START HERE (19 November 2026): the conductor's handoff

**Renamed by K15** (19 November 2026, Aaron): the example app is **Plugged In** (`plugged-in`), no longer `links`. Rows below that say `links` predate it;
`milestones.md` is renamed in place ([`decisions/K15-plugged-in.md`](decisions/K15-plugged-in.md)).

Overnight, 18 to 19 November: K7 (#53), K9 (#55), the durable-run spike (#57), the work board K11 (#61), the factory
K10 (#62) and the portal design M1.25 (#65) merged into `main`. On `m1`, 26 slices are ticked; what's left is in
"Next on the critical path". Aaron quit local Docker (direction 11), set the Cloudflare and HeroUI CI secrets, and
said yes to a preview on npm after Gate M1 (direction 12). Today, from a checkout of `m1`, `ortho generate` writes
the model, api, server, sdk, cli, mcp, docs and the read-only portal; `ortho prove --env local` proves them on
workerd; `tools/demo/m1-plugin.sh` mounts a plugin and `tools/demo/m1-wallet.sh` sends from a wallet on Anvil. A new
project from the preset passes in CI (layer 1 check 1), but not on Aaron's Mac until M1.33 takes Docker out.

### The job you are taking over

You are the **conductor** (`.agents/skills/conductor/SKILL.md`). Aaron, 18 November: "your job is higher level.
understand the big picture and where things are moving and helping me to stay on top of all the threads. here we set
the overall direction and how the bits all relate to each other while keeping a definition of done for all the
threads and how they relate to our goal." So:

- **Don't build.** Each piece of work is a thread with one brief, one branch, one PR and one done-when. You start
  threads, steer them, relate them, and merge or retire them.
- **Keep threads few.** Three at a time is the working number (Aaron, 18 November). Threads report to the conductor,
  not to each other. Merges, closes and small fixes are the conductor's own work, not a new thread.
- **Keep this file current** after every merge, decision, new thread or archive.
- **Before you report on a thread, read its PR and its last commits**, not its last summary.
- **Answer "where are we" as a short sitrep.** Aaron listens rather than reads: plain words, short sentences.
- **When you put a choice to Aaron**, follow the grill format in `~/.claude/CLAUDE.md`: real code with `file:line`,
  what it touches, the options drawn as code, a scenario table, a rubric, a recommendation.
- **Standing rules** (`AGENTS.md`): no keys printed, no cloud credentials without his written yes, $10 a day, destroy
  everything you make, no attribution lines in commits or PRs, pin versions exactly with the three-day release age
  (R1), never enter passwords (npm sign-in is Aaron's).

**How the threads are reached.** The threads below are Claude Code desktop sessions. Their ids (`local_…`) work only
from a Claude session on Aaron's machine. A Codex conductor reaches the same work through **git and GitHub**: each
thread's branch, its PR, its PR comments. To steer a thread, comment on its PR, or ask Aaron to forward the message.

### The goal

**Workable at the end of M2:** plugins mounted and proved, auth and organizations as plugins, the new principals,
secrets by declaration ([`milestones.md`](milestones.md)). Then Aaron builds Capxul's plugins on it. Everything below
is judged by whether it gets us there sooner and truer.

### The direction (Aaron, 17 and 18 November)

1. **Docs first.** The docs canon (MDX) is the spec the code is built to. Canon layer 1 is merged (#38) and
   K5 is agreed, so M1 has started.
2. **Everything falls out of the blueprint.** The blueprint is verbose because agents write it. In return, docs, the
   app, live observability and the agent kit are generated, never configured by hand.
3. **The whole shape is designed together** ([`decisions/K5-the-whole-shape.md`](decisions/K5-whole-shape.md)); the
   details follow in layers.
4. **Agent-native is ported, not used.** Aaron: "drop Agent Native totally … learn from it … port it … as compatible
   as possible. But our own thing." Nothing of agent-native runs or is installed. What it taught us is ported into our
   own Effect code: `defineAction` and its fields and approvals (M1.23), the shell, the chat's surface and screen
   context (M1.24), and the layouts. It stays compatible by names only, so an agent-native app can register our
   generated actions (M1.22 proves this with a type test). Not ported: its Postgres and PGlite, its auth and orgs,
   its MCP, deploy, A2A and telemetry.
5. **Agents are durable, on our own stack.** The portal's chat agent is a durable run, one per chat thread (M4.16).
6. **The portal starts from things and their lifecycles**, then operations, machines, events, errors and notes
   attached to their thing. It shows declared behaviour and lets live evidence light up that same structure.
   **Telemetry, not analytics.** It's designed with Aaron in M1.25, before the portal slice (M1.13). **Parked:** the
   plans and factory surfaces, Dispatch, and the skills design (K4, merged as parked in #37).
7. **One growing example, used everywhere, in stages (Aaron, 18 November evening).** It starts as a linktree where
   people claim a username, then gives those users wallets, then a multisig with budgets, then privacy. Each stage is
   a meta-milestone; all four together are v1.0. Each stage is built from reusable pieces (plugins), and the starter
   and every example change to follow it. The 📐 growing-example thread designed it as K9 ([`decisions/K9-growing-example.md`](decisions/K9-growing-example.md), merged in #55), including what the app
   looks like at each stage, the React hooks slice (designed in `frame/projections.md:261`, owned by no slice), and
   whether generated actions really make us compatible with agent-native apps. Until K9 lands, the sign-up sheet
   (`examples/signup`) stays the canon's first example and acme the tests' fixture. The earlier mini DAO example
   (governance, private membership) is folded into stages 3 and 4 or retired by K9.
8. **Operations DX (K5):** an operation-level `emits:` lands in the same commit as its writes, only on success, and a
   call that writes nothing emits nothing (Q5 = B; built in M3.16). Steps may be declared optional, and eval 6 still
   checks their order. The scaffold writes a wired function: each step in order, the move, a stub per refusal, every
   hole a `Handlers.blank` that `prove --empty` shows red. `ortho check` warns when a required step never runs
   (all three in M1.26).
9. **Chains (K7, merged in #53, all five forks answered by Aaron on 18 November):** EVM now, Solana and Aztec designed and
   built later; every contract function reachable, with generated roles; the wallet's first version in M1 (M1.27 to
   M1.32), signing on every host, linking after auth (M2.13); each wallet declares where its key lives. The EVM chain
   adapter is vendored from `@prb/effect-evm` into `@orthograph/chain-evm` (M1.30; Aaron: "solid on the vendoring
   lets do it"). The earlier line follows.
   **Chains are designed together:** Solidity, Noir and Solana, including contracts we don't write (K7, the war game
   thread). Our own contracts only; other people's are sources behind adapters. K5's Q4 waits on K7.
10. **The name is Orthograph**, the command `ortho`, the npm scope `@orthograph` (the org exists), with "blueprint"
    kept (K6). The rename sweep has run: the code says it too.
11. **No local Docker (Aaron, 18 November):** "I'm quitting Docker. I want to move everything to staging and
    sandboxes." Never start Docker, Docker Desktop or OrbStack. What ran in containers becomes a process (M1.33:
    Collector binary, Verdaccio under Node, our own OIDC issuer) or moves to sandboxes and staging (K10 section 8).
    The repo has `CLOUDFLARE_API_TOKEN` (account-scoped, 90 days, Aaron made it 19 November) and `HEROUI_AUTH_TOKEN`
    as secrets, and `CLOUDFLARE_ACCOUNT_ID` as a variable. Nothing has used the Cloudflare token yet. Any job that
    touches the account destroys what it made in the same job and stays under $10 a day.
12. **A preview on npm after Gate M1 (Aaron, 19 November: "Yes, after Gate M1").** Once M1.15 passes on `main`,
    publish the `@orthograph/*` packages, `orthograph` and the preset under the `next` dist-tag. `npm view` showed
    the names unpublished on 19 November. Publishing is Aaron's sign-in: the conductor prepares the dry run, and he
    runs `npm publish`. `npm create orthograph` stays M2.09. **HeroUI Pro (F7, #65):** only `@orthograph/portal-ui`
    imports Pro, as a peer dependency from the user's own install, never shipped; each user needs their own licence
    (M1.34). F8 (#66) folds the good parts of Codex's `experimental/portal-pro` into the design.

### Every open line

Five lines, and the conductor. The factory (K10, #62) and the work board (K11, #61) merged and their threads are
archived; building them is M3 and later. The Codex runs on M1 (O2 #60, chain-evm #59, scaffold #63, model #64) are
merged and their worktrees removed.

| # | Line | Branch | PR | Done when | State now | Next |
|---|---|---|---|---|---|---|
| ① | **Docs canon (MDX)** | `claude/docs-canon-cf2c38` | #38 merged (layer 1) | Pass 2, every page in layers, checked against the ledger before each layer | Layer 1 merged at `b600bb8`; replaced by the 📖 minimal pass below (K13) | None |
| 📖 | **Canon, minimal pass** (`local_bb023976…`) | its own branch from `main` | none yet | Every canon page rewritten around the links app, as little prose as possible, for a package user; the canon check and a reviewer pass | Started 19 November | Opens the first canon PR |
| 🧭 | **M1 lead** (`local_90551e2a…`) | `m1` | none (M1 lands as one PR at Gate M1) | Every M1 row ticked with its check, `e2e-m1` made blocking, then Gate M1.15 on `main` | 26 rows ticked, wallets (M1.29) and live steps (M1.21) included; M1.11 built and verifying; M1.33 building. `e2e-m1` fails only on unmerged slices and is still `continue-on-error` | Push M1.11, merge `main` for M1.25 and M1.34, then, in K13's order, M1.35 and M1.36, M1.40 to M1.43, M1.12, M1.13 (M1.22 to M1.24 and M1.37 are M3 now) |
| 📐 | **Portal design** (`local_24ad5b8b…`) | `claude/portal-908a25`, then F8's branch | #65 merged; #66 open | F8 merged: Codex's eight good ideas placed in their slices, the agreed design kept where they clash, and the data gaps M1.13 must close | #66 in review and CI | Merges #66 when both pass |
| 🔗 | **Links stage 1 (Codex, run by Aaron)** | `links/stage-1`, `codex/links-staging` | #56 open | `examples/links` runs and the starter is its copy; then handles as a plugin; then the screens | #56 open. `codex/links-staging` deploys to real staging but has no teardown step | Add teardown before any staging run |
| 📒 | **Ledger** | its own branch per round | #58, the K7 and K9 round | The ledger matches what's merged, every item with its source and owner | Open | Merges each round itself when green |

**Closed, branches kept:**
- **#48, span fixes (O3).** It edited journeys and evals, which a builder may not do, and its review found four
  faults. O3's draft stays on `fix/operation-span-first`. M1.18 to M1.20 pick up the work, with journey changes made
  by their authors.
- **#28, the work-real spike.** Its answer is on `main` in [`../spikes/work-real/README.md`](../spikes/work-real/README.md).
  The D1 array fix is ledger STO-23, owned by M1.17. The fuller work app is FAC-15. The work system is parked.

**Done this evening:** the durable-run spike (Codex, #57): one Pi Durable run per SQLite Durable Object survives
eviction mid-tool-call, one commit and one model call per step; an eviction before the model's reply repeats that
request; the bundle is about 420 KB gzipped. Left for M4: the provider path's 17 ambient clock reads and two timeouts.

**Aaron's aim (18 November):** small, modular, reusable pieces, so we can run lots of experiments and spikes with
plugins and extensions; most won't stick, the kept ones are refactored, and production stays clean.

**Other branches not merged into `main`, all parked and owned by nothing:** `layer/4` and `author/stage4-checks` and
`author/stage4-graph-checks` (kept for the M1 harvest); `author/m0-names`, `build/M0.05` (M0 leftovers: check they're
in `main`, then delete); `build/portal-pro`, `design/kits-decision`, `design/work-blueprint`,
`claude/design-agent-harness-e6e8ff` (older design lines: read each one's last commit before deciding).

### How the pieces relate

```text
                        goal: workable at end of M2
                                   ▲
   M1 the complete model and plugins ──► M2 auth and organizations
     ▲ held until ① layer 1 is agreed; M1.25 portal design before M1.13
     │
 ① canon ◄── K5 (merged) sets its layer order ──► M1.01 plugin mounting first
 ⛓ K7 chains ──► the chain slices only (not on M1's start path)
 🏷 K6 Orthograph + ① ──► 🔁 rename sweep ──► M1
 📒 ledger: what's open, with its owner; read before each canon layer and slice
```

### What waits on Aaron

1. **Rotate the HeroUI personal token** that was printed in a conductor's tool output on 18 November (never
   committed).
2. **Canon's open choice:** entity or actor (ticketing is settled: the links app is the one example, K13).
3. **The npm publish at Gate M1** (direction 12): his sign-in.

### Next on the critical path

Re-cut by [`decisions/K13-lock-down-first.md`](decisions/K13-lock-down-first.md) (Aaron, 19 November): lock down what
exists first. M1.40 (the links app, from the canon's blueprint) → M1.41 (the loop through the real `ortho`, every
output read for the basics; checks first, by another agent) → M1.43 (links' handlers) and M1.42 (the basics in every output), with M1.35 (one
visibility rule), M1.36 (telemetry carries the model) and M1.34 (portal-ui) beside them → M1.13 (the portal as a
viewer) → Gate M1.15 → the npm preview → M2. Beside it: M1.33, M1.12 (the SDK contract only), M1.38, M1.39. The
actions, approvals, the chat and MCP from the whole model (M1.22 to M1.24, M1.37) and ST1.05 moved to M3.

### Open questions carried by threads

- **Journeys can't force a race** between two calls, so no journey proves a conflict (JOU-13). No slice yet.
- **About 193 ledger items are owned by no slice.** Each becomes a slice or a canon question as its layer comes up.

### Decision IDs

The list of lettered IDs for `design/decisions/`, kept by the conductor (the `conductor` and `threads` skills); a goal
names its own calls by slug instead (K32). Taken from every file in `design/decisions/` on `main`, `m1`, `goal/stage-1` and every
open remote branch, 20 November 2026. An ID is the part before the first `-` (`K16a` in `K16a-scaffold-build.md`).

**On `main`:** CI-branch-protection, CI-codex-advisory, CI-docs-fast-path, CI-model-integration-deadlines, CI-speed · D1, D2, D3 · E1 · F1, F2,
F5, F6, F7, F8, F9 · G1 · Gate2 · H1, H2 · K1 to K7, K9 to K23 · M0 · N1 · O1, O2 · P1 · R1 · S1.

**Only on other branches:**

| ID | Title | Where |
|---|---|---|
| D4 | kits, dependencies and the chain | `author/stage4-checks` |
| G3 | the runtime's exits are 0 to 4 and 120 to 125 | `goal-3/han-10-build` (#117, open). An earlier G3 for the grid's verdicts, on merged `goal-3/prove-names-files`, became G6: G3 is taken twice |
| G4 | a field can be declared unique | `goal/stage-1` |
| G5 | invariants are their own kind of declaration | `designer/g5-invariants` (#123, open) |
| G6 | the grid's verdicts go to a file first | `goal/stage-1` |
| G7 | red grid cells are listed and may not grow | `goal/stage-1` |
| G8 | a refused call is traced in `<operation>.refused` | `goal/stage-1` |
| K8 | the canon's first review | `claude/docs-canon-cf2c38` (not on `main`) |
| K16a | building the scaffold that explains itself | `m1` |
| K30 | the model and the map: where the core ends, the repositories, declaring what you know, extraction, staleness in CI | `claude/orthograph-model-cf3dca` (#185), reserved |
| M1 | the milestone's calls, one file each (`M1-model`, `M1-plugins`, …) | `m1`, `goal/stage-1`, `m1-12-clients` |
| M8 | time's calls, one file each (`M8-checks`: what time's checks assume) | `main` |
| O3 | every call names its shape | `fix/operation-span-first` (#48, closed) |
| O4 | a successful span exports as UNSET under effect 4.1.4 (check 39's control: "not an error") | `goal/stage-1`, by Goal 3's lead |
| ST1 | stage one's calls (`ST1-02-plugged-in-ownership`) | `goal/stage-1` |
| K25 | the blueprint on chain (a chain store, `lives:`), superseding K7's inline chain | reserved 20 November 2026 for the 📐 Solidity session |
| K26 | on chain pulled forward (M6 ahead of the gates for M3 to M5) | reserved 20 November 2026 for the 📐 Solidity session |
| K27 | the three plugin kinds: language, host, projection; no target (replaces K17's TargetSpec) | reserved 20 November 2026 for the 📐 Solidity session, Goal 4 |
| K28 | releases (scope map) | open PR #262, reserved 21 November 2026 |
| K29 | the UI layer: generated pieces on UI SDK | reserved 21 November 2026 for the UI-layer thread |
| K31 | the app's map in the blueprint, and Goal 6 | taken 21 November 2026 by the 📐 designer thread, #285 |
| K32 | goals coordinate themselves, through git and GitHub | `main`, by the conductor |
| K33 | the work lives on GitHub natively: a milestone per goal, issue kinds, templates, the sync | #301, by the 📐 designer thread |
| K34 | goals start by what they need, not by milestone order; the goal map | `main`, by the conductor |
| K35 | Goals 8 to 16 briefed, short, with their branches | `main`, by the conductor |
| K36 | a composite component declares its wiring; its behaviour stays yours | `main`, by the conductor, on Aaron's call |
| K37 | the canon: one doc set replaces the old pages | reserved 21 November 2026 for the 📚 canon thread |
| K38 | a slice another goal needs lands early | `main`, by the conductor (#440) |

**Next free:** D5, E2, F10, G9, H3, K39, N2, O5, P2, R2, S2. Never fill a gap (F3, F4, G2): it may have been handed out
before this list existed. `CI-<slug>`, `M<n>-<slug>`, `ST<n>-<slug>` and `Gate<n>` are named by their slug or
milestone, not numbered; a goal records its own in its brief, not here (K32), and `GOAL<n>-<slug>` names a call that
belongs to one goal and no milestone.

**To claim a lettered one,** ask the conductor; a goal names its own calls by milestone or area and a slug (K32). The conductor checks that no file
starts with it anywhere, adds it here with a one-line title in the same push, and only then hands it out:

```bash
git fetch -q origin && for r in $(git branch -r --format='%(refname:short)'); do git ls-tree --name-only "$r" design/decisions/; done | grep -E '/G9(-|\.md$)'
```

No output means it is free.


## Done

- **18 November, late evening:** canon layer 1 (#38), naming (#42), the rename sweep (#51) and the ledger round (#47)
  merged. The growing example set as direction item 7, with its 📐 thread started.
- **18 November, evening cleanup:** K5 merged in PR #44. The generated-app and portal-observability spikes merged
  for the record (#41, #39); the skills design merged as parked (#37); #48 and #28 closed with their branches kept.
- **Visuals spike and the `visuals` skill:** merged in PR #34 (18 November).
- **This board's last round:** merged in PR #40.

- **M0, land and rename:** merged in PR #32. The framework's names (renamed again since, K6), `language-*`, the lint rule against old
  names, the docs as one page. Evidence in [`evidence/M0.02/`](evidence/M0.02/) to [`evidence/M0.06/`](evidence/M0.06/).
- **K3 and O2:** merged in PR #36. Stores of open kinds, sources through adapters; the three trace gaps with their
  slices.
- **Branch triage:** merged in PR #33. The portal-docs spike kept as its own line; idle worktrees and merged branches
  removed.

**Traps carried over from goal 1** (full list in the old handoff): run `pnpm nx reset` then
`NX_DAEMON=false pnpm nx sync` after any generator change; Gate 2's teardown removes every new container with the
framework's prefix, so don't run two gates at once; a killed Gate 2 run can leave its registry container behind.
