# GOAL17-slice9-sandbox: the calls slice 9's sandbox half made

Decided 23 November 2026 by the 🔨 builder of Goal 17, slice 9, sandbox half (`AGENTS.md`, "Who decides"), on `goal-17/s9-sandbox-build`, cut from
`goal-17/s9-agents-build`. It builds `@orthograph/sandbox`, its bridge and `lend`: K40 fixes 4 and 6, shaped by GOAL17-check-harness call 4. The harness
surface, the stand-in model, the agent caller and the agents runtime are the other half's. Local only (`playbook.sandbox: "local"`); E2B is a later yes.

## The calls

### 1. The package: an adapter whose runtime is a bridge process

`packages/sandbox` is an adapter plugin (`orthograph.kind: "adapter"`, `standIn: "src/main.ts"`). Where it differs from GOAL17-check-harness's sketch:

- **The descriptor is `src/adapter.ts`**, the package's root export (`src/index.ts`), with `blueprint/` holding only its README, as `@orthograph/github` does.
  An adapter declares nothing in `blueprint/`, and the compiler reads that folder.
- **The bridge's entry is `src/main.ts`**, not `src/stand-in/main.ts`: `ortho/effect-only` and the six-slot rule name `packages/<package>/src/main.ts` as the one entry,
  so that is where the process, the clock and the environment are read. `Stand.process("packages/sandbox/src/main.ts")`.
- **`seen` and `left`** are the routes `/_stand/seen` and `/_stand/left` and the types in `modules/sandboxes/types.ts` (`SeenSandbox`, `Left`, as the record has them,
  plus `loans`). The `Stand.command` descriptors that name them belong to the harness surface, which the other builder is making; they wrap these two routes.
- **The calls carry no typed `input` and `answer`** in the adapter: the framework's `Blueprint.call` takes `{ mode, errors }` only. The wire shapes are written once, in
  `modules/bridge/README.md` and decoded by `modules/bridge/internal/decode.ts`. A typed call is a framework change, not one this slice makes.
- **`lend` on `exec` is a list**, `lend: [{ name, value, scope, expiresAt }]`, not one value: a push needs a token and a `gh` call may need another.

