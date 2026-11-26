# @orthograph/cli

The `ortho` command. `src/main.ts` is the entry and the only file that touches the process; each command is a
module under `src/modules/` that returns what it has to say. To go from install to a proved, running app, start with
[Getting started](../../docs/canon/getting-started.mdx).

Every command and every flag says what it is for: run `ortho --help` for the list, and `ortho <command> --help` for a
command's own flags and arguments. The commands:

| Command | What it does |
|---|---|
| `ortho model` (alias `describe`) | Read the blueprint and print the model it declares |
| `ortho check` | Check the blueprint, the generated files and the code's rules, and list each problem |
| `ortho generate` | Write the generated code from the blueprint |
| `ortho add` | Add a declaration (`thing`, `operation`, `read`), a `journey`, the `journeys` of a thing, or a plugin (`feature`, `adapter`, `projection`) |
| `ortho new` | Create something new from a source: today an adapter from an OpenAPI description |
| `ortho brief` | Print what a builder needs to write one operation's handler |
| `ortho prove` | Run the app's journeys against it, locally, in the test environment or on staging |
| `ortho dev` | Run the app on this machine, with a local world |
| `ortho secrets` | List the declared secrets and whether each has a value; `set` stores one, read from stdin |
| `ortho build` | Build the revision's bundle once |
| `ortho promote` | Move the built bundle on to staging or production, once its verdicts earn it |
| `ortho impact` | Say what a change does: its ledger lines, the next version and what goes stale |
| `ortho version` | Work out the next release version, with `--next` |
| `ortho publish` | Publish the generated SDK and CLI, with `--dry-run` or `--local` |
| `ortho env` | Start, stop, inspect or destroy an environment (`up`, `down`, `status`, `destroy`) |
| `ortho worlds` | Look after the test worlds: `reap` destroys the expired ones |
| `ortho telemetry` | Read what the app recorded: `trace` prints one trace |
| `ortho watch` | Run the evals telemetry can answer over what an environment recorded |
