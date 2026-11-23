# K19: the portal ships prebuilt, so no project needs a HeroUI Pro licence

> **Superseded by K24, 20 November 2026:** once the portal is on UI SDK (`K24-ui-sdk.md`) no licence is needed at all; shipping prebuilt stays until then.

Decided 19 November 2026 by the conductor, after the M1 lead found that layer 2 can't build without the licence.

## The problem, in code

The generated portal entry imports the whole portal package into the project's Worker:

```ts
// packages/generators/src/modules/portal/internal/main.ts:15 (m1-13-portal)
import { Portal, type PortalEnv } from "@orthograph/portal";
```

`@orthograph/portal` renders React with `@orthograph/portal-ui`, and `portal-ui` imports `@heroui-pro/react`
(`portal-ui/src/modules/{shell,data,content,chat,styles}`). So every project's Worker bundles HeroUI Pro from source.
That breaks three ways:

- layer 2 can't build a generated project in CI without the licence token;
- every Orthograph user would need their own HeroUI Pro licence just to build their app;
- the Worker carries a React UI it never runs on the server.

## The decision

The portal has two halves, and only the small one goes into a project:

1. **The client, built once, in this repository.** `@orthograph/portal` builds its pages, with `portal-ui` and HeroUI
   Pro, into static files (`dist/client/`: HTML, JS, CSS) at our build, where the licence is. The built files are what
   ships, never the Pro source.
2. **The server, in every project.** The generated Worker imports only `@orthograph/portal/server`, which serves those
   static files at `/portal` (Workers static assets) and the data at `/_portal/v1/*`: the blueprint, the logbook and
   telemetry. It imports no React and no HeroUI.

A lint rule enforces the line: nothing reachable from `@orthograph/portal/server`, or from generated code, may import
`react`, `@orthograph/portal-ui` or `@heroui-pro/*`. The M1.34 rule (Pro only inside `portal-ui`) stays.

## How the portal checks read it

Check 21 (the portal as a viewer: M1.13's tests and #98's) today reads server-rendered HTML from `Portal.handle` and
asserts on its `data-portal` hooks. With a prebuilt client the HTML is only a shell, and the pages render in the browser
from `/_portal/v1/*`. So the checks read the portal the way a person does: the served portal opened in headless
Chromium through Playwright, with the same `data-portal` hooks and content asserted on the rendered page, and the data
API asserted directly where a test is about data. The hooks stay; only how the check gets the page changes.

Rendering each page at the project's build is ruled out, because it would bring React and HeroUI Pro back into every
project's build. Changing check 21 is a checks slice: its author does it, never the builder (`AGENTS.md`). M1.13's
"screenshots byte-identical across two runs at the same `now`" still holds, now taken from the browser.

## In CI

Only the job that builds `@orthograph/portal`'s client needs the `HEROUI_AUTH_TOKEN` secret, which is already set on the
repository. Layer 2 and every generated project build with no licence. The secret is used only in Actions, never read,
printed or written.

## Still Aaron's

Shipping compiled Pro components inside a published npm package is a licensing question. Nothing is published outside
the local registry until M7.02, so nothing is distributed before Aaron decides it, with HeroUI's terms in hand.

## How it was built (the builder, 20 November 2026)

The calls the decision left to the build, each with the reason:

- **The Worker answers first, and reads the files through a binding.** The Worker's config binds the client as static assets
  (`assets.binding` `PORTAL_ASSETS`, `run_worker_first`), and `@orthograph/portal/server` serves `/portal` and under it from that binding:
  a file is that file, a path with no file type is `index.html` (the single-page fallback, made by the server, since the platform's own
  fallback looks only at the assets' root), a missing file is a 404. Serving the folder natively would have put `main.js` and its
  source map in the assets, or needed a `portal/` folder inside the folder the revision keeps; the binding keeps the assets exactly
  `.ortho/artefacts/<revision>/portal/`, byte for byte what `packages/portal/dist/client` is.
- **`generated/server/wrangler.jsonc` is not touched.** A run uses a config derived from it (`prove`'s `server-config` module): `main`
  and the migrations folders as absolute paths, plus the assets when the project's `@orthograph/portal` has a built client. A world
  writes it to `.ortho/<name>/wrangler.jsonc`, a build beside its scratch folder, an environment as it did before with the assets added
  (the revision's own `portal/` folder). With no built client the config is the generated one, the Worker says `/portal` has no client,
  and nothing else changes: a machine without the licence still builds, proves and runs everything.
- **The client is built by `nx run portal:client` (vite) and nowhere else.** Without the real HeroUI Pro build
  (`pro.mjs require`) it fails with a message that starts `K19: unavailable`: no stub, no skip. The portal-ui CI job, the only one that reads the
  token (the way it already does, no new secret), builds it, and uploads `dist/client`
  as the `portal-client` artifact, and the jobs that read the portal (`e2e-m1`, `e2e-grid`, `e2e-layer2`) download it. `dist/` stays ignored: the
  built files are never committed.
- **The lint rule** is `ortho/no-ui-in-worker` (`packages/lint`), on for every `generated/` folder and all of `packages/portal/src`, off for the
  client half: `src/main.ts` and `src/modules/pages/`. Its diagnostic starts `K19:` and names the module.
