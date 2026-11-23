# pages

The portal's pages, drawn in the browser (K19). `Pages.App` is the one component the client's entry (`src/main.ts`) mounts: it reads the
route from the path (`routeOf`: home, a thing, an operation, or a path that is not a page), reads `/_portal/v1/blueprint` and the snapshot
for its digest (`load`, an Effect that fails with the request it could not read), and draws the page from that and from nothing else. It
reads no clock and no project source; a snapshot that could not be read is a page that says so, never a tick.

Every page is one `main[data-portal="page"]`, with `data-ready="true"` once drawn and `data-status` its own verdict (`404` for a route
that is not a page). The markup is plain headings, tables and lists on purpose: the grid's evals and check 21 read the rendered DOM.
The things on home are `@orthograph/portal-ui` cards; the frame, the rail and the counts are M1.13's.

This module is the client half of the portal: React and portal-ui live here and nowhere else in `@orthograph/portal` (the lint rule
`ortho/no-ui-in-worker` is off for it and on for the rest), and `vite build` bundles it, with HeroUI Pro, into `dist/client`.

**Rules (ST1.22, G5).** A thing's page has a Rules section under its lifecycle (`rules.tsx`, `Rules`), one row per rule of `things.<t>.invariants`, and an
Errors table. A refusal a rule owns reads as the rule's sentence with a link to the rule's row (`rules.tsx`, `Owned`, one markup on every surface: an
operation's refusals, a thing's errors, the reference page, and the generated docs the pages embed). An operation that is not a read has a spine
(`spine.tsx`), and one that can break a rule has a `rules` stop between its `move` and its `commit`. The sentence is `orthograph/sentences`'
`ruleSentence`, the one the docs and MCP say; nothing here writes a rule's name or words. A rule's refusal appears once on an operation's page, in its
refusals list, so the rules stop names rules and not refusals. Hooks: `design/decisions/ST1-22-rules-in-the-portal.md`.
