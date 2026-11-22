# Goal 5: the UI layer, on UI SDK

Branch `goal/ui-layer`, cut from `goal/stage-1`. Written 21 November 2026 with K29.

## Aaron's words

On 21 November 2026 Aaron asked for the UI layer to be designed on UI SDK, with HeroUI phased out (K24). The four
questions it raised were answered 1A 2A 3A 4A by the conductor, under the standing authority he gave it that day:
"anything that's waiting on me, just go with the recommendations. You have authority." So actions come into stage 1,
the screens are built from generated pieces, HeroUI leaves the portal now, there is one Orthograph theme on
UI SDK's tokens, and the beta generates React only ([`../decisions/K29-ui-layer.md`](../decisions/K29-ui-layer.md)).
The same day Aaron answered the app map grill (K31, [`../decisions/K31-app-map.md`](../decisions/K31-app-map.md)): the
portal is rebuilt as a new client on the app's map, by Goal 6 ([`06-portal.md`](06-portal.md)), so the portal and the
theme are Goal 6's. This goal's done check never waits on Goal 6: Plugged In's pages declare themselves in the map
language as a follow-on, once it lands.

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
> rewrite it at every slice merge. The conductor is whichever session runs the `conductor` skill;
> `.agents/skills/kanban/STATE.md` says where the whole project stands.
>
> Read first:
> - `AGENTS.md`, and this file word for word;
> - `design/decisions/K29-ui-layer.md` (the whole shape, with sketches), K31 (the app's map), K24, K13 and K28;
> - `design/frame/projections.md` 3.4 (the web projection) and the M1.22, M1.23, ST1.25, ST1.26 and ST1.04 rows of
>   `design/milestones.md`;
> - `spikes/ui-sdk-real-world/` (#222) and `spikes/ui-sdk-verb-primitive/` (#215), their READMEs first;
> - the `ui-sdk`, `conductor`, `reviewer`, `author`, `threads` and `kanban` skills.
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
> - **Reporting:** each time a slice merges, report to the conductor session (the `threads` skill names it), in two or
>   three lines: the slice, its check, its snags. Write for Aaron's ear.
> - **Branch protection:** ask the conductor to protect `goal/ui-layer` like `goal/stage-1` before the first pull
>   request (`design/decisions/CI-branch-protection.md`): its CI jobs must pass and every conversation be resolved.

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
    never change it. A field they need that the model lacks is a snag for Goal 3, not an edit here;
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

When the user is stuck on something it can't fix inside `src/web/`, it writes a snag in `design/goals/05-snags.md` and
moves on. It never writes a fetch or a hand-made form to get round a piece. The lead creates
`05-snags.md` in slice 1, in the shape of `03-snags.md`:

```md
## S-02 · ui · "the claim form can't show who holds the name"
- Hit: the user, writing `src/web/claim.tsx`: `HandleTaken` reaches the piece with its code but not its holder.
- Lost: 2 tries, 8 minutes.
- Cause: the piece's refusal part renders the code and message only.
- Fix: framework, the refusal part renders the declared fields an agent may see (PR #…). Docs: the piece's page.
- Status: fixed
```

## The agreements (21 November 2026)

Made by the conductor and the 📐 designer thread, under Aaron's standing authority, when Goal 6 was split off. They
hold whoever leads either goal; changing one goes through the conductor and is written here and in Goal 6's brief.

1. **The theme is Goal 6's.** `@orthograph/theme` is Goal 6's first slice, landed in `goal/stage-1` on its own. Until
   it lands, the pieces use UI SDK's default tokens; this goal's screens slice (slice 5) takes it up.
2. **The app-map language is additive.** Goal 6 brings it in as new modules, registered in a few named files, and a
   blueprint that declares no app and no pages generates byte-identical output, which Goal 6's check proves. So this
   goal's "existing generated files unchanged" keeps holding while Goal 6 lands.
3. **Neither goal edits the other's packages.** This goal owns the actions module in `orthograph`, `packages/web`, the
   actions and web projections and `examples/plugged-in/src/web/`. Goal 6 owns `packages/theme`, `packages/shell`,
   `packages/portal-next`, the app projection and the `app` modules. A need on the other side is a snag sent to its
   owner through the conductor.
4. **This done check never waits on the map.** Plugged In's pages are declared in the map language as a follow-on,
   once Goal 6's map landing reaches `goal/stage-1` (see "Where it meets Goal 6").
5. **The waits.** The screens (slice 5) wait on ST1.03, Goal 3's handles plugin. The sign-in piece waits on M2.05 and
   M2.06, Goal 3's auth plugin; until then the screens use the test people Plugged In's journeys use, and ST1.06 is not
   in this done check.
6. **The portal is Goal 6's.** It is rebuilt beside the old one; a list of the portal checks the new client fails only
   shrinks; cutover lands in `goal/stage-1` only with Goal 3's lead's yes and a 🔍 pass, agreed through the conductor.
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
  `goal/stage-1`, Plugged In's three pages are declared in `blueprint/app/` (K31) and `main.tsx`'s routes give way to
  the generated route table, as one small slice in whichever goal is open then. The pieces and the shell meet only
  through a page's `shows` and `offers`, so neither goal edits the other's packages.

## Decision IDs

The lead keeps this list (the `threads` skill: decision IDs come from one allocator; on a goal, the goal file). Ask the
lead for the next one before writing a decision file on this branch. None is reserved yet: K29 settles the shape, and a
question the slices raise gets the next free ID from `design/handoff.md`.

| ID | File | Taken by |
|---|---|---|

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
- every snag in `05-snags.md` is fixed, or parked with an owner and a reason.

## Landing

When `nx run e2e:ui-layer` passes, open one pull request from `goal/ui-layer` into `goal/stage-1`, since Goal 3 is open
and its done check needs the screens. Merge `goal/stage-1` in first, by a merge. It merges when CI is green, Goal 3's
checks still pass on it, and a 🔍 reviewer has passed the whole branch, reading this file, the snag log, each slice's
check and the evidence below. It reaches `main` with stage 1.

## Evidence for Aaron

- **The DX trial:** what a person writes, in full (Plugged In's `src/web/`), beside what was generated for it.
- **A browser video,** recorded by Playwright, of a claim, a taken name refused under the field, three links added and
  ordered, and the public page; then the same flow driven by an agent in the browser, waiting for a yes on release.
- **The snag log,** each snag linked to its fix, and each slice's check with its run.

## Estimate

From Goal 3's pace (a medium slice takes three to six hours from opening to merge, checks first).
- Part 1: about 4 to 8 hours. M1.23 is a small slice with agent-native's shape already spiked.
- Part 2: about 16 to 24 hours. The web projection is the new machinery; #222 proved each part by hand.
- Both: about 20 to 32 hours of continuous running, with slice 5 waiting on Goal 3's ST1.03.

## Where it stands
