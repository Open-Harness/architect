# world

`Worlds.start({ root, port, name, otlp? })`: a local world. The project's generated Worker on real workerd through
`wrangler dev`, with the world Durable Object and a fresh local D1 holding the model's tables, in
`.ortho/<name>/`. Each start makes a new world with a new secret for Better Auth, passed to wrangler as an
argument and never written to a file. With `otlp`, the Worker exports its spans and logs to that collector. Ready once
`/_world/health` answers; stopped, with wrangler, when the scope closes. `ortho dev` and `ortho prove` both use
it.

With the portal's built client in reach, the world runs a config derived from the generated one that serves it as static assets
(`server-config`, K19), written to `.ortho/<name>/wrangler.jsonc`.

`Worlds.launch({ config, state, port, log, pidFile, envFile?, ready })`: the same wrangler, kept: detached in its own
process group, on a config the caller made, with a `--persist-to` folder that survives restarts, `--inspector-port 0`,
and its secrets in an env file. Migrations are applied first, a taken socket starts it again, and it is ready once the
`ready` path answers. The caller keeps the pid and stops it: this is what `environments` builds on (D3 #4).

`chain` (M1.31): an effect the caller supplies that stands up the world's chain (`Anvil.start` from
`@orthograph/chain-evm`, wired by the composition root). It is acquired in the world's scope before the Worker and
released after it, and `Running.chain` carries its `rpcUrl` and `chainId`, so the chain is gone when the world ends.

`stands` (G16-adapter-mounts call 3): the mounts' stand-ins, which the caller starts once the world's state is wiped, so
`.ortho/<name>/stands/<mount>` survives. prove's `standIns` runs `node <orthograph.standIn> --port 0 --dir
<state>/stands/<mount>` in the package's folder for each mount whose model says `standIn.how === "process"`, never for
`none` or `vendor`, in a process group of its own. It reads the whole `stand-in listening on <url>` line and keeps draining
both pipes after it. An exit before the line, or 60 s without one, fails the world naming the mount. What it answers,
`ORTHO_STAND_<MOUNT>` and `<MOUNT>_API_KEY` = `world-<mount>`, joins `secretEnv`. Like the chain, the stand-ins are
acquired before the Worker and released after it: SIGTERM to each group, then SIGKILL to the group once the stand-in has
gone or 5 s have passed, all of them together, so whatever a stand-in started goes with it. A model with a process
stand-in never reuses `ortho dev`'s warm world, which has none (`design/later.md`).

Test: `world.test.ts`.

L2.O: `environment` (default `local`) is the `ORTHO_ENVIRONMENT` var, written on every span as `deployment.environment`. `secretEnv` (from
`Sinks.resolve`) goes to wrangler through its process environment, which wrangler hands to the Worker as secret bindings, never a file or an
argument; wrangler then runs with an allowlist of the shell's environment (D3 #109).

A world of `ortho dev` is also kept for `ortho prove` to use (`warm`, ST1.24): `ortho dev` starts a collector and a portal feed beside it, and `Worlds.start` is given their URLs.
