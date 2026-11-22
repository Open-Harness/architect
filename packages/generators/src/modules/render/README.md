# render

`Render.files({ name, model, root })`: an Effect of every file of `generated/` from the model, plus one handler scaffold
per operation. No file system is written, so it is tested without one. What a project mounts in `blueprint/projections/`
makes its folder: the model, the api, the server, the sdk, the cli and the mcp are `@orthograph/projections` (M1.11, M1.12), loaded from the mount files at
`root` (`internal/mounted.ts`), each file under `generated/<mount>/` with its first line naming the mount. A model that
mounts no projection gets those six as if mounted, headers as they were. Still fixed here, until M1.13: `generated/docs`, `generated/portal` and the handler scaffolds. Generated files start with the do-not-edit line; scaffolds say where they came from
and are the project's from then on.

A move made by time says when it happens (`internal/when.ts`, in M8-checks call 10's words): on its operation's docs page
and its thing's page, in its MCP tool description (plain text) and in its handler scaffold. A blueprint with none renders
byte for byte as before.

The CLI's session commands are special when the model has the starter's `session.sign-in` and `session.show`
(`internal/cli-session.ts`): `--env <env>` signs in by device code and shows the person that environment's kept session
belongs to; without it they are the operations' own commands. The device flow and the kept session are
`generated/cli/src/session/device.ts`, self-contained, so the CLI needs no package beyond Effect and the SDK.

A project with declared database stores (K3) gets, per store, a `DB_<STORE>` binding in `wrangler.jsonc` (with its own
placeholder id and `migrations/<store>` folder), a `generated/server/migrations/<store>/0001_things.sql` of its things
with its own journal, and `StoreD1.layer({ stores })` and `JournalD1.across` in `main.ts`. A project with none renders
exactly what it did before. Test: `stores.test.ts` (acme with the `vault` fixture feature mounted).

A verb that is a reserved word (the wallet's `import`) is never a `const` of its own in generated code: the SDK, CLI and scaffold bind it as `import_` and the SDK and CLI export it under its name (`export { import_ as import }`), so `Sdk.wallet.import` and the CLI's `wallet import` work (`names.ts`: `local`, `exportedAs`). Test: `render.test.ts`.
