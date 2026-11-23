# K41: the canon map, applied

Decided 23 November 2026 on Aaron's yes, relayed by the conductor, and carried out in one pull request into `main` by the
conductor's canon-map session. Grounded at `main` `990d4a17` and `goal/stage-1` `ea343643`.

## Aaron's words

Shown the canon map (the 📚 canon board, 21 and 22 November 2026: its clashes and its list of the old pages, each marked
retire, merge or keep), Aaron answered the last two calls on it in four words:

> "yes to the canon map"

The conductor relayed what that yes covers: one yes to the eight clashes already settled by newer decisions or code,
and one to the list of old pages, with three additions the conductor recommended: map each frame page to a canon page,
change `AGENTS.md`'s pointer to the package map in the same change, and add a row keeping Foreman's own future.

## The problem, in code

The canon (`docs/canon/`) was meant to be the one place that says what Orthograph is, but four older pages still said
it too, in older words, and three more said what was built in words that had gone stale. `AGENTS.md` sent every agent
to them first:

```md
<!-- AGENTS.md (main 990d4a17), "What this repository is" -->
Its design is in `design/`: the frame
(`frame/`), the milestones (`milestones.md`: M0 to M7, each slice with what it needs and the check that proves it), the
decisions (`decisions/`), `packages.md`, `spikes.md` and `spikes/`, and the design docs in `design/docs/`.
```

And the plan contradicted its own ticks a few hundred lines below:

```md
<!-- design/milestones.md:28 (main 990d4a17) -->
- **Not built anywhere:** plugins and mounts, adapters, the `agent`, `service` and `system` principals, secrets read by
```

while `M1.05` to `M1.14` (plugins, mounts, verbs, needs, adapter calls) are ticked done in the same file, each with its
check.

## Decided

### 1. The eight clashes

Each was settled by a newer decision or by code with a passing check; Aaron's yes makes the canon say so.

