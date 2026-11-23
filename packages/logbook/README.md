# @orthograph/logbook

Verdicts and the model, kept per project (D3 #3, #8; decisions #30 to #34). A worker on workerd: a Durable Object holds
the verdicts and releases, R2 holds each revision's model, and every write needs an OIDC token from the one issuer its
environment names. The routes are listed in `src/modules/http/types.ts`.

- `src/main.ts` is the worker's entry; `wrangler.jsonc` its bindings.
- The package's export is how to run it: `Logbook.launch`, `.ready`, `.discoverJwks`, `.start` (module `local`).
- Modules: `tokens` (verification and policy), `book` (the ledger), `http` (routes), `local` (running it here).
- Test: `nx test logbook` runs the worker under `wrangler dev` on ports 8930 to 8949 with a OIDC issuer process (@orthograph/services).
