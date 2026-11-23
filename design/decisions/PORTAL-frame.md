# PORTAL-frame: the new client's frame

Decided 23 November 2026, Goal 6 slice 6 (portal builder). `packages/portal-next`, built against `design/portal.md` ("The frame"), check 21's hooks
and the shell's contract (`MAP-shell`). The pages stay as `portal.md` agreed them; this changes how the portal is built, not what it shows.

## What was decided

1. **The portal is a project of its own.** `packages/portal-next` has a `blueprint/` (`app/` and `projections/app.ts`), is compiled by the real
   compiler, and mounts the app projection, so `generated/app/` (routes, links, navigation, palette, the agent's map) is checked in beside it. Its
   map is fifteen pages (`blueprint/app/pages/`), the five tabs of an operation as five components, and five navigation groups. A page whose data
   comes from the data API shows no read and types its parameter with a value (`Blueprint.text()`), as K31 says. No address is matched by hand:
   the shell's router reads `routes.json`, the links are `links.ts`, and the rail's panels are `navigation.json`.
2. **The layout is `none`; the portal draws its own frame.** `portal.md`'s frame is a top bar, an icon rail with panels, a tree, a reading column
   and a live rail. The shell's `sidebar` and `topNav` draw the map's navigation as foldable groups, which closed groups do not keep in the page;
   check 21 reads every panel's pages at once and `rail-icon` and `panel-page` hooks. So the five navigation groups (`things`, `proof`,
   `reference`, `plugins`, `monitor`) are the rail's five panels, read from `navigation.json` by `panels`, and the frame is drawn by each page
   inside the shell's page element. The open panel is remembered across pages, since a page is drawn afresh on every move.
3. **The data is the data API, as it is.** `data` reads `/_portal/v1/blueprint` and the snapshot for its digest, as an Effect, into one store;
   `main.ts` (the one entry that runs an effect) settles it. Types are the wire's own (`@orthograph/portal`, type imports only). `live` derives the
   rail's numbers from the snapshot's `telemetry` and says `not yet` where there is none. No field was invented.
4. **⌘K is the portal's own search over the model.** The shell's palette lists the map's pages and operations; the portal's search is things,
   operations, journeys, refusal codes, environments and monitor, from one index in the page (`search-index`). The shell opens its palette on the
   same keys, so the portal's listener takes the key first, in the capture phase. That is a workaround the shell should make unnecessary
   (Snag: the shell's palette takes no entries from data).
5. **Pages beyond the frame are stubs** carrying their `data-portal="page"` hook and the frame; slices 7 to 10 fill them. A route naming a thing,
   an operation or an environment the blueprint does not declare is a 404 page.
6. **Dependencies:** `react` and `react-dom` at the workspace pin, `@ui-sdk/core` and `@ui-sdk/react` at exactly `0.1.0-beta.10`, `effect` at the
   workspace pin, the workspace's own packages. `.oxlintrc.json` gains `scope:portal-next` (the theme, the shell, `orthograph`, the projections and
   `@orthograph/portal`'s types). It builds with `HEROUI_AUTH_TOKEN` unset and imports no HeroUI.

## What the data API lacks, for the lead

Nothing the frame needed. For slice 7, the operation page's tabs are `?tab=` (check 21 J), and the shell's router matches the pathname only and
gives a page its parameters, not the query; a page reads `location.search` itself, and a move between tabs does not repaint it. If the tabs should
be addresses the map knows, that is a map decision, not the data API's.

## Supersedes

None.
