# relay

K40 fix 4's "Pi's `ExecutionEnv` over a socket an actor can open". pi-env's daemon speaks length-framed messages on stdin and
stdout (`@earendil-works/pi-env` `docs/protocol.md`), which a Durable Object cannot spawn. The relay starts one `pi-env serve`
per sandbox, in the sandbox's folder, with the sandbox's environment, and serves its frames on a loopback TCP socket.
`address` is `tcp://127.0.0.1:<port>#<token>`: a `socketConnection` connects to the port and treats the fragment as the sync
token (the relay writes `PI-ENV <token>` itself to each client, so a client may reconnect).

The relay is also where the fence meets Pi's tools. Every request frame is read before it reaches the daemon; one whose
`path`, `to`, `cwd` or watch targets resolve outside the root is answered by an error frame (`code: "OutsideSandbox"`, a
message starting `OutsideSandbox: <path> is outside <root>`, which the model reads) and never reaches the daemon. It also reports
each `exec` and its exit code, so the sandbox can say what ran. A blocked command is caught by the shims on the daemon's `PATH`
(`commands`), whose exit is 126.

A client's first line must equal the sandbox's token (constant time, within 5 seconds) before anything it sends goes further; only then does it take the one client
slot, and the relay writes `PI-ENV <token>` back. A socket that says nothing, or the wrong thing, is closed and never blocks the real client. What goes to the daemon is
each request rewritten to the paths the fence resolved (never the raw spelling), and an `exec` whose first word is blocked is answered by the relay itself, exit 126.
One client at a time, each with its own partial-frame buffer. The relay pings the daemon every 5 seconds through `Timers`, so a
daemon with no client is not taken for dead (it exits after 30 s of silence). The daemon is a process of the caller's scope: when
the scope closes the socket is closed and the daemon gets SIGTERM, then SIGKILL after 2 seconds, and the finalizer returns
only when it has exited. Test: `relay.test.ts`, on the real daemon and a real socket.
