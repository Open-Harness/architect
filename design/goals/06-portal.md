---
goal: 6
title: the new portal, on our own components and the app's map
milestone: "Goal 6: the new portal"
release: beta
branch: goal/portal
base: goal/stage-1
status: ready          # ready | running | landing | done | parked
lead:
  harness: null        # claude | amp | codex | opencode, set by the lead when it starts
  model: null          # the model id it runs on
  since: null          # the date it started
done_check: nx run e2e:portal-next
owns:
  - packages/theme/
  - packages/shell/
  - packages/portal-next/
  - packages/orthograph/src/modules/app/
  - packages/compiler/src/modules/app/
  - packages/projections/src/modules/app/
  - e2e/portal-next/
  - design/goals/06-portal.md
slices:
  - "1 · The theme"
  - "2 · The checks"
  - "3 · The map language (after 2)"
  - "4 · The app projection (after 3)"
  - "5 · The shell (after 4)"
  - "6 · The frame (after 1, 5)"
  - "7 · Home, things and operations (after 6)"
  - "8 · Environments, compare, journeys, starting worlds (after 6)"
  - "9 · Reference, plugins and the rules (after 6)"
  - "10 · Monitor and traces (after 6)"
  - "11 · The agent's portal (after 6)"
  - "12 · Cutover (after 7, 8, 9, 10, 11)"
---
# Goal 6: the new portal, on our own components and the app's map

Branch `goal/portal`, cut from `goal/stage-1`. Written 21 November 2026 with K31, on terms agreed with the conductor the same day.

**To start it, in any harness** (Claude Code, Amp, Codex, OpenCode): "You lead Goal 6. Read `AGENTS.md` and
`design/goals/06-portal.md`, and run it." Nothing else is needed. Milestone `Goal 6: the new portal`, label `release:beta` (K33).

## The goal, in plain words

- **In one sentence:** Build a new portal from our own parts and swap it in for the old one, without losing anything
  the old one does.
- **Why:** The old portal rests on a paid component library, and its pages and menus are wired by hand, so nothing about
  its layout comes from the app itself.
- **When it's done, you can:** open the portal and find everything you could before; see its pages and menus come from
  what the app declares; and let an agent find and open any part of it by name.
- **It is:** a new portal beside the old one, a way for any app to declare its pages and menus, the frame that draws
  them, and one shared look for everything we draw.
- **It isn't:** a redesign (the pages stay as they are), new data (it reads what the old one reads), or the generated
  forms and views (the goal making web building blocks for every app does those).
- **Done when:** every test that guards today's portal passes on the new one, and then the old one is deleted.
- **Waits on:** nothing to start. The switch-over needs a yes from the goal building the example app's first release,
  since it changes files that goal uses.
- **Words used:** the portal: the web page every project gets for looking inside it. Its map: an app's pages, their
  addresses and its menus.

## Aaron's words, 21 November 2026

After the app map grill ("I agree with all of your defaults"), to the 📐 designer thread: kick off a new goal "against
the new portal", so the old portal is deprecated and "this is the new portal built from our own components", and "I
want this to be able to run in parallel to the other work that's actually running."

## What this goal proves

1. **The map falls out.** An app declares its map in the blueprint (K31), and the router, the shell, the palette, the
   breadcrumbs and the agent's map (as data) come from it. The rest of K31's table, the docs' page per screen,
   `ortho add page`, the agent's `map` tool on an app and `open(pages.x)` in `ortho prove`, is not in this goal; it is
   in `design/later.md`, "The rest of the app's map". Aaron's call on composite components (K36, 21 November 2026:
   "C, wiring declared") adds `Blueprint.component` to slice 3 and a page's components to slice 4's agent map and
   palette index; the rest of K36 waits in the same `later.md` item.
2. **Our own components are enough.** The portal is rebuilt on UI SDK, the Orthograph theme and our shell, with no
   HeroUI and no licence anywhere.
3. **Nothing is lost.** Every check that holds the old portal passes on the new one before the old one goes.
4. **An agent can use the portal,** by name, through UI SDK's bridge.

## The words

- **The old client** is today's portal client in `packages/portal` (on HeroUI Pro through `@orthograph/portal-ui`).
  **The new client** is `packages/portal-next`. Both are served by the same server half
  (`@orthograph/portal/server`: the data API at `/_portal/v1/*` and a prebuilt client passed in as `PortalAssets`).
