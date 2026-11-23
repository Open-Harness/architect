# Orthograph

Describe a system once, and everything else falls out of it.

You write the blueprint: the things your app keeps, the operations that change them, who may call each one, the
machine each thing moves through, its events, refusals and rules, and the journeys that prove it works. Orthograph
compiles it into one model and generates the server, the HTTP API, the SDK, the command line tool, the MCP tools, the
docs and the portal from it. The only code you write by hand is behaviour, a handler per operation, inside a frame the
blueprint made. `ortho prove` judges the running app against its journeys from real evidence, so a coding agent can
climb them until they are green, and a change to the blueprint marks exactly what it made stale.

- The documentation, the canon, which also says how to think in it: [`docs/canon/`](docs/canon/README.md).
- What is built, what is left, the releases and the packages: [`docs/canon/status.md`](docs/canon/status.md).
- How work runs here: [`AGENTS.md`](AGENTS.md).