Seven modules, six slots each: `disk` (the one port to the disk), `fence`, `environment`, `commands` (blocked names and their shims), `loans` (`lend`),
`relay` (the pi-env daemon and its socket), `sandboxes` (the registry and the calls), `bridge` (JSON over HTTP). Nothing in them reads the process: `main.ts` does.
Every wait is `Timers` (the exec timeout, the daemon's stop, its keepalive); all spawned processes are tracked, and killed by pid or by group.

### 2. pi-env 1.5.0, exactly, and what came with it

`@earendil-works/pi-env` 1.5.0 (2 November 2026; Pi Durable is pinned 1.5.0 by H1) is a dependency, for its prebuilt daemon (`localDaemon()`) and nothing else:
the relay speaks the frames itself. It brings Pi Durable's provider SDKs into the lockfile (74 packages). Two of them carry install scripts pnpm will not run unasked, which
made `pnpm install` exit 1 (`ERR_PNPM_IGNORED_BUILDS`), so `pnpm-workspace.yaml` lists `@google/genai` and `protobufjs` as `false`, with the reason beside them. The agents
half arrives at the same two when it adds Pi Durable; the lines are identical, so the merge is clean.

### 3. The relay: Pi's `ExecutionEnv` over a socket, with the fence at the wire

The bridge starts one `pi-env serve --token <hex>` per sandbox, in the sandbox's folder, with the sandbox's environment, and serves its frames on a loopback TCP port:
`address` is `tcp://127.0.0.1:<port>#<token>`. The relay swallows the daemon's `PI-ENV` sync line and writes its own to each client, so a client may reconnect; it serves one
client at a time; it pings the daemon every 5 seconds, so a daemon with no client is not taken for dead (30 s of silence ends it).

Pi's tools never touch the bridge's file API, so the fence cannot live there alone. **The relay reads every request frame**: a `path`, `to`, `cwd` or watch target that resolves
outside the root is answered by an error frame, `code: "OutsideSandbox"`, message `OutsideSandbox: <path> is outside <root>` (what the model reads), and never reaches the
daemon. It records each `exec` it forwards and its exit code, so `seen.execs` lists what Pi's tools ran, as it lists what `exec` ran. `TMPDIR` is `<root>/.tmp`, so the temporary
files Pi's tools make are inside the fence.

### 4. The environment is built, never inherited

A process gets exactly: four built-ins (`SUPERAGENT_DIR` the folder, `SUPERAGENT_NAME` the `owner`, `SUPERAGENT_TICKET` the `tag`, `SUPERAGENT_BLOCKED_COMMANDS`), the sources'
variables, Settings' variables, then `PATH` (shims first, then the bridge's `PATH` as `main.ts` read it), `HOME`, `TMPDIR` and `LANG`. **Nothing of the bridge's own environment
is passed on**, so a key the bridge was started with (the adapter's canary, in check 42) is unreadable. `open` refuses a credential-like name itself (`CredentialLikeVariable`),
with the rule GOAL17-check-harness fixed for Settings, even when the app's own check let one by.

### 5. Blocked commands: two layers, both by name

`exec`'s first word (its basename) against the list refuses before anything starts: `BlockedCommand`, exit 126 in the record. A shell string that runs a blocked name finds a
shim first on `PATH`: it prints `BlockedCommand: <name>`, logs the name and exits 126; the bridge reads the log and records the refusal, and a command whose shim ended it
(exit 126 with a hit) fails as `BlockedCommand`, while one that went on is returned with the refusal recorded. `echo sudo` runs: a name as an argument is not a command.
A blocked name that is a path or has an argument is refused at `open` (`InvalidBlocked`). Honestly: an absolute path skips the shims, as the record says; E2B is the wall.

### 6. `lend` (K40 fix 6): a credential for one call

`exec`'s loans go into that one process's environment alone. They are refused when expired (`LoanExpired`, at `expiresAt <= now`, before anything runs), redacted
(`[redacted:<name>]`) from the output and from the command line the bridge records, and recorded as `{ name, scope, expiresAt }`, never the value; `seen.execs[].lent`
holds names only. **A real `git push` proves it** (`lend.test.ts`): from a sandbox to the GitHub adapter's stand-in, refused with no loan, accepted with one, refused again after.
**Not built here:** the minting. `github.lend` (a GitHub App installation token, expiring by itself, the App's key never leaving the adapter) is the adapter's layer and
needs `lend` declared on the framework's adapter spec, which has no such field; K40 names Goal 3 as its owner. The sandbox takes what it is lent and is ready for it.

### 7. Nothing outlives its sandbox

An `exec` runs in its own process group; the group is killed when the call ends, times out (exit 124, default 120 s), is interrupted, or the sandbox closes. `close` stops
the daemon (SIGTERM, SIGKILL after two seconds, and waits), closes the socket and removes the sandbox's folder and its shims folder; a second `close` answers
`closed: false`. `<dir>/sandboxes` holds sandboxes' roots and nothing else. The bridge sweeps at start and at stop (SIGTERM, SIGINT, SIGHUP or an uncaught failure); a
bridge killed hard (SIGKILL cannot be caught) takes its daemons with it (their stdin ends) but not its `exec` commands, which are detached, nor its folders. See call 8.

### 8. The security review's findings (23 November 2026)

The 🔍 review reproduced each with a real probe; each fix has a test on real processes and disk.

- **Symbolic links.** A symbolic link that does not resolve (dangling, or a loop) is not "missing": a write through it creates its target. `fence` refuses it (`disk.isLink`), and a
  path below one. The relay **sends on what the fence checked**: each path in a request is rewritten to the fence's resolved spelling (`linkdir/../x` is `<root>/x`, as the fence
  judged it), never the raw string the kernel would resolve differently.
- **The socket's token is checked.** A client's first line must equal the sandbox's token (constant time) within 5 seconds; only then does it take the one client slot, and the relay
  writes `PI-ENV <token>` back. A socket that says nothing or the wrong thing is closed and never blocks the real client. The relay's partial-frame buffer is per client.
- **The bridge's HTTP needs its secret.** `main.ts` makes 32 random bytes at start and writes them to `<dir>/bridge.secret` (0600, outside `sandboxes/`); every route, `health` and
  `reset` included, answers 401 without it as `x-bridge-secret` (constant-time compare). It is never configured and never printed.
- **A hard-killed bridge.** Each sandbox's running `exec` groups are kept in `<dir>/shims/<id>/.pgids` (removed as each ends); the next bridge's sweep kills those groups before it removes
  folders. SIGHUP and uncaught failures close every sandbox like SIGTERM. A command is started only if the sandbox is open at that instant, so nothing starts after a close's snapshot.
- **Pi `exec` and blocked names.** The relay applies `firstBlocked` to a Pi `exec`'s argv (or the first word of its shell string): it answers `BlockedCommand: <name>` and exit 126 itself.
- Small: a non-finite `timeoutSeconds` is refused; `credentialLike` also takes COOKIE, SESSION, DSN, BEARER and JWT; `loans` has an `internal/`.

## What each test stands for

The harness surface that loads `e2e/superagent/agent-journeys/` is the other builder's, so until it lands these prove each behaviour on real processes and the real disk (no mock).

| Test | Journey step it stands for |
|---|---|
| `fence.test.ts`; `sandboxes.test.ts` "a write outside the sandbox is refused"; `relay.test.ts` "refuses a write outside it by name" | a-write-outside-the-sandbox-is-refused: "the bridge refused exactly the one write, by name, in one sandbox"; "the refusal says which path and which root" |
| `commands.test.ts`; `sandboxes.test.ts` "a blocked command fails by name"; `relay.test.ts` "runs an ordinary command ... 126" | a-blocked-command-fails-by-name: "refused the one blocked command, by name"; "the ordinary commands ran and exited 0 ... the blocked one exited 126" |
| `environment.test.ts`; `sandboxes.test.ts` "no credential among the execution variables"; `main.test.ts` | no-credential-among-the-execution-variables: "the sandbox's variables are exactly the seven"; "the canary is nowhere in what the bridge saw" |
| `loans.test.ts`; `lend.test.ts` | K40 fix 6 (no journey reads it: `CredentialLikeVariable` is not tried, README item 5) |
| `sandboxes.test.ts` "nothing is left after a retire"; `main.test.ts` | check 42's last step, "no folder and no process is left", and check 48's reading: the disk and the process table, the bridge stopped and not |

## What waits

- **The harness surface** (`models.script`, `sandbox.seen`, `sandbox.left`, the world's `sandbox` mount and `s.clock.settle`): check 42 cannot load until it lands.
  `examples/superagent/blueprint/adapters/sandbox.ts` (the mount) and the environment's `sandbox` entry are the same stretch; I did not touch the app.
- **The Pi side of the socket**: a `socketConnection(address)` for Pi's `RemoteExecutionEnv` (a `Connection` over a TCP socket, sync token `#<token>`) is Pi Durable's types, which the other builder
  adds. The address and the framing are fixed and proved on the real daemon with raw frames.
- **A socket from workerd to localhost** (K40's open risk): not proved. The fallback is the bridge speaking WebSocket.
- **Pi's tools through the fence**: proved with raw frames for `write`, `realpath`, `rename`, `exec`. Pi's own tools may send other path-bearing requests; each is judged the same way, and repeated
  refusals of one path collapse to one record. Retry once Pi Durable is in.
- **`github.lend`'s minting**, section 6.

## Open risks

- A command run by an absolute path, or one that leaves its process group (`setsid`), is outside the shims and the group kill (the prototype's "defaults" caveat). A group-leaving process is not killed by `close`.
- The relay's fence compares case-folded, as the record says: on a case-sensitive disk two folders differing only in case count as one place.
- **A blocked name can be run around.** `PATH=/usr/bin sudo ls`, `env PATH=/usr/bin sudo ls`, an absolute path inside a shell string, or a copied binary skip the first-word check and the shims. Not closed here: the real wall is the sandbox, and E2B comes later.
- **A program in a sandbox can read the bridge's secret file** (`<dir>/bridge.secret`, 0600, the same user): the fence covers the bridge's own file calls and Pi's tools, not a program's own reads. The secret stops other loopback processes driving the bridge unasked; it does not isolate an agent whose shell runs on this Mac. E2B is the isolation.
- A command's group is written to `.pgids` just after it spawns, so a SIGKILL in that instant can lose one; and a path the fence checked can change before it is used (a link swapped in between). Both need a program already running inside the sandbox.
- One bridge per state folder: a second bridge on the same `--dir` would sweep the first's sandboxes at start.

## Supersedes

- `design/decisions/GOAL17-check-harness.md`: "// packages/sandbox/blueprint/adapter.ts" → "// packages/sandbox/src/adapter.ts"
- `design/decisions/GOAL17-check-harness.md`: "standIn: Stand.process("packages/sandbox/src/stand-in/main.ts")," → "standIn: Stand.process("packages/sandbox/src/main.ts"),"
- `design/decisions/GOAL17-check-harness.md`: "// packages/sandbox/src/stand-in/commands.ts" → "// packages/sandbox/src/modules/sandboxes/types.ts, and the descriptors with the harness surface"