- **The parity list** is `e2e/portal-next/expected-failing.txt`: every portal check that does not yet pass on the new
  client, one per line.
- **Cutover** is the one change that serves the new client at `/portal` and deletes the old one.

## The prompt

> You lead Goal 6 in this repository. Run it as one autonomous goal until the done check below passes on
> `goal/portal` and cutover has landed, or until you are truly blocked as `AGENTS.md` defines it.
>
> This file is the whole brief: it holds every agreement this goal depends on (below, "The agreements"), so a lead
> starting cold, on any account or session, needs only the repository. Read "Where it stands" at the end first, and
> rewrite it at every slice merge. You coordinate yourself, through the repository and GitHub only ("How this goal
> coordinates", below); `.agents/skills/kanban/STATE.md` says where the whole project stands.
>
> Read first:
> - `AGENTS.md`, and this file word for word;
> - `design/decisions/K31-app-map.md` (the map), `K29-ui-layer.md` (the pieces, UI SDK), `K32-goals-coordinate-themselves.md` and `K33-github-native.md` (how goals coordinate, and how the work lives on GitHub: the `github` skill) and `K19-portal-prebuilt.md` (the portal's
>   server and client line), and `design/ui/heroui-inventory.md` (every part of the old client, with what replaces it);
> - `design/portal.md` (the agreed information architecture: keep it; this goal changes how the portal is built, not
>   what it shows) and the `portal-design` skill (the process and the style guide);
> - `e2e/m1/21-portal-viewer.test.ts`, `28-st1-22-rules-in-the-portal.test.ts`, `e2e/served-portal/` and the grid's
>   portal evals: the checks that hold the old client;
> - the `ui-sdk`, `reviewer`, `author`, `threads`, `kanban` and `portal-design` skills.
>
> - **Branch:** `goal/portal`, cut from the tip of `goal/stage-1` when this goal starts.
>   - Every change reaches it through a pull request into `goal/portal`, merged when CI is green and a 🔍 reviewer
>     that wrote none of it passed it.
>   - Merge `origin/goal/stage-1` into `goal/portal` at the start of every slice, by a merge, never a rebase. Never push
>     to `goal/stage-1`.
>   - Goal 3 owns `goal/stage-1` and never waits on you; Goal 5 runs beside you. Resolve every conflict on your side,
>     keeping their intent.
> - **Roles:** keep the five roles below apart. No agent plays two of them on the same slice.
> - **Ownership:** you own the architecture, as `AGENTS.md` says. Where code and design disagree, decide, fix the other
>   in the same change, and record it.
> - **The handoff:** keep `design/handoff.md` and `STATE.md` current after every merge, and move each slice's card on
>   the board (the `kanban` skill), and rewrite "Where it stands" in the same pull request.
> - **Ownership between goals:** Goal 5 owns the actions, `@orthograph/web` and the web projection; you own the map, the
>   shell, the theme and the new client. Neither goal edits the other's packages.
> - **Reporting:** "Where it stands", rewritten in the pull request that merges each slice. Nobody is messaged.
> - **Cutover follows the protocol, point 5.** Never merge cutover into `goal/stage-1` without the freeze and the yes it
>   names.
> - **Branch protection** is set on `goal/portal` before this goal starts, like `goal/stage-1`
>   (`design/decisions/CI-branch-protection.md`). If `gh api repos/Open-Harness/orthograph/branches/goal/portal/protection`
>   finds none, it needs an admin: write that in "Where it stands" and stop before the first pull request.

## The bound

- **Inside:** the theme (`packages/theme`, `@orthograph/theme`), the map language (K31) as new modules in `orthograph`
  and the compiler, the app projection (`generated/app/`), the shell (`packages/shell`, `@orthograph/shell`), the new
  client (`packages/portal-next`), its checks, and cutover.
- **The core-language rule.** The map comes in as new modules only. No existing module is edited beyond registering
  the new ones, and a blueprint that declares no app and no pages generates byte-identical output. These are the only
  existing files this goal may touch before cutover, and only as said:

  | File | Only this |
  |---|---|
  | `packages/orthograph/src/index.ts` | spread the new `app` module into the `Blueprint` object and export its types |
  | `packages/compiler/src/modules/model/service.ts` | set the `blueprint/app/` files aside before `readLayout`, and call the new `app` module after `describe`, adding `app` to the model only when one is declared |
  | `packages/compiler/src/modules/model/types.ts` | `readonly app?: AppModel` on `Model`, "present only when the blueprint has an `app/` folder", the type imported from the new module |
  | `packages/projections/src/main.ts` | export the `app` projection |
  | `.oxlintrc.json` | the module-boundary tags `scope:theme`, `scope:shell` and `scope:portal-next`, for `packages/theme/`, `packages/shell/` and `packages/portal-next/` |
  | `e2e/served-portal/` | the checks author's `PORTAL_CLIENT=old|next` switch, the old client the default |
  | `e2e/project.json`, `e2e/package.json` | the `portal-next` target and the new packages as workspace dependencies |
  | `.github/workflows/ci.yml` | one job that runs the portal checks against the new client, not yet blocking |
  | `pnpm-lock.yaml` | what `pnpm install` writes for the above |
  | `design/handoff.md`, `STATE.md`, the board, `design/milestones.md` | this goal's own lines |

  A change that needs any other existing file is an Ask issue in that goal's milestone, never an edit here.
  The new modules are `packages/orthograph/src/modules/app/` (`Blueprint.app`, `Blueprint.page`, `Blueprint.layout`,
  `Blueprint.nav`, `Blueprint.component` (K36); a page's type is `AppPage`, since `Page` is already a read's page of results),
  `packages/compiler/src/modules/app/` (`model.app`, its hash and the five refusals (K31, K36)) and
  `packages/projections/src/modules/app/` (the app projection); the new packages are `packages/theme`,
  `packages/shell` and `packages/portal-next`.
- **Outside, never edited before cutover:** `packages/portal` (the old client, the wire and the server half),
  `packages/portal-ui`, the actions, `@orthograph/web` and the web projection (Goal 5's), Plugged In, and every Goal 3
  journey and check. Only cutover's own pull request touches `packages/portal` and `packages/portal-ui`.
- **The information architecture stays** as `portal.md` agreed it, so no new UX grill. A screen the old client lacks
  (the map's tree, the agent's view) is drawn first, by the `portal-design` process, and shown to Aaron before it is
  built (his rule: ask before drawing UX).
- **Local, never fake:** Chromium through Playwright, the real served portal over a real data API, the `TraceSource`
  fixture check 21 already uses. No cloud, no Docker, no keys. **Cloud spend: $0.**
- **Dependencies:** `@ui-sdk/*` at the workspace's pin (R1); nothing else new without a line in R1.
- **At most three builders at once.** Every agent stops the processes it starts, by PID, before it reports.

## Keeping up with Goal 3 (the protocol)

Goal 3 keeps changing the old client while this goal runs (today: the rules each operation breaks, #269; the request
key in the calls table, #270). So:

1. **Merge in at every slice.** Start each slice by merging `origin/goal/stage-1`.
2. **Same checks, two clients.** The checks author makes `e2e/served-portal` serve either client
   (`PORTAL_CLIENT=old|next`), and every portal check (21, 28, the grid's portal evals, and any added later) runs
   against both in CI. The old client stays the blocking one until cutover.
3. **The parity list only shrinks,** with one exception: a portal check that arrives by a merge from `goal/stage-1`
   lands red on the new client, and the merge adds its line. So anything Goal 3 adds to the old portal is owed by the
   new one automatically, and nothing is forgotten.
4. **Data goes through Goal 3.** The new client reads the data API and the wire types as they are. A field it needs and
   the API lacks is an additive request to Goal 3, an Ask issue in Goal 3's milestone, never an edit here.
5. **The cut-off, on GitHub.** When the parity list is empty and the done check passes:
   - **The freeze.** The lead opens an Ask issue in Goal 3's milestone: "Freeze the old portal client for Goal 6's cutover:
     add nothing to it; portal work goes to `packages/portal-next`", linking the green done check. Goal 3's lead
     agreeing on that issue is the freeze, and Goal 3 records it in its own brief.
   - **The cutover.** Only then, the cutover pull request into `goal/stage-1`, in this goal's milestone, linking the freeze
     issue, with a review request to Goal 3's lead. It merges once Goal 3's lead has said yes on it and a 🔍 reviewer
     has passed it. (Where every agent works under one GitHub account and GitHub refuses the request, the yes is a
     comment on the pull request.)
   - From then on all portal work goes to the new client.
6. **One owner for each shared piece.** The theme is this goal's, built first and landed early, so Goal 5's screens
   take it up; until it lands, Goal 5's pieces use UI SDK's default tokens. The actions and `@orthograph/web` are Goal
   5's. Neither goal edits the other's packages; a need on the other side is an Ask issue in that goal's milestone.

## The five roles

| Role | Writes | Never touches |
|---|---|---|
| **Checks author** | each slice's failing check, first, on a `-check` branch; the two-client runner and the parity list's first lines | the framework, the new client's code, the journeys |
| **Framework builder** | the map language, the compiler checks, the app projection, `@orthograph/shell`, `@orthograph/theme`, on `-build` branches | any check, the new client's pages |
| **Portal builder** | `packages/portal-next` only, the way an app's author would: its `blueprint/app/`, its pages, its components | `packages/` outside it, any check |
| **Designer** | a screen the old client lacks, drawn first and shown to Aaron (`portal-design`) | code |
| **🔍 Reviewer** | a verdict on each pull request | anything it reviews |

When the portal builder is stuck on something it can't fix inside `packages/portal-next`, it opens a Snag issue in
this goal's milestone (the Snag form, K33; this goal's own snags only) and moves on. It never works around the map
or the shell from inside the client.

## How this goal coordinates (K32, K33)

This goal coordinates itself, in whatever harness runs it, through the repository and GitHub only, never through a chat
or a coordinating session ([`../decisions/K32-goals-coordinate-themselves.md`](../decisions/K32-goals-coordinate-themselves.md)).

- **Milestone and labels** (K33, the `github` skill). Every pull request and issue of this goal carries the milestone
  `Goal 6: the new portal` and the label `release:beta`; each pull request also carries its `role:` and `harness:`
  labels, and the template's "Harness and model" line. The lead keeps the front matter's `lead:` and `status:`
  current, and `node tools/github/sync.mjs --apply` mirrors them, and the slices, onto the goal issue.
- **The paths it owns:**
  - `packages/theme/`, `packages/shell/` and `packages/portal-next/`;
  - `packages/orthograph/src/modules/app/`, `packages/compiler/src/modules/app/` and
    `packages/projections/src/modules/app/`, with the registering lines the bound's table names;
  - `e2e/portal-next/` and this goal's checks, and the `e2e:portal-next` target;
  - `design/goals/06-portal.md`;
  - at cutover only, through its own pull request: `packages/portal`, `packages/portal-ui` and every other file slice
    12 names.
  Nothing else is this goal's. Touching another goal's path is a cross-goal ask, never a quiet edit.
- **Where it stands.** The lead rewrites "Where it stands" at the end of this file in every pull request that merges
  into `goal/portal`: what landed, what is open, what it waits on, in two or three lines written for Aaron's ear. That is the
  report; nobody is messaged. This goal's own snags are Snag issues in its milestone (K33), and only its own.
- **Asking another goal for something** is an Ask issue (the Ask form, `kind:ask`) in the milestone of the goal
  that must act (`Goal 3: stage 1, hill-climbed`, `Goal 5: the UI layer`), naming this goal and what done looks like. Never push to another goal's branch or edit its files by pull request; the
  owner acts on the issue.
- **Asks to this goal** are open Ask issues in its milestone (`kind:ask`). Read them at the start of every slice, after merging
  `goal/stage-1` in, and close each with the pull request that answers it.
- **Decisions** this goal makes are named by area and a slug (`MAP-<slug>` for the map, the shell and the theme, `PORTAL-<slug>` for the client, as in `MAP-route-params`), never numbered. Before using a name, check
  that no file starts with it on `main` or any open branch (`git ls-tree -r --name-only origin/<branch>
  design/decisions/`), and list it under "Decision IDs" below.
- **Changing an agreement** below is an Ask issue in the other goal's milestone; each lead then edits only its own brief.
- **Branch protection** on `goal/portal` is set by the conductor before this goal starts (K32). If
  `gh api repos/Open-Harness/orthograph/branches/goal/portal/protection` finds none, write that in "Where it stands" and stop
  before the first pull request.

## The agreements (21 November 2026)

Made by the conductor and the 📐 designer thread, under Aaron's standing authority, when this goal was split from
Goal 5. They hold whoever leads either goal; changing one starts with an Ask issue in the other goal's milestone.

1. **The theme is this goal's,** built as slice 1 and landed in `goal/stage-1` on its own. Until it lands, Goal 5's
   pieces use UI SDK's default tokens; Goal 5's screens slice takes it up.
2. **The app-map language is additive** (the core-language rule in the bound): new modules only, registered in the
   named files, and byte-identical output for a blueprint with no app and no pages, proved by slice 2's check.
3. **Neither goal edits the other's packages.** Goal 5 owns the actions module, `packages/web`, the actions and web
   projections and Plugged In's `src/web/`; this goal owns `packages/theme`, `packages/shell`, `packages/portal-next`,
   the app projection and the `app` modules. A need on the other side is an Ask issue in that goal's milestone, never an
   edit.
4. **Goal 5 never waits on the map.** Plugged In's pages are declared in the map language as a follow-on, after the
   map landing.
5. **The parity list only shrinks,** except for a portal check that arrives by a merge from `goal/stage-1`, which lands
   red with its line (the protocol, point 3).
6. **Cutover, on GitHub:** when the list is empty, Goal 3's lead agrees the freeze on an Ask issue in Goal 3's milestone; then the
   cutover pull request into `goal/stage-1` merges with Goal 3's lead's yes and a 🔍 pass (the protocol, point 5).
7. **Goal 5's waits are not this goal's:** its screens wait on ST1.03 and its sign-in on M2.05 and M2.06, both Goal
   3's. Nothing here waits on Goal 5.

## The slices

Each slice starts with its check, written first and failing, and ends with it green on `goal/portal`.

### Part 1: the theme and the map, beside everyone (none of it touches Goal 3's or Goal 5's files)

| # | Slice | Done when |
|---|---|---|
| 1 | **The theme.** `@orthograph/theme`: one stylesheet on UI SDK's `--ui-*` tokens (K29 Q3), the type scale and spacing, light and dark | its check (written first): a fixture page on it in Chromium resolves every `--ui-*` token to the theme's value, in both schemes, and builds with `HEROUI_AUTH_TOKEN` unset |
| 2 | **The checks.** The two-client runner, `nx run e2e:portal-next`, the parity list (every portal check, all red), and the map's own checks: the compiler's five refusals (K31's four, K36's one), a page that shows no read and types its parameter with a value (the portal's case: `/things/:name` over the data API) compiling, a derived default map for a fixture with no `app.ts`, typed links, a palette that lists only what the caller may open and call, and **the byte-identical check**: acme's and Plugged In's `model.json` and every generated file equal `goal/stage-1`'s, byte for byte, with the map modules in | they fail with the map empty, except the byte-identical check, which passes and must keep passing; the old client's checks still pass |
| 3 | **The map language.** `Blueprint.app`, `Blueprint.page`, `Blueprint.component` (K36), `Blueprint.layout`, `Blueprint.nav` in `orthograph`'s new `app` module; `model.app` in the compiler's new `app` module, hashed; the five compile errors (K31, K36), and a page's effective `shows` and `offers` with its components' (K36); registered in the four files the bound names | slice 2's language and compiler checks; the byte-identical check |
| 4 | **The app projection.** `generated/app/`, for a project that mounts it: the route table, a typed link per page, the navigation, the palette's index and the agent's map, as data, each page with its components and what they offer (K36); with no `app.ts`, the derived default, worked out here and never written into the model | slice 2's projection checks; the byte-identical check |
| 5 | **The shell.** `@orthograph/shell`: the router over the route table, the layouts (`sidebar`, `topNav`, `none`) and their slots, the navigation, the breadcrumb and the ⌘K palette, on UI SDK (`navigation-menu`, `collapsible`, `scroll-area`, `command`, `menu`) and the theme | slice 2's shell checks in Chromium; an agent's `snapshot()` on a fixture shell lists its navigation and palette by name |

**The theme landing, after slice 1:** one pull request from `goal/portal` into `goal/stage-1` carrying only
`packages/theme`, its check and the bound table's lines it needs (`scope:theme` in `.oxlintrc.json`, the lockfile,
its `e2e/project.json` target), so Goal 5's screens take it up. Merge `goal/stage-1` in first. It merges when CI is
green and a 🔍 reviewer passed it.

**The map landing, after slice 5:** the same, for the map language, the app projection and the shell, so Plugged In's
pages can declare themselves (Goal 5's follow-on). The byte-identical check must pass on it. It registers the new
modules in `orthograph`'s index and the compiler's model service, which are Goal 3's busiest files, so tell Goal 3's
lead before it opens (an Ask issue in Goal 3's milestone), and merge `goal/stage-1` in last
thing.

### Part 2: the new client

| # | Slice | Done when |
|---|---|---|
| 6 | **The frame.** `packages/portal-next`: its `blueprint/app/` declaring `portal.md`'s map (home, things, operations and their five tabs, environments, compare, journeys, starting worlds, reference, plugins, monitor, traces), the top bar (environment picker, ⌘K), the rail and its panels, the tree, the live rail, each keeping its `data-portal` hook | check 21's frame clauses leave the parity list |
| 7 | **Home, things and operations** (the contract, metrics, proof, docs and notes tabs) | their lines leave the list |
| 8 | **Environments, compare, journeys, starting worlds** | their lines leave the list |
| 9 | **Reference, plugins and the rules** (check 28) | their lines leave the list |
| 10 | **Monitor and traces** (a trace on UI SDK's `Waterfall`, or ours if it is still experimental) | their lines leave the list; the screenshots are byte-identical across two runs |
| 11 | **The agent's portal.** The agent's map tool on the portal; every control by name | an agent's `snapshot()` lists the search, the tree, the tabs and the environment picker by name |

### Part 3: cutover

| # | Slice | Done when |
|---|---|---|
| 12 | **Cutover (ST1.27)**, after the cut-off (the protocol, point 5). Check 15 rewritten first by a checks author (ST1.28); then one pull request into `goal/stage-1` that serves `portal-next` at `/portal`, deletes the old client, `@orthograph/portal-ui`, HeroUI and the licence machinery (`pro.mjs`, `sheets.mjs`, the CI step and cache, `ortho/no-pro-outside-portal-ui`), folds `e2e:portal-next` into the normal portal checks, and rewrites every live doc line that still names `portal-ui` or HeroUI as current (`git grep -n "portal-ui\|HeroUI"` outside `design/decisions/`, `design/history/` and `design/process/`: the `portal-design` skill, `design/walkthrough/journey.md`, `design/ui/heroui-inventory.md` section 8, `portal.md`, `packages.md`), with a Supersedes list. It merges after the freeze, with Goal 3's lead's yes and a 🔍 pass | every portal check passes on the one client; check 15 passes; the portal builds with `HEROUI_AUTH_TOKEN` unset |

## Decision IDs

A decision this goal makes is named `MAP-<slug>` or `PORTAL-<slug>` (K32), never a number, so no allocator is
needed: check the name is free, then list it here in the pull request that adds it. K31 was lettered before this goal
started, since it crosses goals.

| ID | File | Taken by |
|---|---|---|
| K31 | `design/decisions/K31-app-map.md` | the 📐 designer, before this goal started |

## The done check

```bash
nx run e2e:portal-next
```

It passes only when all of these hold, in CI on `goal/portal`:
- the parity list is empty: every portal check passes against the new client;
- the theme's and the map's checks pass (slices 1 to 5), and the byte-identical check passes: a blueprint with no app
  and no pages generates exactly what it did on `goal/stage-1`;
- the new client declares its map in `blueprint/app/`, with no route matched by hand;
- an agent's `snapshot()` lists the portal's frame by name;
- nothing in `packages/portal-next`, `packages/shell` or `packages/theme` imports HeroUI, and they build with
  `HEROUI_AUTH_TOKEN` unset;
- every Snag issue in this goal's milestone is closed, fixed or parked with an owner and a reason.

Then the freeze and cutover (slice 12) land on GitHub, as the protocol's point 5 says, and the goal is done.

## Evidence for Aaron

- **Side by side:** a screenshot of every portal page at desktop width, the old client beside the new.
- **The parity curve:** the list's length over time, with each Goal 3 check that arrived by a merge marked.
- **The map, written and falling out:** the portal's `blueprint/app/` in full, beside what it generated (the routes,
  the navigation, the palette's index, the agent's map).
- **A browser video** of an agent finding a refusal code through ⌘K and opening the operation that throws it.

## Estimate

From Goal 3's pace (a medium slice three to six hours, checks first). Part 1: about 16 to 22 hours, the theme first,
the map language and the shell being new. Part 2: about 18 to 26 hours, six pages whose content and checks already exist. Cutover: 2 to
4 hours. All: about 36 to 52 hours, with slice 12 waiting on the cut-off.

## Where it stands