| # | Clash | The call | Where it lands |
|---|---|---|---|
| 1 | `main` and `goal/stage-1` have drifted apart | Read across both. The newest decision wins along the supersede chain; running code with a passing check beats prose. The canon lands on `main` and quotes `goal/stage-1`'s code. | this record; `docs/canon/status.md` says which branch each row was read on |
| 2 | Hooks became pieces | Pieces (K29). React hooks leave every live page; ST1.01 is replaced by ST1.25. | `status.md`, "App UI" and the standard library |
| 3 | Three plugin kinds or five | Five (K27): feature, adapter, projection, language, host. | `status.md`, "The five plugin kinds"; `design/handoff.md`'s K27 row |
| 4 | Which example teaches | Plugged In only (K9, K37). The sign-up sheet and the workshop leave the canon; acme stays the test fixture. | the old pages below; the canon's own rewrite under K37 |
| 5 | Is the request key traced? | Built: check 38 passes on `goal/stage-1` (`request.key` on every attempt's span of a keyed call). | `status.md`, the core |
| 6 | Is staging spiked or built? | The infra projection and `ortho env up` / `destroy` staging are built: checks 37 and 41 pass, run here with no credential. A live run is the staging workflow's. | `status.md`, stage 1 |
| 7 | The milestones file contradicts itself | The ticks and checks win. The "Not built anywhere" paragraph goes, and the status page reads the checks instead. | `design/milestones.md`, "What exists on `main`" |
| 8 | The portal's future | A new portal on UI SDK with a declared map (K29, K31), then one cutover; not a port of agent-native's pieces. | `docs/canon/outline.md`, the portal note; `status.md`, "App UI" |

### 2. The old pages: retire four, merge three, keep the rest

A retired or merged page is kept word for word as a dated record in `design/history/retired-2026-11-23/`, at the same
place under it as it had under `design/`, with its links re-pointed so they still open. Nothing is deleted from the
record, so a decision or the ledger that names an old path can still be followed.

| Page | Call | What happened |
|---|---|---|
| `design/docs/index.html`, the one-page docs | **Retire** | Moved to the record. Its link check (`design/docs/links.mjs`, `nx run docs:check`) is gone from CI; the canon's check took it over and now also reads the status page. |
| `design/frame/`, the 17 November frame | **Retire** | Every page moved to the record but `questions.md`, which stays as K2's reasoning. `design/frame/README.md` is now the map from each frame page to the canon page that replaces it. |
| `design/walkthrough/journey.md` | **Retire** | Moved to the record. The canon's `journeys` page replaces it. |
| `examples/signup`, the sign-up sheet | **Retire** | Retired as a teaching example. The code stays until its owning slice deletes it, ST1.08, a checks slice: Gate 1's check 08 and the M8 checks still run on it, and only their author may move them. |
| `design/scope.md`, the scope map | **Merge** | Into `docs/canon/status.md`, with clashes 5 and 6 and the rows checks 33, 36, 39 and 40 changed brought up to date. |
| `design/packages.md`, the package map | **Merge** | Into `status.md`, "The packages". `AGENTS.md` now points there. |
| `design/model/README.md`, the model draft | **Merge** | Its ideas, habits and three loops into the canon's first page, `orthograph.mdx`, "How to think in it"; its framework map and rough edges into `status.md`. Its five calls stay K30's. |
| `docs/canon/` pages and `outline.md` | Keep, rewrite | Onto Plugged In, under K37, page by page; not in this change. |
| `design/grid/` | Keep, refresh | The grid's data; its date and counts are refreshed by the grid's own goal. |
| `design/wayfinding/`, `design/state/index.html` | Keep | Dated records. |
| `design/portal.md` | Keep | The portal's working spec for its goal. |
| `README.md` | Keep, shorten | The goal in a paragraph, then links to the canon and its status page. |
| `design/milestones.md`, `design/goals/` | Keep | The plan; the status page is checked against it. |
| decisions, history, evidence, briefs | Keep | Dated records keep their words. |
| `.agents/skills/ui-sdk/` | Keep | UI SDK's own skill, vendored. |
| `design/ui/heroui-inventory.md` | Keep until cutover | A record once the new portal's cutover deletes HeroUI. |
| `docs/canon/check.mjs` and the preview | Keep | The check gains the status page. |
| `design/naming.md`, `design/later.md`, `design/build-plan.md` | Keep | The rules for words; ideas for later; layers 1 and 2 as built. |
| `design/foreman/` | **Keep: Foreman's own future** | The agency agent's own design, apart from the framework's canon. It grows into its own app and is not merged into Orthograph's docs. |

### 3. Live links

Before the move, `git grep` found every live reference to the retired and merged pages on `main` and on
`goal/stage-1`. Each live one was re-pointed in this change: `AGENTS.md`, `README.md`, the kanban skill's `STATE.md`
and lane data, the live goals (5, 6, 10, 17), `design/handoff.md`, `design/portal.md`, `design/milestones.md`, the
canon's README, outline and pages, nine package READMEs, two code comments, and the grid's and check 12's citations. The
grid eval, its test and check 12 change only the path they cite, never what they check. Goals 1 and 2 are finished
goals whose quoted prompts are records (goal 1's prompt is one in `e2e/m0/names.test.ts`), so they keep the paths they
were written with.
Dated records keep the paths they were written with, and the folder map in `design/frame/README.md` leads from each old
path to its new home.

Six files exist only on `goal/stage-1` and cite `frame/secrets.md` in comments: the M2 secrets checks
(`e2e/m2/02` to `04`, `e2e/m2/secrets-support.ts`, a fixture's `secrets.ts`) and
`packages/orthograph/src/modules/secrets/declared.test.ts`. They are checks, so their author re-points them when `main`
next merges into `goal/stage-1`; `design/frame/README.md` names where `secrets.md` went.

## Supersedes

- AGENTS.md: "the design docs in `design/docs/`" → "its status page, `docs/canon/status.md`, says what is built and maps the packages (K41)"
- design/milestones.md: "Not built anywhere:" → "What is built today"
- docs/canon/outline.md: "It is our own template on pieces ported from agent-native" → "a new client built on UI SDK with a declared map (K29, K31), which replaces the old one in one cutover (Goal 6)"
- docs/canon/README.md: "stays the single source until the canon covers what it covers" → "The canon replaced the old one-page docs, `design/docs/index.html`, on 23 November 2026 (K41)"
- design/scope.md: "Request key in traces | None" → "Request key in traces | Built"
- design/scope.md: "no `ortho env up staging`, no infra projection" → "The infra projection and `ortho env up` / `destroy` staging | Built"
- design/handoff.md: "the three plugin kinds: language, host, projection" → "the plugin kinds: language and host beside feature, adapter and projection, five in all"
