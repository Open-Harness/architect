# sandboxes

The bridge's core, and the sandbox adapter's calls (GOAL17-check-harness, call 4): `open`, `close`, `exec`, `write`, `read`, `list`,
and what a check reads, `seen` and `left`. `Sandboxes.make(config)` holds the open sandboxes of one bridge; it has no I/O of its
own: the disk, the ids, the clock's `now` and the daemon's path are given.

- **A sandbox** is `<dir>/sandboxes/<id>` (a folder, and nothing else is in that folder), `<dir>/shims/<id>` (the blocked
  commands' shims and their log), one `pi-env serve` for Pi's tools and its socket (`relay`), and one scope that owns them all.
  `open` is by `(owner, tag)`: a retry finds the same sandbox. `SandboxLimit` past `limit` open ones.
- **The environment** of every process is `environment`'s: four built-ins, the sources' variables, Settings'. The bridge's own
  environment is never inherited. A credential reaches one `exec` only as its `lend` (`loans`).
- **Refusals** are by name: a `write`, `read` or `exec` `cwd` outside the root is `OutsideSandbox` (`fence`); an `exec` whose first
  word is blocked is `BlockedCommand`, and so is one a shim refused (exit 126). Each is also recorded in `seen`, with the exit
  code of every command, which is where a check reads "refused by name" from. Commands Pi's tools run through the socket are
  recorded the same way (`relay` reports them).
- **Nothing outlives its sandbox.** An `exec` runs in its own process group and the group is killed when the call ends, times
  out (`exit 124`, default 120 s, through `Timers`), is interrupted, or the sandbox closes. `close` stops the daemon (SIGTERM,
  then SIGKILL, and waits), closes the socket and removes both folders; a second `close` answers `closed: false`. `sweep` closes
  every open sandbox and removes a crashed bridge's folders, and runs when the bridge starts and when it stops.
- `left` is the bridge's own count (folders in `<dir>/sandboxes`, live processes it started). The slice's done check does not
  trust it: it reads the disk and the process table (check 48).

Tests: `sandboxes.test.ts`, on real folders, the real pi-env daemon, real shells and real processes.
