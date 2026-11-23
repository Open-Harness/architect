# The grid runner: `nx run e2e:grid`

Goal 3's guardrail (K14). Rows are building blocks, columns the nine outputs, a cell an eval. **A cell is switched on by the
first journey that touches it**; CI runs every switched-on cell on every push; a red cell fails.

- `switched-on.json`: the checked-in list, `{ cell: "error.docs", subjects: ["HandleTaken"], switchedBy: "<journey>" }`. Written by
  `touched --write`; Plugged In's seven stage 1 journeys switched on 61 cells (8 rows, 331 cell-and-subject pairs: the 53 cells of the first seven rows, less `handle.claim.load`,
  which ST1.19 takes out of the blueprint with the handler's lookup, and the invariant row's eight judged cells, three rules each).
- `held-off.json`: the cells `touched` never switches on, each with what it waits for (below). A test keeps it and the list apart.
- `expected-red.json`: the pairs allowed to be red today, each with its reason and what it waits on. **The ratchet** (G7,
  `design/decisions/G7-grid-ratchet.md`): the run fails on a red pair not on the list, a listed pair that is not switched on, and a listed
  pair that is now green (it comes off the list in the same change). The goal's done check needs the list empty.
- `nx run e2e:grid`: runs the unit tests, then `run --prove`: `ortho prove`, then judges every switched-on (cell, subject), writes
  `out/verdicts.json` (not committed) and applies the ratchet. A switched-on cell with no eval is red.
- `tsx e2e/grid/src/main.ts run --prove`: runs `ortho prove` first (its report to `<project>/.ortho/grid/prove.json`, its spans to
  `.ortho/prove-telemetry`), so what the cells read is this commit's run. Without `--prove` the last run is read; no run is red
  ("no prove run was read"). The CI job `e2e-grid` runs it with the Collector cache and No-Docker step of `e2e-climb`.
- `tsx e2e/grid/src/main.ts touched --journey "<name>" --report <prove output> [--write]`: the rows and cells a **green** journey
  touched, from the compiled model's journey steps and prove's `journey <name> ✔ n/n steps` line (its stdout, not `--report`'s JSON);
  `--write` switches them on, leaving out `held-off.json`'s cells.
- `tsx e2e/grid/src/main.ts capture --out <folder> [--run]`: copies the project's outputs for the tests: `files.json` (everything under
  `generated/`), `portal.json` (the portal's pages) and, with `--run`, `run.json` (CLI help, MCP tools, prove's report, one span per shape).
  **The unit tests judge these copies in `fixtures/plugged-in` and `fixtures/acme`, never the live outputs**, and every red a test asserts is
  today's captured output. A builder who changes a generator to turn a cell green breaks no test: they take the pair off
  `expected-red.json`. Recapture only to move the tests on deliberately, not to make a cell green.
- `run --prove` deletes the last report and spans first, and stops the grid ("prove wrote no report (status N)") when prove writes none;
  a prove that reports red journeys is a fresh run and is judged.
- `--project` defaults to `examples/plugged-in`; `--observed <file>` is the refused calls the client journeys recorded
  (`{ "<Refusal>": { cli: { status, stdout, stderr }, mcp: { isError, text } } }`).

## Design

Modules under `src/modules/`, each with the six slots. `src/main.ts` is the only file that reads the process, the disk for the
modules, spawns a command or prints; the modules take what they need through injected ports.

