# @orthograph/portal

The read-only portal every project gets (layer 2, L2.10; F1, D3 #130 to #138; K19). It has two halves, and only the small one goes into a
project's Worker.

- **The server half, `@orthograph/portal/server`** (`PortalServer`): the data API at `/_portal/v1/*` (the blueprint, the snapshot of proof) and the
  prebuilt client's static files at `/portal`, from the Worker's assets binding. The generated `generated/portal/main.ts` imports only this,
  with the project's `blueprint.json` (made by `@orthograph/generators`) and the logbook's address from the Worker's variables. It imports no
  React, no `@orthograph/portal-ui` and no HeroUI (`ortho/no-ui-in-worker`), so a project builds with no HeroUI licence.
- **The client** (`src/main.ts` and `modules/pages`): React pages drawn in the browser from `/_portal/v1/*`, with `@orthograph/portal-ui` (a
  devDependency: a build input, never shipped). `nx run portal:client` builds it with vite into `dist/client` (HTML, JS, CSS), once, where the
  HeroUI Pro licence is; `ortho build` copies those files into the revision (`.ortho/artefacts/<revision>/portal/`). A machine without the
  licence cannot build it, and never needs to.

- `wire`: the versioned JSON the app reads, its digest, the decoder that rejects an unknown schema or a digest mismatch, and the
  JSON-only adapter for what a proof rests on (kept equal to `Compare.dependsOn` by the generators' tests).
- `reader`: the logbook's open reads, injected (`Reader.http`); a logbook that does not answer is never "no verdicts".
- `snapshot`: per operation and environment, `recorded-pass`, `failed`, `stale` (with the changed declarations), `unproven` or
  `unavailable`; the latest failure wins, and nothing that could not be read is ever green.
- `live`: the live view of one call, joined from a trace source and the world's journal.
- `server`: `PortalServer.handle` (data only) and `PortalServer.serve` (the Worker's route).
- `pages`: the client. Every page is `main[data-portal="page"]`, `data-ready="true"` once drawn and `data-status` its own verdict.

Tests: `nx test portal`. `snapshot/logbook.test.ts` runs the real logbook and a real OIDC issuer process (@orthograph/services) (ports 9090, 9091).
The pages are read in a browser by check 21 and the grid (`e2e/served-portal`, headless Chromium).
