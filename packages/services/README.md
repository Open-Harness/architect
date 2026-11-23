# @orthograph/services

The stand-ins a world, a test or a gate needs around the framework, each a process and none a container (K10 section 8,
M1.33; Aaron quit Docker on 18 November): `Issuer` (an OIDC issuer of our own over `jose`, GitHub's token issuer's stand-in),
`Registry` (Verdaccio under Node) and `Owned` (the process each is started as, owned by PID). Private: it is never published,
and nothing shipped imports it. `@orthograph/prove` starts the Collector the same way (the pinned binary, in
`modules/telemetry`), with the same run-folder markers, so one `Owned.sweep` finds every process of ours.

`src/main.ts` is the process entry (`node src/main.ts issuer --port <n> --config <file>`). Tag `env:support`: tests and the
gates may depend on it, nothing else may.
