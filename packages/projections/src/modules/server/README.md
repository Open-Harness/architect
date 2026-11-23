# server

The `server` projection: `generated/server/`, the Worker. Every served operation's route wired to its handler, the world's
door at `/_world/*`, the portal, the D1 tables and each declared store's own migrations, and the types of the handlers
that call an adapter. `emptyServer` is the same Worker with the original handlers for setup and a scaffold for journey
calls, which `prove` renders into a scratch folder and never into `generated/`. Test: `server.test.ts` (acme's committed
`generated/server/`); the store and call cases are `packages/generators/src/modules/render/stores.test.ts`.
