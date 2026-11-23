# server

The portal's server half (K19), imported by a project's Worker as `@orthograph/portal/server`. It draws no page.

- `PortalServer.handle(context, request)`: an Effect giving a `Response` for `/_portal/v1/*` and a JSON 404 elsewhere. `blueprint`
  (ETag the digest) and `snapshot?digest=` (409 `BlueprintChanged` for another digest) are JSON; unknown `/_portal/` routes are JSON 404s.
  Read-only: only GET and HEAD.
- `PortalServer.serve(blueprintJson, request, env)`: `handle` for a Worker. The generated JSON is decoded once (a schema or digest it
  rejects is a 500 with the reason), the logbook's address comes from the Worker's variables and is never sent to a browser, and
  `/portal` and under it are the prebuilt client's files from the Worker's static assets (`env.PORTAL_ASSETS`): a file is that file, a
  path with no file type is the client's shell (`index.html`), and a file that is not there is a 404.
- `PortalServer.owns(path)`: the Worker's test for a path.

Nothing reachable from here imports React, `@orthograph/portal-ui` or HeroUI (the lint rule `ortho/no-ui-in-worker`, check 26).
