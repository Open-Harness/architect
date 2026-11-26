# handoff

A globally installed `ortho` hands the whole command line to the app's own `@orthograph/cli` when the app has one
installed, and runs itself only when it hasn't. An app's journeys and mounts import the app's copy of `orthograph`; a
global `ortho` that compiled them with its own copy would hold two copies of every declared error, and a refusal a
journey expects (`NotAllowed`) would not be recognised as the same one. `ortho check` then reported drift that the app's
own CLI does not (#1151).

`Handoff.target({ from, own })` looks for `node_modules/@orthograph/cli` from `from` (the `--root` given, else the working
directory) up to the filesystem's root. It answers that package's `ortho` entry, read from its `package.json` `bin`, when
the package is not this CLI itself (compared by real path); `broken` when such a package is installed but its entry can't
be read (a missing bin, a corrupt `package.json`), and `main.ts` then says so in one line and runs itself; and nothing
otherwise. `Handoff.from(args, cwd)` reads `--root`
the way the parser does. `main.ts` runs the entry with the same arguments, passes on
SIGINT, SIGTERM and SIGHUP, and ends as the child ends: its exit code, or the same signal. It sets `ORTHO_HANDED_OFF` on
the child, which takes it out of its own environment once read, so a hand-off happens at most once and nothing the child
starts inherits the mark. Test: `handoff.test.ts`.
