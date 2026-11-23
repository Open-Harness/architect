# server-config

The generated Worker's `wrangler.jsonc`, read and derived (K19). The project's own file is never edited by a run. A world, a build or
an environment runs a config derived from it, and the derived one is where the portal's static files are added:

- `ServerConfig.clientOf(root)`: the portal's built client (`dist/client` of the `@orthograph/portal` the project resolves), or
  `undefined` when it has not been built. The client is built once, in this repository, with the HeroUI Pro licence; nothing here ever
  builds it, so a machine without it has a Worker with no portal pages (it says so) and everything else works.
- `ServerConfig.derive(root, baseText, assets)`: `main` and each migrations folder as absolute paths (the derived file lives in
  `.ortho/`), and, with a client, `assets: { directory, binding: "PORTAL_ASSETS", run_worker_first: true }`. The Worker answers every
  request first: `@orthograph/portal/server` routes `/portal`, serves the files through the binding and falls back to the shell for a route.
- `ServerConfig.parse(text)`: wrangler's JSONC, comments out.
