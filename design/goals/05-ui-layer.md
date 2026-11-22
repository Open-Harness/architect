---
goal: 5
title: the UI layer, on UI SDK
milestone: "Goal 5: the UI layer"
release: beta
branch: goal/ui-layer
base: goal/stage-1
status: running        # ready | running | landing | done | parked
lead:
  harness: claude       # claude | amp | codex | opencode, set by the lead when it starts
  model: claude-opus-5-5 # the model id it runs on
  since: 2026-11-22     # the date it started
done_check: nx run e2e:ui-layer
owns:
  - packages/orthograph/src/modules/actions/
  - packages/web/
  - packages/projections/src/modules/actions/
  - packages/projections/src/modules/web/
  - examples/plugged-in/src/web/
  - examples/plugged-in/generated/actions/
  - examples/plugged-in/generated/web/
  - design/goals/05-ui-layer.md
slices:
  - "1 · The actions module, and the goal's test target"
  - "2 · The web projection's checks"
  - "3 · The actions projection (after 1, 2)"
  - "4 · The web projection (after 2, 3)"
  - "5 · The example app's three screens (after 4)"
---
# Goal 5: the UI layer, on UI SDK

Branch `goal/ui-layer`, cut from `goal/stage-1`. Written 21 November 2026 with K29.

**To start it, in any harness** (Claude Code, Amp, Codex, OpenCode): "You lead Goal 5. Read `AGENTS.md` and
`design/goals/05-ui-layer.md`, and run it." Nothing else is needed. Milestone `Goal 5: the UI layer`, label `release:beta` (K33).

## The goal, in plain words

- **In one sentence:** Give every app ready-made web building blocks, one for each thing a person can do in it, made
  from what the app already declares, and build our example app's screens from them.
- **Why:** An app gets its command line and the tools an AI agent uses for free from its description, but its web pages are
  written by hand, so every form repeats the same checks, errors and waiting, and an agent in a browser can't rely on them.
- **When it's done, you can:** open the example app in a browser, claim a name, add links and see your page; get a clear
  message when the name is taken; and watch an agent do the same on the same page, stopping where a person must say yes.
- **It is:** a generated building block for every action and every view of data, the small shared browser runtime
  they run on, and the example app's three screens, built from those blocks.
- **It isn't:** the portal, or an app's list of pages and its menus (both belong to the new-portal goal), the example
  app's server side, or any web toolkit but React, the one we build on.
- **Done when:** the example app's tests for claiming a name, adding links and showing the page pass in a real browser,
  with the same results they already give without one, and nothing the app already generates has changed.
- **Waits on:** nothing to start. The last step, the three screens, needs claiming a name to work, which the goal
  building the example app's first release is making.
- **Words used:** a building block (a "piece"): a ready-made form or view for one action, with its errors and its waiting
  built in. The example app (Plugged In): a page of links under a name you claim.

## Aaron's words

On 21 November 2026 Aaron asked for the UI layer to be designed on UI SDK, with HeroUI phased out (K24). The four
questions it raised were answered 1A 2A 3A 4A by the conductor, under the standing authority he gave it that day:
"anything that's waiting on me, just go with the recommendations. You have authority." So actions come into stage 1,
the screens are built from generated pieces, HeroUI leaves the portal now, there is one Orthograph theme on
UI SDK's tokens, and the beta generates React only ([`../decisions/K29-ui-layer.md`](../decisions/K29-ui-layer.md)).
The same day Aaron answered the app map grill (K31, [`../decisions/K31-app-map.md`](../decisions/K31-app-map.md)): the
portal is rebuilt as a new client on the app's map, by Goal 6 ([`06-portal.md`](06-portal.md)), so the portal and the
theme are Goal 6's. This goal's done check never waits on Goal 6: Plugged In's pages declare themselves in the map
language as a follow-on, once it lands. His call on composite components (K36, "C, wiring declared") leaves slice 5
unchanged: the link list is hand-written first, and declared as a component once the map language lands.

## What this goal proves

A blueprint gives a web app its interface the way it gives the CLI and MCP theirs: derived, never hand-configured.

1. **Every operation has a generated piece.** One action per operation does the call, and one UI SDK piece per
   operation and read binds a form to it, with the declared refusals, the pending state and the agent's rules built in.
2. **A page is composition.** Plugged In's three screens are its own short code in `src/web/`, built from the pieces
   and UI SDK's components, with one component of its own (the link list).
3. **People and agents use the same page.** An agent in the browser sees every control by name, waits for a person's
   yes where one is declared, and is refused with the same code a person sees.

