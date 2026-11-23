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
4. **⌘K is the shell's palette, with the model's rows added.** The portal passes `extra` (MAP-shell 12): things, operations, journeys, refusal
   codes, environments and monitor, read from the store, shown after the map's pages. The top bar keeps the `search-trigger` button and the
   `search-index` script check 21 reads; with layout `none` the shell draws no button, so the trigger sends the palette's own key. The app's 404
   (`notFound`, MAP-shell 13) draws the page hook and the frame, and `?tab=` reaches a page as its third argument (MAP-shell 14). (Snags #665 and
   #666 first had the portal take the key in the capture phase; removed.)
5. **Pages beyond the frame are stubs** carrying their `data-portal="page"` hook and the frame; slices 7 to 10 fill them. A route naming a thing,
   an operation or an environment the blueprint does not declare is a 404 page.
6. **Dependencies:** `react` and `react-dom` at the workspace pin, `@ui-sdk/core` and `@ui-sdk/react` at exactly `0.1.0-beta.10`, `effect` at the
   workspace pin, the workspace's own packages. `.oxlintrc.json` gains `scope:portal-next` (the theme, the shell, `orthograph`, the projections and
   `@orthograph/portal`'s types). It builds with `HEROUI_AUTH_TOKEN` unset and imports no HeroUI.

## What the data API lacks, for the lead

Nothing the frame needed. For slice 7, the operation page's tabs are `?tab=` (check 21 J); a page gets the query as `URLSearchParams`, and a change
of query paints it again (MAP-shell 14); `Body` already passes it.

## Supersedes

None.
