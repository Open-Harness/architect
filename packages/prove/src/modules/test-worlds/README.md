# test-worlds

Worlds inside the long-lived test environment (D3 #7, #50). `TestWorlds.create({ url, id, lifetimeMs })` asks the
environment's `/_world/worlds` door (host-cloudflare's `world` module) for a world: a Durable Object of its own, an
alarm at its expiry, and the high-water marks of every table, so that destroying it deletes exactly what it made.
The environment holds one live world at a time; a second is refused naming the first. `destroy` removes one now.
`live(url)` counts them (`env status test` prints `worlds <n>`), and is `undefined` for an environment that hosts none.
`reap({ root, name })` starts the environment if it is down (alarms only fire while a workerd runs), destroys every
world past its lifetime, counts each expiry once (a second reap says 0), and stops the environment again if it started
it. `parseLifetime` and `formatLifetime` read and write `20s`, `30 minutes`, `2 hours`.

Test: `test-worlds.test.ts`, the L2.02 done-when checks, on ports 8970 to 8989 with the real OIDC issuer process (@orthograph/services), the
real logbook and the real test environment: `prove --env test` posts verdicts the logbook reads back and leaves no world
or row; a run killed with SIGKILL and a 20 s lifetime leaves a world that `worlds reap` removes after expiry.
