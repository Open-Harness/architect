# starter

What `create-nx-workspace <name> --preset=@orthograph/preset` writes: `examples/starter`'s blueprint, handlers and
journeys, `generated/` rendered from the starter's compiled model under the new name (so nothing has to compile
before the workspace's packages are installed), a `package.json` with every `@orthograph/*` package at the preset's own
version and an `ortho` script, a standalone `tsconfig.json`, and ignores for `.ortho/` and `.wrangler/`.
The workspace's `pnpm-workspace.yaml` also exempts `orthograph` and `@orthograph/*` from pnpm's minimum release age (the framework is published as often as it is built; the age stays on for everything else).
The published package carries the starter under `files/`, copied from `examples/starter` when the preset is packed (`prepack`, `tools/release/starter.mjs`; never checked in); in the repository it reads `examples/starter` directly.