## The words

- **An action** is one generated file per operation that does the call: the caller, the payload check, a refusal as a
  value, and an approval when one is declared (M1.23, M1.22).
- **A piece** is one generated UI SDK primitive per operation or read, bound to its action, with React parts beside it
  (`generated/web/<thing>/<verb>.ts` and `.react.tsx`). It is a move, a write or a read, worked out from the model.
- **`@orthograph/web`** is the package every piece shares: the browser host and the piece runtime. The pieces use UI
  SDK's default tokens until the Orthograph theme (`@orthograph/theme`, Goal 6's first slice) lands, and the screens
  slice takes it up.

## The prompt

> You lead Goal 5 in this repository. Run it as one autonomous goal until the done check below passes on
> `goal/ui-layer`, or until you are truly blocked as `AGENTS.md` defines it.
>
> This file is the whole brief: it holds every agreement this goal depends on (below, "The agreements"), so a lead
> starting cold, on any account or session, needs only the repository. Read "Where it stands" at the end first, and
> rewrite it at every slice merge. You coordinate yourself, through the repository and GitHub only ("How this goal
> coordinates", below); `.agents/skills/kanban/STATE.md` says where the whole project stands.
>
> Read first:
> - `AGENTS.md`, and this file word for word;
> - `design/decisions/K29-ui-layer.md` (the whole shape, with sketches), K31 (the app's map), K32 and K33 (how goals
>   coordinate, and how the work lives on GitHub: the `github` skill), K24, K13 and K28;
> - `design/frame/projections.md` 3.4 (the web projection) and the M1.22, M1.23, ST1.25, ST1.26 and ST1.04 rows of
>   `design/milestones.md`;
> - `spikes/ui-sdk-real-world/` (#222) and `spikes/ui-sdk-verb-primitive/` (#215), their READMEs first;
> - the `ui-sdk`, `reviewer`, `author`, `threads` and `kanban` skills.
>
> - **Branch:** `goal/ui-layer`, cut from the tip of `goal/stage-1` when this goal starts.
>   - Every change reaches it through a pull request into `goal/ui-layer`. Merge each one when CI is green and a 🔍
>     reviewer that wrote none of it has passed it.
>   - Merge `origin/goal/stage-1` into `goal/ui-layer` at the start of every slice: by a merge, never a rebase. Never
>     push to `goal/stage-1`.
>   - Goal 3 owns `goal/stage-1` and never waits on you. Resolve every conflict on your side, keeping Goal 3's intent.
> - **Roles:** keep the five roles below apart. No agent plays two of them on the same slice.
> - **Ownership:** you own the architecture, as `AGENTS.md` says. Where code and design disagree, decide, fix the
>   other in the same change, and record it.
> - **The handoff:** keep `design/handoff.md` and `STATE.md` current after every merge, and move each slice's card on
>   the board (the `kanban` skill), so a fresh or compacted session continues where you stopped.
>   Rewrite "Where it stands" in the same pull request.
> - **Reporting:** "Where it stands", rewritten in the pull request that merges each slice. Nobody is messaged.
> - **Branch protection** is set on `goal/ui-layer` before this goal starts, like `goal/stage-1`
>   (`design/decisions/CI-branch-protection.md`): its CI jobs must pass and every conversation be resolved. If
>   `gh api repos/Open-Harness/orthograph/branches/goal/ui-layer/protection` finds none, it needs an admin: write that
>   in "Where it stands" and stop before the first pull request.

## The bound

- **Inside:** the slices below, the framework work they need, and `examples/plugged-in/src/web/` (the three screens and
  the link list), which this goal owns. New packages and folders: `packages/web` (`@orthograph/web`), the actions
  module in `orthograph`, the actions and web projections, and the generators' templates for them.
- **Outside:**
  - the rest of `examples/plugged-in` (its blueprint, journeys, handlers and auth) and every Goal 3 journey and check;
  - the shell's chat and "Needs you" (M1.24), MCP from the whole model (M1.37) and the host's caller for actions outside
    our portal (ST1.05): all still M3;
  - the portal, `@orthograph/portal-ui`, the map language, the shell and the theme: all Goal 6's;
  - frameworks other than React (Q4), server rendering, and a lighter client than the generated SDK (`later.md`).
- **Local, never fake:** Chromium through Playwright for every browser check, never jsdom; real workerd and D1 under
  `ortho prove`. No cloud, no Docker, no keys.
- **Dependencies:** `@ui-sdk/*` pinned exactly, at least three days old (R1). K24 pins beta.7; beta.10 qualifies from
  21 November and beta.13 from 22 November. Moving the pin is its own pull request, which re-reads the vendored skill
  (`.agents/skills/ui-sdk/README.md`, "Updating it").
- **Goal 3's hotspots** (from its open pull requests on 21 November 2026). Merge often, and keep each slice small where
  it touches them:
  - the compiler's model (#269, and ST1.14 to ST1.16 before it): the actions and web projections read the model and
    never change it. A field they need that the model lacks is an Ask issue in Goal 3's milestone, not an edit here;
  - `orthograph`'s front door (ST1.14): M1.23's actions module sits beside it, so merge before touching the module
    index;
  - `examples/plugged-in` and `e2e/` (#267, the journeys): this goal writes only `examples/plugged-in/src/web/` and its
    own checks;
  - the expected-failure lists.
- **Cloud spend: $0.**
- **Goal 6's files:** `packages/shell`, `packages/theme`, `packages/portal-next`, the app projection and the map
  declarations in `orthograph` are Goal 6's. This goal never edits them, and Goal 6 never edits `packages/web` or the
  web projection.
- **At most three builders at once.** Every agent stops the processes it starts, by PID, before it reports.

## The five roles

| Role | Writes | Never touches |
|---|---|---|
| **Checks author** | each slice's failing check, first, on a `-check` branch, including the `e2e:ui-layer` target | handlers, the framework, the journeys, `src/web/` |
| **Framework builder** | `packages/`, on a `-build` branch, to turn a check green | the journeys, any check, `src/web/` |
| **User** (the DX trial) | only `examples/plugged-in/src/web/`, using only what a user has: the generated pieces, UI SDK, the `ui-sdk` skill, the generated docs | the blueprint, the journeys, `packages/`, any check, `generated/` |
| **Goal 3** | Plugged In's blueprint, journeys and handlers, on `goal/stage-1` | this goal's branch |
| **🔍 Reviewer** | a verdict on each pull request | anything it reviews |

When the user is stuck on something it can't fix inside `src/web/`, it opens a Snag issue in this goal's milestone and
moves on. It never writes a fetch or a hand-made form to get round a piece. The Snag form (`kind:snag`, K33) asks for
the same four things a snag log entry had: Hit (who, doing what, where), Lost (what it cost), Cause, and Fix (who owns
the paths it needs). The fix's pull request closes the issue.

## How this goal coordinates (K32, K33)

This goal coordinates itself, in whatever harness runs it, through the repository and GitHub only, never through a chat
or a coordinating session ([`../decisions/K32-goals-coordinate-themselves.md`](../decisions/K32-goals-coordinate-themselves.md)).

- **Milestone and labels** (K33, the `github` skill). Every pull request and issue of this goal carries the milestone
  `Goal 5: the UI layer` and the label `release:beta`; each pull request also carries its `role:` and `harness:` labels, and the
  template's "Harness and model" line. The lead keeps the front matter's `lead:` and `status:` current, and
  `node tools/github/sync.mjs --apply` mirrors them, and the slices, onto the goal issue.
- **The paths it owns:**
  - `packages/orthograph/src/modules/actions/` (M1.23) and its line in `packages/orthograph/src/index.ts`;
  - `packages/web/` (`@orthograph/web`);
  - the actions and web projections, `packages/projections/src/modules/{actions,web}/`, their lines in
    `packages/projections/src/main.ts`, and the generators' templates for them;
  - `examples/plugged-in/src/web/`;
  - this goal's checks (ST1.26, M1.22's and M1.23's) and the `e2e:ui-layer` target;
  - `design/goals/05-ui-layer.md`;
  - and only these lines of shared files: in `.oxlintrc.json`, `scope:web`'s module-boundary tags for `packages/web/`
    and the carve-out of `ortho/no-ui-in-worker` for `generated/web/` (K29 section 6); in
    `examples/plugged-in/generated/`, the new `actions/` and `web/` folders generate writes; in `e2e/project.json` and
    `.github/workflows/ci.yml`, the `e2e:ui-layer` target and its job; and what `pnpm install` writes to
    `pnpm-lock.yaml`.
  Nothing else is this goal's. Touching another goal's path is a cross-goal ask, never a quiet edit.
- **Where it stands.** The lead rewrites "Where it stands" at the end of this file in every pull request that merges
  into `goal/ui-layer`: what landed, what is open, what it waits on, in two or three lines written for Aaron's ear. That is the
  report; nobody is messaged. This goal's own snags are Snag issues in its milestone (K33), and only its own.
- **Asking another goal for something** is an Ask issue (the Ask form, `kind:ask`) in the milestone of the goal
  that must act (`Goal 3: stage 1, hill-climbed`, `Goal 6: the new portal`), naming this goal and what done looks like. Never push to another goal's branch or edit its files by pull request; the
  owner acts on the issue.
- **Asks to this goal** are open Ask issues in its milestone (`kind:ask`). Read them at the start of every slice, after merging
  `goal/stage-1` in, and close each with the pull request that answers it.
- **Decisions** this goal makes are named by area and a slug (`WEB-<slug>`, as in `WEB-piece-state`), never numbered. Before using a name, check
  that no file starts with it on `main` or any open branch (`git ls-tree -r --name-only origin/<branch>
  design/decisions/`), and list it under "Decision IDs" below.
- **Changing an agreement** below is an Ask issue in the other goal's milestone; each lead then edits only its own brief.
- **Branch protection** on `goal/ui-layer` is set by the conductor before this goal starts (K32). If
  `gh api repos/Open-Harness/orthograph/branches/goal/ui-layer/protection` finds none, write that in "Where it stands" and stop
  before the first pull request.

## The agreements (21 November 2026)

Made by the conductor and the 📐 designer thread, under Aaron's standing authority, when Goal 6 was split off. They
hold whoever leads either goal; changing one starts with an Ask issue in the other goal's milestone.

1. **The theme is Goal 6's.** `@orthograph/theme` is Goal 6's first slice, landed in `goal/stage-1` on its own. Until
   it lands, the pieces use UI SDK's default tokens; this goal's screens slice (slice 5) takes it up.
2. **The app-map language is additive.** Goal 6 brings it in as new modules, registered in a few named files, and a
   blueprint that declares no app and no pages generates byte-identical output, which Goal 6's check proves. So this
   goal's "existing generated files unchanged" keeps holding while Goal 6 lands.
3. **Neither goal edits the other's packages.** This goal owns the actions module in `orthograph`, `packages/web`, the
   actions and web projections and `examples/plugged-in/src/web/`. Goal 6 owns `packages/theme`, `packages/shell`,
   `packages/portal-next`, the app projection and the `app` modules. A need on the other side is an Ask issue in that goal's milestone
   (above), never an edit.
4. **This done check never waits on the map.** Plugged In's pages are declared in the map language as a follow-on,
   once Goal 6's map landing reaches `goal/stage-1` (see "Where it meets Goal 6").
5. **The waits.** The screens (slice 5) wait on ST1.03, Goal 3's handles plugin. The sign-in piece waits on M2.05 and
   M2.06, Goal 3's auth plugin; until then the screens use the test people Plugged In's journeys use, and ST1.06 is not
   in this done check.
6. **The portal is Goal 6's.** It is rebuilt beside the old one; a list of the portal checks the new client fails only
   shrinks; cutover lands in `goal/stage-1` only after Goal 3's lead agrees the freeze on an Ask issue in Goal 3's milestone, with Goal 3's
   lead's yes on the cutover pull request and a 🔍 pass.
   This goal never edits either client.

## The slices

Each slice starts with its check, written first and failing, and ends with that check green on `goal/ui-layer`.

### Part 1: start today, beside Goal 3 and Goal 6

These touch only new code and their own checks, none of what Goal 3 or Goal 6 is changing.

| # | Slice | Done when |
|---|---|---|
| 1 | **M1.23, the actions module** in `orthograph`, in Effect, agent-native's field names; and the `e2e:ui-layer` target (checks author), red until the goal is done | M1.23's check |
| 2 | **ST1.26, the web projection's checks** (checks author), on Plugged In, against empty pieces: a name claimed once `--through web`, `HandleTaken` with `HN-001` under the field and failing an agent's step, a release that waits for a person's yes, a read that loads again after a write, pending observed before the answer | they fail with the web projection empty |

### Part 2: after Part 1, merging Goal 3 in often

| # | Slice | Done when |
|---|---|---|
| 3 | **M1.22, the actions projection**: one generated action per operation in `generated/actions/` | M1.22's check |
| 4 | **ST1.25, the web projection**: `@orthograph/web` (the browser host and the piece runtime), the pieces' templates, `--through web` in Chromium, and `ortho/no-ui-in-worker` carved out for `generated/web/` with check 26 still holding the Worker line (K29 sections 3 and 6) | ST1.26's checks |
| 5 | **ST1.04's three screens** (the user): `/@:handle`, `/claim` and `/edit` in `examples/plugged-in/src/web/`, built on the pieces, with the app's own link list (K29 sections 4 and 5), routed in `src/web/main.tsx` until the map language lands; on `@orthograph/theme` if Goal 6's theme landing has reached `goal/stage-1`, else UI SDK's default tokens. Needs ST1.03 (Goal 3's handles plugin) | in Chromium a claim and a link show on `/@aaron`; Plugged In's claim, links and page journeys pass `--through web` |

### Where it meets Goal 3

- **The screens are part of Goal 3's done check.** `nx run e2e:stage1` needs every stage 1 journey green, and ST1.04
  is a stage 1 slice. Goal 3 builds ST1.04's `profile`, `link` and handlers; this goal builds its screens. Slice 5
  lands in `goal/stage-1` before Goal 3 can finish.
- **The sign-in piece waits for the auth plugin.** Signing in on a page needs `@orthograph/auth`'s identity (M2.05) and
  its ways in (M2.06), both Goal 3's. Until they land, the screens claim and edit as the test people Plugged In's
  journeys already use. ST1.06 (the pieces behind a signed-in session) is built after M2.06, in whichever goal is open
  then; it is not in this goal's done check.
- **Goal 3 changes nothing here.** It never waits on this goal, and its model work merges in at every slice.
- **Where it meets Goal 6.** Goal 6 owns `@orthograph/theme` and lands it in `goal/stage-1` first; slice 5 takes it
  up. Goal 6 then lands the map language and the shell. **The follow-on, not in this done check:** once they are on
  `goal/stage-1`, Plugged In's three pages and its link list are declared in `blueprint/app/` (K31, K36) and `main.tsx`'s routes give way to
  the generated route table, as one small slice in whichever goal is open then. The pieces and the shell meet only
  through a page's `shows` and `offers`, so neither goal edits the other's packages.

## Decision IDs

K29 settles the shape. A question the slices raise is a decision named `WEB-<slug>` (K32), never a number, so no
allocator is needed: check the name is free, then list it here in the pull request that adds it.

| ID | File | Taken by |
|---|---|---|
| WEB-approval-declined | [`../decisions/WEB-approval-declined.md`](../decisions/WEB-approval-declined.md) | slice 1: a person's no is `ApprovalDeclined`, `AR-003` |

## The done check

```bash
nx run e2e:ui-layer
```

It passes only when all of these hold, in CI on `goal/ui-layer`:
- ST1.26's checks, and M1.22's and M1.23's, are green;
- Plugged In's claim, links and page journeys pass `--through web`, with their test people, and the same verdicts as
  over HTTP;
- in Chromium a claim and a link show on `/@aaron`, built from the pieces, with no fetch in `src/web/`;
- check 26 still passes, and acme's and Plugged In's existing generated files are unchanged (only
  `generated/actions/` and `generated/web/` are new);
- every Snag issue in this goal's milestone is closed, fixed or parked with an owner and a reason.

## Landing

When `nx run e2e:ui-layer` passes, open one pull request from `goal/ui-layer` into `goal/stage-1`, since Goal 3 is open
and its done check needs the screens. Merge `goal/stage-1` in first, by a merge. It merges when CI is green, Goal 3's
checks still pass on it, and a 🔍 reviewer has passed the whole branch, reading this file, the goal's Snag issues, each slice's
check and the evidence below. It reaches `main` with stage 1.

## Evidence for Aaron

- **The DX trial:** what a person writes, in full (Plugged In's `src/web/`), beside what was generated for it.
- **A browser video,** recorded by Playwright, of a claim, a taken name refused under the field, three links added and
  ordered, and the public page; then the same flow driven by an agent in the browser, waiting for a yes on release.
- **The Snag issues,** each closed by its fix, and each slice's check with its run.

## Estimate

From Goal 3's pace (a medium slice takes three to six hours from opening to merge, checks first).
- Part 1: about 4 to 8 hours. M1.23 is a small slice with agent-native's shape already spiked.
- Part 2: about 16 to 24 hours. The web projection is the new machinery; #222 proved each part by hand.
- Both: about 20 to 32 hours of continuous running, with slice 5 waiting on Goal 3's ST1.03.

## Where it stands

22 November 2026. The goal has started, led from Claude Code. Its branch has caught up with stage 1 (the brief here is
the newest copy, from `main`). Nothing is built yet; next is slice 1, the actions module's failing check, then its build.
