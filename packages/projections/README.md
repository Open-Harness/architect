# @orthograph/projections

The projections Orthograph ships, each a plugin of kind `projection` that an app mounts in `blueprint/projections/<name>.ts`
([`design/decisions/M1-plugins.md`](../../design/decisions/M1-plugins.md) sections 2, 3 and 15;
[`design/history/retired-2026-11-23/frame/projections.md`](../../design/history/retired-2026-11-23/frame/projections.md) sections 1 and 2):

```ts
// blueprint/projections/server.ts
import { Blueprint } from "orthograph";
import { server } from "@orthograph/projections";

export default Blueprint.use(server);
```

Part one (M1.11) has `model`, `api` and `server`. The SDK, the CLI and MCP (M1.12), and the docs and portal (M1.13)
still render from the fixed list in `@orthograph/generators` and arrive here when those slices land.

A mount is what makes the output: `ortho generate` writes `generated/<mount>/` for each projection mounted and nothing for
one that isn't. A project that mounts no projection at all gets the three as if it had mounted them (see
`packages/generators/src/modules/render/internal/mounted.ts`).

The package is `env:build`: it runs where `ortho generate` runs and never in production. What it generates imports only
the language's runtime, `orthograph`, the host and the project's own code, never this package. The project may import it
(`scope:project` may depend on `scope:projections`, because a blueprint mounts it as it mounts any plugin).

`./shared` is for `@orthograph/generators` while the other projections wait on its fixed list: the names every renderer
shares, the handler scaffold and the empty server `prove` uses. It goes when M1.13 is done.
