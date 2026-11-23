# local

The logbook worker on this machine: real workerd, through `wrangler dev` (4.156.1), with its Durable Object and R2
state in a `--persist-to` folder of its own, so it survives a restart. This is the seam the CLI uses for
`ortho env up logbook --port <n>`:

- `Logbook.launch({ port, state, policy })` gives `{ command, args, env }` to spawn as a long-lived process (the CLI
  keeps the pidfile). The policy is the token policy plus the issuer's `jwksUrl` (`Logbook.discoverJwks(issuer)` finds it).
- `Logbook.ready(url)` waits for `GET /health`.
- `Logbook.start({ ..., log })` is both, scoped: wrangler stops when the scope closes. Tests use it.

The policy travels as `--var` arguments, never a file; none of it is a secret. Nothing is left running when the scope closes.
Test: `local.test.ts` is L2.03's done-when check, against a real OIDC issuer process (@orthograph/services).
