# handlers

What an operation's handler is given and where it starts. `renderHandlerTypes` writes, for an operation that calls an
adapter, the handler's type (each call typed by the callable it runs) into `generated/server/handlers/`; `callImports` and
`wired` are what the server wires for it. `renderHandlerScaffold` is the blank handler in the project's `src/` (a scaffold:
written once, the project's after that). The scaffold is not a mount's output, so the generators still write it for every
operation the project owns. Test: `handlers.test.ts`.
