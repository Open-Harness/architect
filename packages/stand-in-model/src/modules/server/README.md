# server

The model stand-in as a service (`types.ts`): a chat completion written into a `Sink`, and the `/_stand/*` commands, both effects over one state (the script, held
requests, rules that hold or fail the next ones). The process (`../../main.ts`) gives each request a sink and runs the effect; nothing here touches a socket.

- A request is answered in this order: a failure it was told to make (`fail`), then the script. No script is `501 NoScript`; a call to a tool the request did not offer is `500 ToolNotOffered`.
  A hold (a turn's `hold`, or the `hold` command) keeps the request open, still counted by `seen`, until `release`; `held` waits (at most 10 s of real time, the stand-in's own wait for its own request) until it is held.
- `done` is `200` only when every scripted turn was used; else `409` with the unused ones.
- A held request never moves the world's clock: the world's own wait on it is `Timers.within`, which gives its token back while parked (GOAL17-check-harness, call 3).
