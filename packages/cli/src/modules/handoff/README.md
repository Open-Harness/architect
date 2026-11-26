# handoff

A globally installed `ortho` hands the whole command line to the app's own `@orthograph/cli` when the app has one
installed, and runs itself only when it hasn't. An app's journeys and mounts import the app's copy of `orthograph`; a
global `ortho` that compiled them with its own copy would hold two copies of every declared error, and a refusal a
journey expects (`NotAllowed`) would not be recognised as the same one. `ortho check` then reported drift that the app's
own CLI does not (#1151).

`Handoff.target({ from, own })` looks for `node_modules/@orthograph/cli` from `from` (the `--root` given, else the working
directory) up to the filesystem's root. It answers that package's `ortho` entry, read from its `package.json` `bin`, when
the package is not this CLI itself (compared by real path), and nothing otherwise. `Handoff.from(args, cwd)` reads `--root`
the way the parser does. `main.ts` runs the entry with the same arguments and exits with its status. It sets
`ORTHO_HANDED_OFF` on the child, so a hand-off happens at most once. Test: `handoff.test.ts`.