- `grid` (the list, the run, the report), `touches` (rows from model and report).
- `project-evidence` gathers everything a row eval judges from, once: the model, every file under `generated/`, the portal's pages,
  the generated CLI's real `--help`, the MCP server's real `tools/list`, the spans and prove's report. An output that could not be
  observed is `undefined` and its evals are red with that said. `world` is the real ports (the portal's pages as a person reads
  them, K19: the project's blueprint served by `e2e/served-portal` and each route opened in headless Chromium, so there is no page until
  `@orthograph/portal/server` and the built client exist; the CLI as a process, `tools/list` through the framework's own `Mcp.tools` and `Mcp.handle`).
- `reading` holds the pure readers every eval shares. The portal's pages are judged on their own part: each page embeds the docs
  page under `<h2>Docs</h2>`, which would make any docs check pass on the portal, so it is cut off.
- One module per row: `operation-evals`, `thing-evals`, `step-evals`, `machine-evals`, `event-evals`, `journey-evals`;
  `refusal-source-evals` (the error row's model, api, server, sdk) and `refusal-evals` (its cli, mcp, docs, portal, telemetry,
  which judge one refusal's own evidence). `project-evals` lists them all. The invariant row has its own module, `invariant-evals`: a rule, named
  `<thing>.<rule>` (`handle.oneHolderPerName`); see "The invariant row" below.
- Every eval is pure and parameterised from the model: the subject is a name the list holds (`link.add`, `link`,
  `link.add.record`, `LinkAdded`, `HandleTaken`, a journey), and what to expect is read from that name's entry in the model, never
  typed. Each is tested on Plugged In's real model and outputs (green and red as they stand), on acme's where it has the output, and with
  one broken output per check.

**Verdicts go to a JSON file, not the logbook, for now.** The logbook (`packages/logbook`) takes writes only with a verified OIDC
token, which exists only in CI, and keys verdicts by operation and environment. The file uses the logbook's `VerdictInput` shape
with `<cell>:<subject>` in the operation slot, so the CI job that holds a token can post each line as it is. Reading them in the
portal's Proof page is M1.13.

## Where Plugged In stands (19 November 2026, 239 of 316 pairs green)

Green in every subject: `error.{model,api,server,sdk,docs}`, `operation.{model,api,server,sdk,mcp,docs,telemetry}`,
`thing.{model,api,server,docs,portal,telemetry}`, `step.{model,server,sdk,cli,mcp,docs,portal,telemetry}`,
`machine.{model,server,docs}`, `event.{model,server,telemetry}`, `journey.{model,server}`. Red, and what each needs
(a framework builder; the file to change):

| Cell | Red because | File |
|---|---|---|
| `error.portal` | no `data-refusal`/`data-code`/`data-count` anywhere: the portal counts nothing by code | `packages/portal/src/modules/site/internal/home.ts` (M1.13) |
| `error.telemetry` `NotAllowed` | the role check runs before the operation's span opens, so the refused call leaves no span | `packages/language-effect/src/modules/handler/service.ts:77` |
| `journey.telemetry` (2 journeys) | the same refused calls leave no `journey.<name>` span (prove writes it only when the server recorded one) | same, and `packages/prove/src/modules/telemetry/internal/journey-root.ts` |
| `operation.cli`, `thing.cli` (`link`), `machine.cli` | the CLI's `--help` has no description, a `uint` is a `string` flag, no states | `packages/generators/src/modules/render/internal/cli.ts:9` |
| `operation.portal`, `machine.portal` | no calls, refused, defects or p95 on home; no move count on the lifecycle: the portal reads no telemetry | `packages/portal/src/modules/site/internal/home.ts` (M1.13) |
| `thing.sdk`, `machine.sdk` | the SDK exports functions only: no `Link` type, no state union | `packages/generators/src/modules/render/internal/sdk.ts` |
| `thing.mcp`, `machine.mcp` | `tools/list` offers no output schema; descriptions name no states | `packages/language-effect/src/modules/mcp/service.ts`, `packages/generators/src/modules/render/internal/mcp.ts` |
| `machine.api` | a wrong-state refusal's `state` is `Schema.String`, not the union of the states | `packages/projections/src/modules/api/internal/api.ts:35` |
| `step.api` | the API package names a step where a caller can read it (an absence check, K14 Q1): today each endpoint file exports `steps`; M1.42 moves it beside the handler's wiring in `generated/server/main.ts`. K14's `step.api` row is the cell | `packages/projections/src/modules/api/internal/api.ts` |
| `machine.telemetry` | `move.name` and `move.to` land on the record step's span, because `chooseOutcome` annotates the current span | `packages/language-effect/src/modules/handler/internal/move.ts:46` |
| `event.docs`, `event.portal` | a thing's page names its events only in the move table: no section documents their fields | `packages/generators/src/modules/render/internal/docs.ts`, the portal's thing page |
| `journey.docs` | no operation page has a `## Worked examples` section: each journey that calls it as an entry, with the starting world and, for every step that calls the operation, who calls (cast name and kind), the payload with the journey's values (a value from the world in words from its reference), and the refusal by name and code or the answer checked (W2, `design/decisions/W2-docs-worked-examples.md`; the eval holds the content, not the markup, and looks in the journey's own entry) | `packages/generators/src/modules/render/internal/docs.ts` |
| `journey.portal` | no operation page lists the journeys that cover it | the portal's operation page (M1.13) |

## The invariant row (K14 lane 14, 21 November 2026)

The grid learned `invariant` ahead of ST1.19 (`design/decisions/ST1-19-checks.md`). **A journey touches a rule** when a step (or the world it starts in) calls an operation of the
rule's thing, for every rule of that thing, or an operation the model says can break it (`operations.<op>.invariants`), so a rule that refuses nothing (`profile.onePagePerHandle`) is
touched by any call of `profile.get`. The subject is `<thing>.<rule>`. Eight of the lane's nine cells are judged by `modules/invariant-evals` (its README has the table); `invariant.cli` is
held off with `error.cli`, for the same reason (no refused call seen through the CLI as data: `prove --through`, M2.08).

Plugged In declares no rule until ST1.19, so today's list holds the three rules from `claim a handle` (the first journey that touches them) and **all 24 pairs are red and on
`expected-red.json`**, each with ST1.19 (and, for the portal, ST1.22) as what it waits on. A right ST1.19 turns the 21 pairs of the other seven cells green (the builder takes them off the
list in the same change) and leaves the three `invariant.portal` pairs for ST1.22. The tests judge `fixtures/plugged-in-rules`, a throwaway stand-in of the slice, until Plugged In has its own rules.

`operation.mcp` now reads a tool's description as the model's words, then one `Refuses <Error> when <reason>.` sentence for each refusal a rule owns for the operation (ST1.17), and nothing else
(`operation-evals/mcp-rules.test.ts`).

## The portal's pages (K19, 19 November 2026)

The portal ships prebuilt (`design/decisions/K19-portal-prebuilt.md`): its pages draw in the browser from `/_portal/v1/*`. So every
portal cell reads the page the way check 21 does, through `e2e/served-portal`: `nx run e2e:grid` serves each project's blueprint (data
API from `@orthograph/portal/server`, client from `packages/portal/dist/client`) and opens each route in Chromium. Until the split lands
no page can be read, `main.ts` says why once on stderr (`portal: K19: …`), and every portal pair is red with its page "could not be read"
(or the finding it had before); the 13 `thing.portal` and `step.portal` pairs that were green on the old server-rendered HTML joined the
list for that reason, and leave it with the rest. Each eval's assertions are unchanged. The evals' own unit tests judge their logic on
`fixtures/<project>/portal.json`, the pages as the portal rendered them on the server: `capture` re-records them, from the served portal once
the client exists, and the evals' words change with the page.

