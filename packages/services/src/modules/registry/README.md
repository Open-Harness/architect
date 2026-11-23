# registry

`Registry.start({ dir, port? })`: Verdaccio as a process of the caller's scope (K10 section 8, M1.33), from the pinned
`verdaccio` package under the Node that runs the caller. It listens on `127.0.0.1` only, keeps its storage in
`dir/registry` and writes its own config to `dir/verdaccio.yaml`. Ready once `/-/ping` answers. It makes a throwaway user
and writes that user's token to `dir/npmrc` (mode 0600), for this registry's address alone: the token is in no other file,
output or command line.

The project's own names (`@acme/*`, `acme`) and Orthograph's (`orthograph`, `@orthograph/*`) are anyone's to publish and
read, and never proxied to npm; every other name is, so an install finds its dependencies. Nothing is a container: the
storage is plain files under `dir`, which the caller removes.

Test: `registry.test.ts`.
