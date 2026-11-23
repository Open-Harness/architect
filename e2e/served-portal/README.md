# served-portal

The portal as a person meets it (K19, `design/decisions/K19-portal-prebuilt.md`). The project's Worker answers `/_portal/v1/*` (data, from
`@orthograph/portal/server`) and serves the portal's prebuilt client at `/portal` (static files); the pages draw themselves in the browser.
This module plays the Worker for a check, opens the result in headless Chromium (Playwright's own download, never Docker) and hands back
the rendered DOM, so check 21 and the grid's portal evals read what a person reads.

- `ServedPortals.open({ context })`: start a loopback server (data API from the server module, static files from `packages/portal/dist/client`
  with single-page fallback under `/portal`), and return `page(route)`, `shoot(route)` (PNG), `data(path)` and `close()`.
- `ServedPortals.open({ url })`: read a portal a real world serves (`Worlds.start`), the same way.
- `ServedPortals.pages(wire)`: the grid's page port, `(route) => Effect<html | undefined>`.
- `ServedPortals.closeAll()`: in `afterAll`, or at the end of a command.

A missing half is never a crash: `ServedPortalUnavailable`, whose message starts `K19:` and says what the builder owes.

## What the portal's builder owes (the contract these checks hold it to)

1. `@orthograph/portal` exports `./server`: `PortalServer.handle(context, request)`, an Effect that succeeds with a `Response` for `/_portal/v1/*`
   and a 404 elsewhere, taking the same context `Portal.handle` takes. No React, no portal-ui, no HeroUI.
2. `@orthograph/portal` builds `dist/client`: `index.html`, JS and CSS, served at `/portal` and under it (the client reads `location.pathname`).
3. Every page, once drawn, carries `<... data-portal="page" data-ready="true" data-status="200">` (`404` for a route that is not a page). The
   harness waits for it, and reads the page's status from it. The other `data-portal` hooks are check 21's, unchanged.
4. The client reads no clock: `now` comes from the data API. The harness fixes the browser's `Date` at 2001-09-09 (`CLOCK_ISO`), so a client that reads the time draws it, and check 21 E fails on that every run.
5. CI: the `e2e-m1` and `e2e-grid` jobs must build `packages/portal/dist/client` with the HeroUI token from Actions secrets before the checks run. No nx target does this yet; the checks only read the built files.

`served-portal.test.ts` tries the harness on a stand-in client and server, so it judges the instrument, not the portal.