## Not done, and what it waits for

Held off (`held-off.json`), so `touched --write` leaves them off and the list stays honest:

- **`invariant.cli`** is held off for the same reason as `error.cli` (a rule's refusal is `[code] Tag` and an exit, which only a call through the CLI shows), and has no eval yet.
- **`error.cli`, `error.mcp`** need the refused call seen through each client as data. Prove has no `--through` yet (S-11, M2.08), and
  the CLI prints string fields unquoted, so the text can't be split back into fields (S-20). The evals exist and are unit-tested on the line
  format the generators write; run with no observed file they are red with "no refused X call was seen through the CLI". Switching them on
  also needs the refusal facts to come from the runtime's real shapes, not the model alone (S-20, the not-found `id`).
- **`event.{api,sdk,cli,mcp}`** (K14 Q3) and **`journey.{api,sdk,cli,mcp}`** (K14 Q2) have no eval: they are "not needed" only if
  Aaron says an event's audience leaves out the caller and a journey runs through the clients, never in them. He has not answered. If he does
  not agree, they need evals and a builder; until then they are off, not green.

What an eval leaves out, because nothing can be read yet (each is a line in the eval's own comment):

- `error.server` reads that a journey step expects the refusal and prove saw it pass; `event.server` cannot read the journal, so an event
  with a secret or private field is red; `journey.server` does not judge that `/_world/*` answers only where an environment declares a
  lifetime (it needs the server run without one: `prove --through`).
- `thing.cli` does not judge that an answer prints by field, and `thing.mcp` and `machine.mcp` judge `tools/list`, not a call.
- `thing.mcp` runs each tool's `outputSchema` through the MCP SDK's own validator (`modules/output-schema`): it must accept an answer built from
  the operation's declared fields (a real value from the prove run's spans where one is recorded), accept each refusal (code, exit and status read from the runtime's own table, `generated/api/src/errors.ts`), refuse `{}` and refuse a
  wrong-typed answer field; every JSON kind a typed field is not (another scalar, a fractional number for an integer, null, an array, an object) must be refused, for an answer field, for the refusal's `refusal`, `code`, `exit` and `status` and for a declared refusal field the schema types; a value is built from the model's type (a uint as its digits), never from the schema, and a field with none is red; `machine.mcp` also requires each of the machine's states accepted and a non-state refused. `thing.sdk` judges each
  field's type against the model, not only that the type is exported (G7, scope call 4).
- `machine.mcp` judges the states a move crosses from what the framework emits for the tool (its input and output schemas, annotations and metadata (`_meta`)), never
  from its description: that is the author's prose, which `operation.mcp` requires to equal the model's. K14's text says "description"; the
  lead's call at #150 moved it to the schema, so a blueprint's wording cannot decide the cell.
- Reading generated code: `operation.api` parses the endpoint calls as TypeScript (a call in a comment is none) and owns the method, `POST`
  for an operation and a read alike (design/history/retired-2026-11-23/frame/projections.md); `machine.sdk` parses exported type aliases, so only a string literal in
  the alias's own type counts. `thing.cli` reads a flag from its own declaration line and judges its type on the type token alone.
- `operation.portal` and `machine.portal` ask for the counts the cell names, by their column words (Calls, Refused, Defects, p95; Count),
  because the portal has no markup for them yet; a portal builder who picks other words changes the eval with the page.
- The telemetry cells judge the spans a prove run wrote; `ortho.calls` counts are judged through prove's `performance` line.
- `step.*` on the four caller outputs follows K14 Q1's recommended reading (a caller never sees a step); if Aaron answers otherwise, those
  four cells change.
