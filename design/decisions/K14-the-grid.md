# K14: the grid

Decided 19 November 2026 by the 📐 grid designer thread, under "Who decides" in `AGENTS.md`, from Aaron's words the same
day. The calls that are his are batched at the end, under "Questions for Aaron"; nothing in this record settles them.
`design/grid/grid.json` holds the same content as data, for the mission board, in the shape `design/grid/types.ts`
writes down (agreed with the board thread): each card's id is `<block>.<output>`, e.g. `event.sdk`, and a card's
`state` starts as `built`, `partly` or `red` from its grade; only a recorded verdict makes it `green`, and only Aaron's
answer makes it `not-needed`.

## Aaron's words

> "I want to rebuild this board again from first principle … each one of these things should essentially be a swim
> lane … we have a goal here, which is to fill in all of these areas here … We need to have some details about what
> that goal is, not just a one or two lines … for each of these swim lanes we have some sort of end state, something
> that proves all of these different things, which should be probably the portal … the telemetry should be able to see
> in the portal, the docs should be like a content area in the portal … the CLI, the SDK, the MCP, those all have
> their own evidences through their journeys … that way we can hill climb together and we will be fully sure about
> what the situation is at each step and we can't get lost in the weeds."

And earlier the same day: each cell of the grid "is essentially an eval", and once they are all done "we have some
sort of story that we can run … proven end-to-end: using the CLI, creating something new, then going through the
link-tree example with various levels of complexity."

## The goal

**What Orthograph promises.** You write a blueprint: the things your app keeps, the operations that change them, the
steps each operation takes, the machine each thing moves through, the events a move emits, the errors a call can be
refused with, the roles allowed to call, which fields are private or secret, the environments and stores it runs in,
the plugins it mounts, where an operation runs, and the journeys that prove it works. Everything else falls out of
that one declaration for free: the model, the HTTP API, the server, the SDK, the CLI, the MCP tools, the docs, the
portal and the telemetry. Nothing is configured twice, and nothing an output shows is written by hand.

**Why a grid measures it.** "Falls out for free" is a claim about every pair of building block and output. The
coverage audit of 19 November (K12) drew that as a grid of 13 building blocks by 9 outputs, 117 cells (14 and 126 since G5 added invariants), and found the
claim fully true only for operations. A promise that holds for one row is not yet the promise. So the grid is the
goal: each row is a lane, each cell in it is a card, and each card is an eval. A card says, in one or two sentences,
what green means for that building block in that output, and names the evidence that proves it: an e2e check, a
journey run through that output, or a view in the portal. A card is green only when its evidence runs in CI and
passes. A card that exists in code but has no evidence is not green; it is "built, unproved", and the board shows it
amber.

**What "done" looks like.** Every card is green, or Aaron has agreed it is not needed by design. A "not needed" card
is not deleted: it stays on the board, greyed, with the one-line reason, so nobody reopens it by accident and anyone
can see the grid is whole. Where an absence is itself a safety property (no secret field leaves through any output,
no step leaks into a client's contract), the card stays live and its evidence proves the absence. When the last card
turns green, the end-to-end story below runs from a fresh folder through all four stages of the Plugged In app, and the
grid stays green after it.

**How it relates to the gates.** The grid does not replace the milestones; it is how we see them. Gate M1 (M1.15) is
the first band: the basics of things, operations, steps, machines, events and errors in every output (K13's 5 by 5,
M1.41 and M1.42), one visibility rule (M1.35), telemetry that carries the model (M1.36), and the portal as a viewer
(M1.13). Gate M2, "workable" (M2.12, also the stage 1 gate), is the second: roles and principals (M2.01 to M2.07),
secrets by declaration (M2.04), journeys run through the SDK, CLI and MCP (M2.08) so those three columns are proved by
journeys rather than by hand-picked calls, `ortho new` (M2.09) so the story can start from nothing, and `ortho add`
for the blocks that edit files in place (M2.14 to M2.16). The v1.0 stages fill the rest: stage 2 (ST2.06) the device
lane and the adapter half of the mount lane, stage 3 (ST3.08) stores on a chain and workflows, stage 4 (ST4.08) the
visibility lane at its hardest, a club whose members never show. The lanes this grid does not have yet (workflows,
views, agents, chains as stores) join it as rows when their milestone's decision slice names their outputs; until
then they are listed under "Rows still to come".

**How we use it.** The board shows one lane per row, its cards left to right in the column order below, each card
green, amber (built, unproved), red (missing) or grey (not needed, agreed). Work is picked by lane, not by cell: a lane
is climbed until it is fully green, so at each step we know exactly which building block is whole. The order is under
"Hill-climb order".

## How to read a card

| Field | What it holds |
|---|---|
| green means | one or two sentences: what must be true of this output for this building block |
| evidence | the check, journey or portal view that proves it; "new" when no check exists yet |
| today | ✓ carried and useful, ~ partly (the gap named), ✗ dropped; graded from the code on `origin/m1` at `6419d4b7`, never from the audit's word |
| today ref | one `path:line` on `origin/m1`: where the output carries it, or where it drops it |
| owner | the existing slice in `milestones.md` that turns it green, or "new slice needed" with a one-line proposal |
| role | derived, never written by hand: *carries*, *absence check* or *not needed*, from the audiences rule ("Who each block is for"); a not-needed card turns grey only once Aaron agrees the rule (Q2) |

The grades were first read by four reviewers in parallel, one per group of lanes, each reading the code itself; where
this record regrades a card against the card's own green, its note says so and why. Every reference below is to
`origin/m1` at `6419d4b7` unless it says otherwise. On that commit checks 16 (M1.35), 17
(M1.36) and 18 (M1.38) are written ahead of their builds and red, and `examples/plugged-in` is not yet on `m1` (it is
M1.40; Codex's draft is on `links/stage-1`, #56, a branch named before K15).

## The columns

| Column | What it is on `m1` |
|---|---|
| model | the compiler's `Model` (`packages/compiler/src/modules/model`), written to `generated/model` |
| api | the HTTP API declaration, `packages/projections/src/modules/api` |
| server | the generated server and the Effect runtime it runs on (`packages/projections/src/modules/server`, `packages/language-effect`) |
| sdk | the typed client, `packages/generators/src/modules/render/internal/sdk.ts` |
| cli | the app's own command, `render/internal/cli.ts` and `cli-session.ts` (not `ortho`, the framework's command) |
| mcp | the MCP tools, `render/internal/mcp.ts` and `packages/language-effect/src/modules/mcp` |
| docs | the generated reference, `render/internal/docs.ts`, written to `generated/docs` |
| portal | the data file (`packages/generators/src/modules/portal`) and what the portal decodes and draws (`packages/portal`) |
| telemetry | spans, metrics, step signals and the journal, from `packages/language-effect/src/modules/handler` |

## The grid today

Graded from the code on `origin/m1` at `6419d4b7`. ⁿ marks a card the audiences rule makes not needed, ᵃ an absence check (Q2). Each
cell's `path:line` and what it means are in its lane's section below.

| # | Lane | model | api | server | sdk | cli | mcp | docs | portal | telemetry |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [Operation & read](#1-operation) | ✓ | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | ~ | ✓ |
| 2 | [Error & refusal code](#2-error) | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ | ~ |
| 3 | [Thing & fields](#3-thing) | ~ | ✓ | ✓ | ~ | ~ | ~ | ~ | ~ | ✓ |
| 4 | [Step](#4-step) | ✓ | ~ᵃ | ✓ | ✓ᵃ | ✓ᵃ | ✓ᵃ | ~ | ~ | ✓ |
| 5 | [Machine, states, move](#5-machine) | ✓ | ~ | ✓ | ✗ | ✗ | ✗ | ✓ | ~ | ~ |
| 6 | [Event](#6-event) | ✓ | ✓ⁿ | ✓ | ✗ⁿ | ✗ⁿ | ✗ⁿ | ~ | ~ | ~ |
| 7 | [Field visibility (secret, private)](#7-visibility) | ✓ | ✗ | ✗ | ✗ | ~ | ✓ | ~ | ✗ | ✓ |
| 8 | [Journey & starting world](#8-journey) | ✓ | ✗ⁿ | ✓ | ✗ⁿ | ✗ⁿ | ✗ⁿ | ✗ | ✗ | ~ |
| 9 | [Roles](#9-roles) | ✓ | ✓ | ✓ | ✗ | ✗ | ~ | ✓ | ~ | ~ |
| 10 | [Environment](#10-environment) | ✓ | ✗ⁿ | ~ | ✗ⁿ | ~ⁿ | ✗ⁿ | ✗ | ~ | ~ |
| 11 | [Store](#11-store) | ✓ | ✗ⁿ | ✓ | ✗ⁿ | ✗ⁿ | ✗ⁿ | ~ | ✗ | ✗ |
| 12 | [Mount, adapter, plugin origin](#12-mount) | ✓ | ✓ⁿ | ✓ | ✓ⁿ | ✓ⁿ | ✓ⁿ | ✗ | ✗ | ✗ |
| 13 | [Runs on the device (runs: "client")](#13-device) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ~ |
| 14 | [Invariants (unique rules, G5)](#14-invariant) | ~ | ✗ | ~ | ~ | ~ | ✗ | ~ | ✗ | ✗ |

**In numbers:** 52 ✓, 37 ~ and 37 ✗ of 126 (the audit's thirteen lanes keep their 52 ✓, 32 ~ and 33 ✗ of 117; the invariant lane adds 5 ~ and 4 ✗). The audiences rule (below, "Who each block is for") makes 20 cards not needed (5 of them ✓ today) and 4 absence checks, which leaves 59 cards to build (the 50 of the audit's lanes and the invariant lane's nine, none of them ✓). By column, ✓ out of 13: model 12, api 6, server 11, sdk 5, cli 4, mcp 6, docs 4, portal 0, telemetry 4.

**Where this differs from the audit.** The audit's grid (K12) was read from a wider sweep; this one is read cell
by cell against each card's own green, so some cells moved. Up: the CLI and MCP refusal cards (both print the code,
`render/internal/cli.ts:55`, `mcp/internal/tool.ts:36`); event on the server (the runtime journals it in the commit,
`handler/internal/move.ts:61`); event and machine telemetry partly there (`event.name` is written, on the wrong span,
`move.ts:73`); journey telemetry (prove reads its spans back); environment on the server, the CLI (`session sign-in
--env`) and telemetry (`deployment.environment` on every span's resource); the device lane's CLI (check 11 runs a
client operation through the generated CLI). Down: the model and docs of things (no field can carry a description), the
CLI of operations (no `--help` text), the API of errors (`InvalidPayload` has no code), the API and portal of
machines (states are plain strings; the portal draws a table, not the lifecycle strip), docs of steps (no
`optional`, writes or call), the portal of operations (no list options, `runs` or `via`). And where a card's green
is "looks native" or an absence, the mount lane's clients and the device lane's API and server count as ✓.

### 1. operation

**Operation & read.** Every operation and read is one endpoint, one SDK function, one CLI command, one MCP tool, one docs page and one portal page, with its description, who may call, its idempotency and its budget, and every call is counted and traced.

**How it is proved.** The operation's page in the portal (the in-and-out band, the spine, the proof tab with its journeys' verdicts) and the operations matrix on home (calls, refused, defects, p95 against budget); journeys through each client (M2.08).

| Output | Today | Green means | Evidence | Owner | Role |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:73` | Each operation and read is in the model with its kind, description, payload, answer, allowed, idempotency, budget, list options, `via` and `runs`. | the compiler's model tests; e2e/m1/12-projections.test.ts. | M1.03 (done) | carries |
| api | ✓ `packages/projections/src/modules/api/internal/api.ts:73` | One endpoint per operation and read, its schemas from the declaration. | e2e/m1/12-projections.test.ts. | M1.11 (done) | carries |
| server | ✓ `packages/language-effect/src/modules/handler/internal/read.ts:42` | Each operation is served through its handler and each read generically, with the role check and a span. | e2e/layer2; e2e/m1/12-projections.test.ts. | M1.11 (done) | carries |
| sdk | ✓ `packages/generators/src/modules/render/internal/sdk.ts:23` | One function per operation and read, with the description as its doc comment, calling the API. | e2e/m1/14-clients.test.ts; M1.41 calls every operation once through the SDK; M2.08 runs journeys `--through sdk`. | M1.12 (contract); M2.08 (journeys) | carries |
| cli | ~ `packages/generators/src/modules/render/internal/cli.ts:6` | One command per operation and read whose `--help` is the operation's description; a refusal exits with its declared code. | e2e/m1/14-clients.test.ts; M1.41 calls every operation through the CLI; M2.08 runs journeys `--through cli`. | M1.42 (help text); M2.08 (journeys) | carries |
| mcp | ✓ `packages/generators/src/modules/render/internal/mcp.ts:21` | One tool per operation and read, described from the model, reads marked read-only, operations closed to agents left out. | e2e/m1/14-clients.test.ts; packages/language-effect/src/modules/mcp/mcp.test.ts; M2.08 runs journeys `--through mcp`. | M2.08 (journeys); M1.37 adds hints (M3) | carries |
| docs | ✓ `packages/generators/src/modules/render/internal/docs.ts:34` | One page per operation and read: description, who may call, read paging, idempotency, budget, payload, answer, refusals. | packages/generators/src/modules/render/render.test.ts; M1.41. | built; evidence M1.41 | carries |
| portal | ~ `packages/portal/src/modules/wire/types.ts:49` | Each operation has its page (the in-and-out band and the spine), and home's operations matrix counts its calls, refusals, defects and p95 against its budget; a read's list options, `runs` and `via` are decoded too. | M1.13's screenshot of `handle.claim`'s page and the matrix lit by a journey's run. | M1.13 | carries |
| telemetry | ✓ `packages/language-effect/src/modules/handler/service.ts:102` | Each call has the operation's span (`operation`, `attempt`, principal) and is counted in `ortho.calls` and `ortho.call.duration`, reads included. | packages/language-effect/src/modules/handler/internal/call-metrics.test.ts; e2e/m1/17-telemetry-model.test.ts. | M1.18, M1.20 (done) | carries |

What "today" means, for each card not yet ✓ (and each regraded one):

- **cli.** One command per operation and read, a flag per payload field. The operation's description is only a doc comment in the generated source, never the command's `--help`, so a person at the terminal can't read it. Regraded from the reader's ✓ against this card's green.
- **portal.** Wire Operation has kind, description, payload, answer, allowed, idempotent, budget.p95Ms and detail.ts renders them. Missing from the wire: list (where/order/page), runs, via.

### 2. error

**Error & refusal code.** Every refusal a caller can get, declared or the runtime's own, has a name, a code and an exit, and the same three reach the SDK as a typed class, the CLI as `[code] Name` and its exit, MCP as an error with its code, the docs' refusals table, the portal's arrows and counts, and the span.

**How it is proved.** Refusals on the arrow they guard and in the in-and-out band, counted by code (portal.md); M1.41's refused claim prints `HN-001`; `refusal.code` on the span (M1.36).

| Output | Today | Green means | Evidence | Owner | Role |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:50` | Every declared error and wrong-state refusal has its fields, exit and code, and the model maps every refusal to its code. | the compiler's model tests. | built | carries |
| api | ~ `packages/projections/src/modules/api/internal/api.ts:56` | Every refusal is a typed error with its code and exit, the runtime's own `InvalidPayload` included. | e2e/m1/14-clients.test.ts; M1.41 reads every refusal's code. | M1.42 (proposed addition: a code for `InvalidPayload`) | carries |
| server | ✓ `packages/language-effect/src/modules/handler/service.ts:100` | Each refusal leaves the server typed with its code: declared ones from the handler, `NotAllowed` from the role check, the wrong-state one from the machine check. | e2e/layer2; e2e/m1/14-clients.test.ts. | built | carries |
| sdk | ✓ `packages/generators/src/modules/render/internal/sdk.ts:133` | Each refusal is a typed class in the call's error channel, with its code. | e2e/m1/14-clients.test.ts:181. | M1.12 | carries |
| cli | ✓ `packages/generators/src/modules/render/internal/cli.ts:55` | A refusal prints `[code] Name { public fields }` and exits with its declared code. | e2e/m1/14-clients.test.ts; M1.41's refused claim prints its code. | built; evidence M1.41 | carries |
| mcp | ✓ `packages/language-effect/src/modules/mcp/internal/tool.ts:36` | A refusal is an error result carrying its code and name, its fields cut to what the agent may see. | packages/language-effect/src/modules/mcp/mcp.test.ts:70. | built; M1.37 makes it structured (M3) | carries |
| docs | ✓ `packages/generators/src/modules/render/internal/docs.ts:17` | Each operation's page has a refusals table: name, exit, code and when. | render.test.ts. | built | carries |
| portal | ~ `packages/portal/src/modules/wire/types.ts:44` | Errors are decoded with their codes and exits and shown on the thing's page, on the arrow they guard and in the band, counted by code. | M1.41 reads errors with codes in the data file; M1.13's screenshot. | M1.42 (wire), M1.13 (pages) | carries |
| telemetry | ~ `packages/language-effect/src/modules/handler/service.ts:100` | The span carries `refusal` and `refusal.code`, and `ortho.calls` counts by code. | e2e/m1/17-telemetry-model.test.ts:251 (written ahead, red). | M1.36 | carries |

What "today" means, for each card not yet ✓ (and each regraded one):

- **api.** Each declared refusal is a tagged error with its code, exit and the fields shown. The runtime's own `InvalidPayload` has no code in the model, so one refusal a caller can get has none. Regraded from the reader's ✓ (who noted the gap) against this card's green.
- **portal.** Wire Operation errors and refusals are name arrays; no codes or exits in the structured model, and detail.ts:43 lists names only. Codes appear only inside the embedded docs markdown the page also renders.
- **telemetry.** Operation span gets refusal: <name> (and refusal.log) but no refusal.code; reads do the same (read.ts:67). The ortho.calls counter carries the refusal name only.

### 3. thing

**Thing & fields.** Every thing the blueprint declares, with every field's type, reference, optionality, visibility and description, is the same in every output: typed in the SDK, a typed and described flag in the CLI, an input and output schema in MCP, a reference page in the docs, and a card and page in the portal.

**How it is proved.** The portal's home (one card per thing, grouped by `from`) and each thing's page, with the in-and-out band showing every field and its visibility; M1.41 reads every output for each thing's type and fields; the stage 1 journeys run through the SDK, CLI and MCP (M2.08).

| Output | Today | Green means | Evidence | Owner | Role |
|---|---|---|---|---|---|
| model | ~ `packages/compiler/src/modules/model/types.ts:18-26` | Each thing is in the model with its description and every field's type, named value, reference, optionality, visibility and description. | M1.41 reads `generated/model/model.json` for every field's description; the compiler's model tests. | M1.42 (it needs a way to declare a field's description first: see note) | carries |
| api | ✓ `packages/projections/src/modules/api/internal/api.ts:80-81` | Every endpoint's payload and answer schemas are the declaration's own fields, so each field is typed on the wire. | e2e/m1/12-projections.test.ts; M1.41's generated-API read. | M1.11 (done); evidence in M1.41 | carries |
| server | ✓ `packages/language-effect/src/modules/handler/service.ts:60` | The server decodes every payload and answer against the declaration's fields and refuses a bad one. | e2e/layer1/05-the-generated-surfaces.test.ts; M1.41's calls. | M1.11 (done) | carries |
| sdk | ~ `packages/generators/src/modules/render/internal/sdk.ts:132-134` | The SDK exports a type for each thing (and its fields), not only one function per operation, so a caller can name a `Link` or a `Profile`. | M1.41: the generated SDK exports each thing's type; ST1.02's journeys through the SDK (M2.08). | M1.42 | carries |
| cli | ~ `packages/generators/src/modules/render/internal/cli.ts:9` | Each payload field is a flag typed from its value (number, enum, id), whose help is the field's description; an answer prints by field, not as one blob. | M1.41: `plugged-in link add --help` shows each field's description; a mistyped flag is refused before the call. | M1.42 | carries |
| mcp | ~ `packages/generators/src/modules/render/internal/mcp.ts:24` | Each tool's input schema describes every public field, and it offers an output schema from the answer, so an agent knows the shape it gets back. | M1.41 for described inputs; M1.37's check (an MCP client lists output schemas) for the output schema. | M1.42 (inputs described); M1.37 (output schema, in M3 since K13) | carries |
| docs | ~ `packages/generators/src/modules/render/internal/docs.ts:12` | Each thing has a reference page with a field table: type, reference or named value, optional, visibility and description. | packages/generators/src/modules/render/render.test.ts; M1.41 reads the docs for each field. | M1.42 (descriptions); the rest is built | carries |
| portal | ~ `packages/portal/src/modules/wire/types.ts:12-17` | Home shows one card per thing, and the thing's page shows every field with its type, visibility and description, decoded from the data file (not only the embedded docs). | M1.13's screenshot of Plugged In's home and `profile`'s page at a fixed `now`; M1.41 reads the data file. | M1.42 (the wire), M1.13 (the pages) | carries |
| telemetry | ✓ `packages/language-effect/src/modules/handler/internal/attributes.ts:10-23` | A thing's public, non-text fields (and text fields marked `traced`) appear as `payload.*` and `answer.*` attributes on the operation's span; nothing else does. | packages/language-effect/src/modules/handler/internal/attributes.test.ts; M1.19's "leaks nothing" eval; e2e/m1/16-visibility.test.ts for the telemetry audience. | M1.19 (done); M1.35 moves it onto the one rule | carries |

What "today" means, for each card not yet ✓ (and each regraded one):

- **model.** Things, fields, types, references, optionality and visibility are all in the model. No field has a description: `FieldModel` has no such key, and the blueprint has nowhere to write one (`Blueprint.thing` takes a description for the thing only, `packages/orthograph/src/modules/things/types.ts:27`). M1.41 asks for each field's description in every output, so M1.42 must add one to the blueprint and the model first.
- **sdk.** Operation functions take PayloadOf<typeof declaration> and return the answer, so fields are typed per call; but index.ts exports no type for a thing or its fields, only one function per operation.
- **cli.** One Flag.String per payload field, decoded by the declaration; flags have no help text (and the model has no field description to draw on); a single-field answer prints its bare value, otherwise whole JSON (cli.ts:77-78).
- **mcp.** Catalog entry has only the operation description and declaration; input schema is made at runtime from the payload (mcp/internal/tool.ts:86); no output schema is offered.
- **docs.** Thing and operation pages have a field table with type, reference or named value, optional and visibility. No field has a description to show, because the model has none. Regraded from the reader's ✓ against this card's green.
- **portal.** Wire Field decodes only value/named/ref/optional; visibility is in the data file (model embedded) but dropped on decode; no description.
- **telemetry.** Payload and answer fields become `payload.<f>` and `answer.<f>` attributes when public and non-text, or marked traced (O2, M1.19). That limit is the rule, not a gap, so the card is green by its own definition; the reader graded it ~ against "every field".

### 4. step

**Step.** Every declared step (its kind, the stores it writes, whether it is optional, and the adapter it calls) is in the model, run in order by the server, documented, drawn on the operation's spine and traced as its own span, and never part of a client's contract.

**How it is proved.** The operation's spine in the portal: each declared step in its place, a finished call's spans down it, a running call's step signals as they arrive (M1.21); `ortho prove --empty` shows one red step per blank.

| Output | Today | Green means | Evidence | Owner | Role |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:64` | Each step's name, kind, writes, optional and call are in the model. | the compiler's model tests. | M1.03, M1.14 (done) | carries |
| api | ~ `packages/projections/src/modules/api/internal/api.ts:84` | No part of the caller's contract names a step: the endpoint's schemas don't, and the API package every client imports exports no step list. | new: the absence check (Q1) over generated/api's exports. | M1.42 (proposed: move `steps` beside the handler's wiring in generated/server) | absence check |
| server | ✓ `packages/language-effect/src/modules/handler/service.ts:43` | The handler is given one wrapper per declared step, run in a span; a call step goes through the adapter's runner. | e2e/m1/04-adapter-calls.test.ts; e2e/m1/13-live-steps.test.ts; e2e/m1/10-empty-and-scaffold.test.ts. | M1.14, M1.26 (done) | carries |
| sdk | ✓ `packages/generators/src/modules/render/internal/sdk.ts:23` | The SDK's exported types and doc comments name no step: a caller sees the payload, the answer and the refusals. | new: the absence check (Q1) over the SDK's exported types. | built; the absence check proposed for M1.41 | absence check |
| cli | ✓ `packages/generators/src/modules/render/internal/cli.ts:6` | No command, help text or output names a step. | new: the absence check (Q1) over `--help` and output. | built; the absence check proposed for M1.41 | absence check |
| mcp | ✓ `packages/generators/src/modules/render/internal/mcp.ts:21` | No tool's name, description, input or output schema names a step. | new: the absence check (Q1) over the tool list. | built; the absence check proposed for M1.41 | absence check |
| docs | ~ `packages/generators/src/modules/render/internal/docs.ts:46` | The operation's page lists each step with its kind, the stores it writes, whether it is optional and the adapter call it makes. | render.test.ts extended; M1.41 reads the docs for step details. | M1.42 (proposed: name the docs in its row beside the portal) | carries |
| portal | ~ `packages/portal/src/modules/wire/types.ts:47` | The spine draws each declared step with its kind, writes, optional and call, and lights each from its span or step signal. | M1.41 reads step details in the data file; M1.13's screenshot of the spine with a call down it; e2e/m1/13-live-steps.test.ts. | M1.42 (wire), M1.13 (spine) | carries |
| telemetry | ✓ `packages/language-effect/src/modules/handler/service.ts:43-49` | Each step is a span named `<op>.<step>` with `step.kind`, and sends a signal as it starts and ends. | e2e/m1/13-live-steps.test.ts; packages/language-effect/src/modules/handler/internal/signal.test.ts. | M1.21 (done) | carries |

What "today" means, for each card not yet ✓ (and each regraded one):

- **sdk.** The SDK imports the declaration as a type only (`import type { declaration }`, generated `sdk/src/allowance/spend.ts:4`) and exports `PayloadOf<typeof declaration>`, so no step name reaches its surface. Regraded from ✗: the absence is this card's green.
- **cli.** No help text or output names a step. Each command does import the whole declaration as a value, to decode its flags (generated `cli/src/allowance/spend.ts:4`), so step declarations ship inside the CLI, unseen. Regraded from ✗: the absence is this card's green.
- **mcp.** A tool is the declaration's description and schemas; no step is described. The generated MCP does import the whole declaration as a value (generated `mcp/src/index.ts:6`), so step declarations sit in the MCP server's process, unseen. Regraded from ✗: the absence is this card's green.
- **docs.** Operation page has a Steps section listing name and type per step. Missing: optional, the stores a step writes, and the adapter call of a call step.
- **portal.** Wire step is only { name, type } and detail.ts:44 prints that; optional, writes and call are dropped. Live view joins step signals by span id (live/internal/join.ts) separately.
- **api.** The endpoint's schemas name no step, but each generated `api/src/<thing>/<op>.ts` exports `steps` (api.ts:84), and the SDK, CLI and MCP import from that package. Regraded from ✓: the old green, "the endpoint carries the declared steps", is under the rule the leak itself.

### 5. machine

**Machine, states, move.** A thing's lifecycle (its states, its moves, what each move emits and the refusal for a wrong state) is typed in every client, documented, drawn as the lifecycle strip in the portal, and every move is traced from and to.

**How it is proved.** The lifecycle strip on a thing's card and page, with move counts on each arrow and refusals on the arrow they guard (portal.md, "A thing's page"), lit by `move.name`, `move.from` and `move.to`.

| Output | Today | Green means | Evidence | Owner | Role |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:48` | Each thing's machine (states, moves with from, to and emits, the wrong-state refusal) and each operation's move are in the model. | e2e/m1/12-projections.test.ts. | built | carries |
| api | ~ `packages/projections/src/modules/api/internal/api.ts:35` | Each move-guarded endpoint declares the wrong-state refusal, and a thing's `state` is typed as the union of its states, not a string. | M1.41 reads the generated API for each machine's states. | M1.42 (proposed addition: `state` as a literal union in the answer schema) | carries |
| server | ✓ `packages/language-effect/src/modules/handler/internal/move.ts:39` | A wrong-state call is refused before the handler; a move sets the state and commits it with its journal entry. | packages/language-effect/src/modules/handler/internal/commit.test.ts; e2e/layer2. | built | carries |
| sdk | ✗ `examples/acme/generated/sdk/src/organization/get.ts:8` | A thing's state is a typed union in the SDK, and the wrong-state refusal is a typed class. | M1.41 reads the SDK's types; ST1.02 through the SDK (M2.08). | M1.42 | carries |
| cli | ✗ `packages/generators/src/modules/render/internal/cli.ts:1` | A `get` prints the state, and a command's help says which states it moves from and to. | M1.41 reads `--help`. | M1.42 | carries |
| mcp | ✗ `packages/language-effect/src/modules/mcp/internal/tool.ts:32` | A tool states which states it moves from and to in what the framework emits for it (its input and output schemas, annotations and metadata (`_meta`)), never in its description, which is the author's and must equal the model's (operation.mcp); its output schema types the state. Changed by #150: the old wording, \"description\", contradicted operation.mcp's exact-description rule. | M1.37's output-schema check. | M1.37 (M3) | carries |
| docs | ✓ `packages/generators/src/modules/render/internal/docs.ts:66` | The thing's page lists its states, the wrong-state refusal and a move table; each operation's page has its move. | render.test.ts; M1.41. | built; evidence M1.41 | carries |
| portal | ~ `packages/portal/src/modules/site/internal/detail.ts:58` | The lifecycle strip is drawn from the machine on the thing's card and page, with live move counts on each arrow. | M1.13's screenshot of `handle`'s lifecycle lit by a journey's claim. | M1.13 | carries |
| telemetry | ~ `packages/language-effect/src/modules/handler/internal/move.ts:48` | Every move writes `move.name`, `move.from` and `move.to` on the operation's span. | e2e/m1/17-telemetry-model.test.ts (written ahead, red on `move.from`). | M1.36 | carries |

What "today" means, for each card not yet ✓ (and each regraded one):

- **api.** The wrong-state refusal is declared on each guarded endpoint, carrying `state`. States are plain strings: no union type, so the SDK, CLI and MCP can't carry one either. Regraded from the reader's ✓ against this card's green.
- **sdk.** SDK is a thin wrapper over the API client; no state union type, no allowed-moves listing. State is visible only as a string in a get answer and the refusal class's `state`.
- **cli.** No state types and no way to see allowed moves; `get --json` prints the state string with the answer, and a refusal prints `state`.
- **mcp.** Reads keep `state` in list items and the machine refusal exposes `state` as public, but tool schemas carry no state enum and nothing lists allowed moves.
- **portal.** The thing's page draws its states and a move, from, to and emits table from the wire. There is no lifecycle strip and no live count on a move, because no trace source reaches the portal yet (`packages/portal/src/modules/wire/service.ts:8`). Regraded from the reader's ✓ against this card's green.
- **telemetry.** Writes move.name and move.to on the operation span; move.from is not written, and the machine's refusal writes no state. Subject state at call time is not on any span.

### 6. event

**Event.** Every event a move emits is typed in the SDK, documented with its fields, shown on the thing's page with its fields, named on the commit span, and its committed occurrences show in the portal with the commit that wrote them.

**How it is proved.** The thing's page lists its events with their fields; an operation's spine shows the event its commit emitted and the `on:` handlers it set off (M1.21's committed events from the journal).

| Output | Today | Green means | Evidence | Owner | Role |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/internal/describe.ts:88` | Each thing's events with their fields, and the event each move emits, are in the model. | e2e/m1/12-projections.test.ts. | built | carries |
| api | ✓ `packages/projections/src/modules/api/internal/api.ts:133` | Not needed while event's audience leaves out the caller (Q3); A reopens these at M5.05, with views. | M1.41 reads `generated/api/src/events.ts`. | Q3 (the export stays: the server reads it; it is no caller's contract) | not needed (rule) |
| server | ✓ `packages/language-effect/src/modules/handler/internal/move.ts:61` | A move's event is written to the journal in the same commit, without its secret or private fields. | packages/language-effect/src/modules/handler/internal/commit.test.ts; e2e/m1/13-live-steps.test.ts. | built (M1.21 reads it) | carries |
| sdk | ✗ `packages/generators/src/modules/render/internal/sdk.ts:1` | Not needed while event's audience leaves out the caller (Q3); A reopens these at M5.05, with views. | M1.41 reads the SDK's exports for `Events`. | Q3 (A moves M1.42's "the SDK exports the events" to M5.05) | not needed (rule) |
| cli | ✗ `packages/generators/src/modules/render/internal/cli.ts:1` | Not needed while event's audience leaves out the caller (Q3); A reopens these at M5.05, with views. | none | Q3 for Aaron | not needed (rule) |
| mcp | ✗ `packages/language-effect/src/modules/mcp/internal/tool.ts:1` | Not needed while event's audience leaves out the caller (Q3); A reopens these at M5.05, with views. | none | Q3 for Aaron | not needed (rule) |
| docs | ~ `packages/generators/src/modules/render/internal/docs.ts:68` | Each event is documented with its fields and visibility, on its thing's page. | render.test.ts extended; M1.41 reads each event's fields in the docs. | M1.42 (proposed: name the docs in its row) | carries |
| portal | ~ `packages/portal/src/modules/wire/types.ts:43` | The thing's page lists its events with their fields, decoded from the data file; committed events show on the operation's spine with their commit. | M1.41 reads events with their fields in the data file; M1.13's screenshot. | M1.42 (wire), M1.13 (pages) | carries |
| telemetry | ~ `packages/language-effect/src/modules/handler/internal/move.ts:73` | The commit span `<op>.commit` carries `event.name`. | e2e/m1/17-telemetry-model.test.ts (written ahead, red: today `event.name` lands on the operation's span, not the commit's). | M1.36 | carries |

What "today" means, for each card not yet ✓ (and each regraded one):

- **sdk.** SDK exports operations and errors only; the API's Events namespace is not re-exported and no event types reach clients.
- **cli.** No command or output names an event.
- **mcp.** No tool, resource or description mentions events or the journal.
- **docs.** Machine table and operation Move section name the emitted event, but the event's fields are not documented and events have no page.
- **portal.** Event is a string in move.emits and the Machine table; the Thing wire has no events field, so event fields are not decoded or drawn.
- **telemetry.** event.name is annotated on the current span inside applyMove, which runs before the commit span opens (service.ts:83-88), so it lands on the operation span; check 17 wants it on `<op>.commit`. Event fields are not traced; a refusal writes none.

### 7. visibility

**Field visibility (secret, private).** One rule decides, per audience, what each field shows: a secret leaves only in the answer of the call that issued it, a private field only to the roles it names, and every output (HTTP answers and refusals, SDK, CLI, MCP, docs, portal, spans, journal, logs) calls the same rule and fails closed.

**How it is proved.** Check 16 renders every output for every audience over a fixture with a public, a private and a secret field (M1.35); the portal's "no leak" check (M1.13); stage 4's club, whose portal shows nothing that names a member (ST4.07).

| Output | Today | Green means | Evidence | Owner | Role |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/internal/describe.ts:31-41` | Each field's visibility (public by default, private to roles, or secret) is in the model, on payloads, answers, events and errors alike. | the compiler's model tests. | built | carries |
| api | ✗ `packages/projections/src/modules/api/internal/api.ts:80-81` | The HTTP schemas a caller is served are cut by the one rule for that caller: a refusal never carries a field the caller may not see. | e2e/m1/16-visibility.test.ts (written ahead, red). | M1.35 | carries |
| server | ✗ `packages/language-effect/src/modules/wire/service.ts:5-14` | The server redacts answers and refusals through the one rule before they leave. | e2e/m1/16-visibility.test.ts (red). | M1.35 | carries |
| sdk | ✗ `packages/generators/src/modules/render/internal/sdk.ts:132-134` | The SDK's types and decoded values are the caller's audience's, so a secret never arrives where it wasn't issued. | e2e/m1/16-visibility.test.ts (red). | M1.35, M1.12 | carries |
| cli | ~ `packages/generators/src/modules/render/internal/cli.ts:55-58` | Answers and refusals print through the one rule; `Errors.shown` goes. | e2e/m1/16-visibility.test.ts (red). | M1.35 | carries |
| mcp | ✓ `packages/language-effect/src/modules/mcp/internal/shown.ts:8-22` | The agent audience: public always, private to a role held, secret never, failing closed on an undeclared field. | packages/language-effect/src/modules/mcp/mcp.test.ts; e2e/m1/16-visibility.test.ts. | built; M1.35 makes it the agent case of the one rule | carries |
| docs | ~ `packages/generators/src/modules/render/internal/docs.ts:12` | Every field table (payload, answer, event, error) marks each field's visibility. | render.test.ts extended; M1.41 reads visibility in the docs. | M1.42 (proposed: event and error fields) | carries |
| portal | ✗ `packages/portal/src/modules/wire/types.ts:12-17` | The data file's visibility is decoded and drawn (the in-and-out band marks secret and private), and the trace drawer shows only what the telemetry audience may see. | M1.41 reads visibility in the data file; M1.13's "no leak" check. | M1.42 (wire), M1.13 (no leak) | carries |
| telemetry | ✓ `packages/language-effect/src/modules/handler/internal/attributes.ts:39` | Spans, the journal and logs carry only fields the telemetry audience may see: public, and text only when marked traced. | packages/language-effect/src/modules/handler/internal/attributes.test.ts; e2e/m1/16-visibility.test.ts. | built (M1.19); M1.35 moves it onto the one rule | carries |

What "today" means, for each card not yet ✓ (and each regraded one):

- **api.** Answer and payload schemas are the declaration's whole schemas; visibility is used only to build the CLI 'shown' list of refusal fields (api.ts:21), nothing is cut from an HTTP body.
- **server.** Refusals are rebuilt with every field but _tag, secret and private included; answers go out whole. No visibility module exists in language-effect (modules list has none); only mcp/internal/shown.ts redacts.
- **sdk.** SDK decodes the whole answer and typed failure; visibility is not read.
- **cli.** Refusal print shows only public fields (Errors.shown); an answer prints whole (cli.ts:77-78) and --json prints the whole text(a).
- **docs.** Field tables mark '(secret)' or 'private to <roles>' on thing and operation pages; refusal fields in the errors table not checked, and no audience concept.
- **portal.** Wire Field has no visibility; the model is embedded in the data file but the schema drops the key, so pages cannot show it.

### 8. journey

**Journey & starting world.** Every journey and starting world is in the model, runs through each client (SDK, CLI, MCP), is listed in the docs as the worked example of the operations it covers, and shows in the portal as the proof on each operation, its runs lighting up what it touched.

**How it is proved.** The proof tab on each operation (the journeys that cover it and their verdicts, M1.04) and the proof matrix per environment (portal.md); `ortho prove` passing `--through sdk|cli|mcp` (M2.08).

| Output | Today | Green means | Evidence | Owner | Role |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:144` | Journeys (cast, start, steps with their checks) and starting worlds are in the model. | packages/prove/src/modules/journeys/journeys.test.ts; Gate M1 item 4. | M1.03 (done) | carries |
| api | ✗ `packages/projections/src/modules/api/internal/api.ts:1` | Not needed: journeys run through this client (M2.08), never in it. | none | none; journeys through this client are M2.08 | not needed (rule) |
| server | ✓ `packages/projections/src/modules/server/internal/server.ts:148` | The deployed server serves no journey; `/_world/*` (the cast, the facts, the registry of worlds a journey starts from) answers only in an environment that declares a lifetime, and 404 everywhere else. | new: a check that `/_world/*` answers 404 in an environment without a lifetime. | built; its check proposed for M1.41 | carries |
| sdk | ✗ `packages/generators/src/modules/render/internal/sdk.ts:62` | Not needed: journeys run through this client (M2.08), never in it. | M2.08. | none; journeys through this client are M2.08 | not needed (rule) |
| cli | ✗ `packages/generators/src/modules/render/internal/cli.ts:1` | Not needed: journeys run through this client (M2.08), never in it. | M2.08. | none; journeys through this client are M2.08 | not needed (rule) |
| mcp | ✗ `packages/language-effect/src/modules/mcp/internal/tool.ts:1` | Not needed: journeys run through this client (M2.08), never in it. | M2.08. | none; journeys through this client are M2.08 | not needed (rule) |
| docs | ✗ `packages/generators/src/modules/render/internal/docs.ts:1` | Each operation's page lists the journeys that cover it, as worked examples drawn from the model. (Superseded by W2, 20 November 2026.) | new: render.test.ts. | M1.13 (proposed addition) | carries |
| portal | ✗ `packages/portal/src/modules/wire/service.ts:7` | The wire decodes journeys and starting worlds (today it says "unavailable", and the reason is stale), and each operation's proof tab shows its journeys and their verdicts. | M1.13's proof tab; M1.41 reads journeys in the data file (proposed addition). | M1.13 (journeys, starting worlds, the proof tab) | carries |
| telemetry | ~ `packages/prove/src/modules/journeys/internal/device.ts:62` | A journey's calls are traced under the journey's name and step, so the portal lights what a run touched. | e2e/layer1/02-acme-proves.test.ts (spans read back); new for the names. | M1.13 (proposed addition: `journey` and `journey.step` on prove's spans, which its "a journey's run lights up its operation" needs) | carries |

What "today" means, for each card not yet ✓ (and each regraded one):

- **api.** Journeys are not part of the HTTP surface.
- **server.** The server forms `WORLD_ENVIRONMENTS` from the environments that declare a lifetime (server.ts:148) and answers 404 on `/_world/*` anywhere else (server.ts:194). Regraded from ✗: it was proposed not needed, but under the audiences rule the server is the operator's output and journeys are the operator's, so the card is needed, and the world gate is its green.
- **sdk.** SDK has no journey surface; journeys call operations through a cast (s.ada.run), not the SDK (examples/acme/journeys/README.md:64).
- **cli.** The generated app CLI has no journey command; running journeys is the framework's `ortho prove`.
- **mcp.** No journey tool or resource.
- **docs.** Docs render things and operations only; the journeys that exercise an operation are not rendered as examples or pages, though the model holds them.
- **portal.** The portal wire marks journeys explicitly unavailable ('the compiler's model has no journey projection'); the reason is stale, the model has journeys, but ModelSchema (wire/types.ts:68) does not read them.
- **telemetry.** A journey call runs under a trace and a parent span (prove prefix) and prove reads spans back through trace-trees to check present/absent spans (checks.ts:82). The runtime writes no journey.name attribute and no journey record is exported.

### 9. roles

**Roles.** Who may call each operation is declared once and is true everywhere: enforced by the server, said in the SDK's doc comment, the CLI's help and the MCP tool's description, MCP lists only the tools the caller's roles allow, the docs and portal show each role rule, and each span says which role let the call through.

**How it is proved.** Roles on a thing's page and `allowed` in each operation's band (portal.md); the stage 1 journeys "a stranger can't edit" run through every client (ST1.02 with M2.08); M2.02's principal journeys.

| Output | Today | Green means | Evidence | Owner | Role |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/internal/describe.ts:90-102` | Each thing's roles and role rules, and each operation's `allowed`, are in the model. | the compiler's model tests. | M1.03 (done) | carries |
| api | ✓ `packages/projections/src/modules/api/internal/api.ts:40-42` | Every operation declares `NotAllowed` with its code. | e2e/layer1/05-the-generated-surfaces.test.ts. | built | carries |
| server | ✓ `packages/language-effect/src/modules/handler/service.ts:60` | The role check runs before the handler on every operation and read, and refuses with `NotAllowed`. | packages/language-effect/src/modules/access/access.test.ts; acme's journey "an outsider can't revoke"; ST1.02 "a stranger can't edit". | built; M2.03 adds the new principals | carries |
| sdk | ✗ `packages/generators/src/modules/render/internal/sdk.ts:132-134` | Each function's doc comment says who may call it. | M1.41 reads the SDK's doc comments (proposed addition to M1.41). | M2.03 (proposed addition) | carries |
| cli | ✗ `packages/generators/src/modules/render/internal/cli.ts:9` | Each command's help says who may call it; `NotAllowed` prints its code and exits 3. | M1.41 reads `--help` (proposed addition). | M2.03 (proposed addition) | carries |
| mcp | ~ `packages/language-effect/src/modules/mcp/internal/tool.ts:19-24` | Only the tools the caller's roles allow are listed, each description says who may call, and an operation closed to agents (`.notVia(Via.agent)`) has no tool. | M2.02's "an agent passes the owner rule unless `.notVia(Via.agent)`"; M3.22's tool exposure from `allowed` and `via`. | M2.03 (`.via`, `.notVia`), M3.22 (exposure) | carries |
| docs | ✓ `packages/generators/src/modules/render/internal/docs.ts:15` | Each operation's page says who may call, and each thing's page shows its role rules. | render.test.ts. | M1.13 (role rule text) | carries |
| portal | ~ `packages/portal/src/modules/wire/types.ts:46` | The thing's page lists its roles with their rules, and each operation's band shows `allowed`. | M1.13's screenshot; M1.41 reads role rules in the data file. | M1.13 (role rules, K12 section 6) | carries |
| telemetry | ~ `packages/language-effect/src/modules/handler/internal/attributes.ts:17-18` | Each span says which kind of caller it was and which role let the call through, never which person. | e2e/m1/17-telemetry-model.test.ts extended (proposed). | M2.03 (proposed addition: `principal.role`) | carries |

What "today" means, for each card not yet ✓ (and each regraded one):

- **server.** `Access.check` runs before the handler, and role rules and role-of paths are decided in `access/service.ts`; acme's journeys prove refusals end to end. The reader graded ~ for want of an HTTP-level test; journeys are that test, so the card is green by its definition.
- **sdk.** SDK says nothing about who may call an operation or what roles exist; callers learn from a NotAllowed failure.
- **cli.** No help line or command text says who may call; NotAllowed prints its code and exit 3.
- **mcp.** Roles the caller holds are computed (Access.holds) to redact private fields; every tool is listed regardless of the caller's roles and the description omits who may call. Via.agent narrows tools at generation (render/internal/mcp.ts:10); notVia is not in the code at all.
- **portal.** Wire has thing roles (names) and operation allowed with kind/role/path; detail.ts:15,60 draws them. roleRules and the 'private to' link are not decoded.
- **telemetry.** Spans carry principal.person or principal.kind, and ortho.calls has principal.kind; the role held in the call is not recorded.

### 10. environment

**Environment.** Each declared environment (where it runs, its identity, its stores' bindings, its secrets by name, its telemetry sink, its domains) is served as declared, named on every call's span, documented, and is the portal's switcher; whether the clients know environments by name is Q4.

**How it is proved.** The portal's environment switcher in the top bar and the proof matrix (every operation against every environment, portal.md "Environments"); `environment` on every span (M1.36).

| Output | Today | Green means | Evidence | Owner | Role |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:116` | Each environment's runs, identity, lifetime, cloud and database, store bindings, secret names, sinks, deploy domains and publish targets are in the model. | the compiler's model tests. | built | carries |
| api | ✗ `packages/projections/src/modules/api/internal/api.ts:1` | Not needed while environment's audience leaves out the caller; Q4's A widens it to the caller for the environments' names and public domains, and reopens these. | none | none | not needed (rule) |
| server | ~ `packages/projections/src/modules/server/internal/server.ts:148` | The server reads which environment it is, binds each store as that environment declares, and gates test-world routes to environments with a lifetime. | packages/projections/src/modules/server/server.test.ts; M7.03's `ortho env up staging` plans per-environment bindings. | M7.03 (bindings per environment) | carries |
| sdk | ✗ `packages/generators/src/modules/render/internal/sdk.ts:98` | Not needed while environment's audience leaves out the caller; Q4's A widens it to the caller for the environments' names and public domains, and reopens these. | none | Q4 for Aaron | not needed (rule) |
| cli | ~ `packages/generators/src/modules/render/internal/cli-session.ts:41` | Not needed while environment's audience leaves out the caller; Q4's A widens it to the caller for the environments' names and public domains, and reopens these. | none | Q4 for Aaron | not needed (rule) |
| mcp | ✗ `packages/generators/src/modules/render/internal/mcp.ts:6` | Not needed while environment's audience leaves out the caller; Q4's A widens it to the caller for the environments' names and public domains, and reopens these. | none | none | not needed (rule) |
| docs | ✗ `packages/generators/src/modules/render/internal/docs.ts:1` | The docs have an environments page: each environment, where it is served, its sink, its stores' bindings and its secrets by name. | new: render.test.ts for the page. | M1.13 (proposed addition: the environments page) | carries |
| portal | ~ `packages/portal/src/modules/wire/types.ts:67` | The top bar's switcher is built from the model's environments and their domains; each environment's portal reads only its own sink. | M1.13's screenshot of the switcher; M1.41 reads environments in the data file. | M1.13 (environments, K12 section 6) | carries |
| telemetry | ~ `packages/host-cloudflare/src/modules/telemetry/service.ts:9` | Every call's span carries `environment` (the resource already carries `deployment.environment`). | e2e/m1/17-telemetry-model.test.ts:267 (written ahead, red). | M1.36 | carries |

What "today" means, for each card not yet ✓ (and each regraded one):

- **api.** No environment appears in the api projection or generated/api.
- **server.** Server reads ORTHO_ENVIRONMENT, gates /_world/* by the environments that declare a lifetime, and passes the name to Telemetry. wrangler.jsonc (worker-config.ts:9) is one local file: no per-environment bindings, domains or database from the environment declarations (those are done by ortho env up / ship in packages/cli).
- **sdk.** Sdk.layer(baseUrl, token) takes a URL; the SDK knows no environment names or per-environment URLs.
- **cli.** `session sign-in --env <env>` and `session show --env` keep one session per environment name, but the name is a free string (not checked against the model) and the server address is a single ACME_URL variable, defaulting to localhost; there is no environment-to-URL map and no --env on ordinary operation commands (cli.ts:112 uses ACME_URL/ACME_TOKEN).
- **mcp.** The MCP catalog has no environment; the worker only forwards ORTHO_ENVIRONMENT to telemetry (server.ts:209).
- **docs.** Docs pages are per thing and operation; no environments page or mention (acme/generated/docs has no environment content).
- **portal.** Wire has Environment {name, runs, promotesFrom, lifetimeMs} only. Identity, database, per-store binding, secrets, sinks, deploy domains and publish are dropped by the decoder.
- **telemetry.** Every span's resource already carries deployment.environment (host-cloudflare, prove tests). The per-call `environment` plain attribute on the operation span (check 17 item 5) is not written.

### 11. store

**Store.** Each store the blueprint declares (or a mounted plugin brings) has its own binding and migrations, says what lives in it in the docs and the portal's data page, and is named on every call's span; callers never see where a thing lives.

**How it is proved.** The portal's data page (every store, its kind, binding and migrations, M5.06) and a thing's header naming its store; `store` on every span (M1.36); K3's check that a call writing two stores is refused (Gate M1 item 5).

| Output | Today | Green means | Evidence | Owner | Role |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:178` | Each store (name, kind, from, hash), each thing's store and each environment's store bindings are in the model; a call writing two stores is refused. | packages/compiler/src/modules/model/stores.test.ts; Gate M1 item 5. | M1.17 (done) | carries |
| api | ✗ `packages/projections/src/modules/api/internal/api.ts:1` | Not needed: a store is the builder's and the operator's; a store renamed never changes a caller's contract. | none | none | not needed (rule) |
| server | ✓ `packages/projections/src/modules/server/internal/worker-config.ts:21` | Each store gets its own binding and migrations folder, with its things, journal and request keys. | packages/generators/src/modules/render/stores.test.ts. | M1.17 (done) | carries |
| sdk | ✗ `packages/generators/src/modules/render/internal/sdk.ts:1` | Not needed: a store is the builder's and the operator's; a store renamed never changes a caller's contract. | none | none | not needed (rule) |
| cli | ✗ `packages/generators/src/modules/render/internal/cli.ts:1` | Not needed: a store is the builder's and the operator's; a store renamed never changes a caller's contract. | none | none | not needed (rule) |
| mcp | ✗ `packages/generators/src/modules/render/internal/mcp.ts:1` | Not needed: a store is the builder's and the operator's; a store renamed never changes a caller's contract. | none | none | not needed (rule) |
| docs | ~ `packages/generators/src/modules/render/internal/docs.ts:64` | Each store has a page (its kind, what lives in it, its migrations), and each thing's page links its store. | stores.test.ts extended; M5.06's `generated/data/map.md`. | M5.06 (the data map) | carries |
| portal | ✗ `packages/portal/src/modules/wire/types.ts:53` | The data file and wire carry stores, the thing's header names its store, and the data page lists every store. | M5.06's data page; M1.41 reads stores in the data file. | M1.13 (stores in the wire, K12 section 6); M5.06 (the page) | carries |
| telemetry | ✗ `packages/language-effect/src/modules/handler/internal/attributes.ts:1` | Every call's span carries `store`. | e2e/m1/17-telemetry-model.test.ts:267 (written ahead, red). | M1.36 | carries |

What "today" means, for each card not yet ✓ (and each regraded one):

- **api.** api.ts does not mention stores.
- **sdk.** No store in the SDK.
- **cli.** No store in the CLI.
- **mcp.** No store in the MCP catalog.
- **docs.** Thing page says 'in the store <name>' (and database vs actor); there is no page for a store, no list of what lives in it, and no kind.
- **portal.** Wire Thing has `lives` but no `store`; Model has no stores key, so the portal cannot show stores.
- **telemetry.** The operation span does not carry `store` (the kind of the store, check 17 item 5).

### 12. mount

**Mount, adapter, plugin origin.** A plugin mounted with one file brings its things, operations, stores and adapters into every output as if they were the app's own, honouring the mount's narrowing, while the docs, the portal and the spans say where each came from (plugin, package, version) and which adapter a call step called.

**How it is proved.** The portal's tree, one folded group per mounted plugin with its version in the page header (portal.md, "The frame"); a call step on the spine naming its adapter; check 01 mounts a plugin with one command (Gate M1 item 1).

| Output | Today | Green means | Evidence | Owner | Role |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:12` | `from` (mount, package, version) on things, operations and stores, the mounts, `via` and each call step's adapter are in the model. | e2e/m1/01-mounting.test.ts. | M1.03, M1.06 (done) | carries |
| api | ✓ `packages/projections/src/modules/api/internal/api.ts:73` | Not needed: the plugin a mounted operation came from is the builder's and the operator's; the operation itself reaches callers through the operation lane, as the app's own. | e2e/m1/01-mounting.test.ts; e2e/m1/08-verbs.test.ts. | none | not needed (rule) |
| server | ✓ `packages/projections/src/modules/server/internal/server.ts:25` | Each mount is imported once and its operations served; call steps are wired to the adapter's callables. | e2e/m1/04-adapter-calls.test.ts. | M1.09, M1.14 (done) | carries |
| sdk | ✓ `packages/generators/src/modules/render/internal/sdk.ts:65` | Not needed: the plugin a mounted operation came from is the builder's and the operator's; the operation itself reaches callers through the operation lane, as the app's own. | e2e/m1/03-adapter-mounting.test.ts; e2e/m1/11-client-operations.test.ts. | none | not needed (rule) |
| cli | ✓ `packages/generators/src/modules/render/internal/cli.ts:6` | Not needed: the plugin a mounted operation came from is the builder's and the operator's; the operation itself reaches callers through the operation lane, as the app's own. | e2e/m1/01-mounting.test.ts (proposed addition: through the CLI). | none | not needed (rule) |
| mcp | ✓ `packages/generators/src/modules/render/internal/mcp.ts:10` | Not needed: the plugin a mounted operation came from is the builder's and the operator's; the operation itself reaches callers through the operation lane, as the app's own. | e2e/m1/01-mounting.test.ts. | none | not needed (rule) |
| docs | ✗ `packages/generators/src/modules/render/internal/docs.ts:1` | Each page from a plugin names its plugin, package and version, and a call step names its adapter and call. | new: render.test.ts over a mounted fixture. | M1.13 (proposed addition: `from` in the docs) | carries |
| portal | ✗ `packages/portal/src/modules/wire/types.ts:35` | The tree groups things by plugin, each page's header names its plugin and version, and a call step names its adapter. | M1.41 reads `from` and mounts in the data file; M1.13's screenshot of Plugged In with handles mounted. | M1.42 (`from` in the wire), M1.13 (the tree) | carries |
| telemetry | ✗ `packages/language-effect/src/modules/handler/service.ts:28` | An operation's span names its mount, and a call step's span names its adapter and call. | new: e2e/m1/17-telemetry-model.test.ts extended. | M1.36 (proposed addition: `from.mount`, `call.mount`, `call.name`) | carries |

What "today" means, for each card not yet ✓ (and each regraded one):

- **api.** A mounted plugin's operations are generated as the app's own, and an omitted one is gone (check 08). Under the rule this card is not needed; its old green ("A mounted plugin's operations are served as the app's own, without the ones its mount omits") is the operation lane's, where mounted operations are proved.
- **sdk.** Mounted operations are in the SDK as the app's own, and `from` is used to load a device operation's host entry. Under the rule this card is not needed; its old green ("A mounted plugin's operations are in the SDK as the app's own; a device operation runs from the plugin's host entry") is the operation lane's, where mounted operations are proved.
- **cli.** Commands are generated per thing and verb from the whole model, mounted operations included. Under the rule this card is not needed; its old green ("A mounted plugin's operations are commands as the app's own") is the operation lane's, where mounted operations are proved.
- **mcp.** Mounted operations are tools, and an operation narrowed without `Via.agent` has none. Under the rule this card is not needed; its old green ("A mounted plugin's operations are tools as the app's own; a mount that narrows away `Via.agent` leaves no tool") is the operation lane's, where mounted operations are proved.
- **docs.** No `from`, mount, package or version in docs.
- **portal.** Operation and Thing wire carry no `from`, no mounts, no via; step has only {name,type}, so a call step shows no adapter.
- **telemetry.** A call step is a span `<op>.<step>` with step.kind=call; the adapter, mount, package or call name is not an attribute.

### 13. device

**Runs on the device (runs: "client").** An operation declared `runs: "client"` runs in the caller's process from the SDK and the CLI with no server request, never on the server, is documented as running on the device, marked in the portal, and its spans reach the environment's sink like any call.

**How it is proved.** Check 11 (a client operation through the SDK and CLI with no server call); stage 2's wallet created on the device (ST2.06); the operation's page in the portal marked "on your device", lit by its spans (portal.md gap 4).

| Output | Today | Green means | Evidence | Owner | Role |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:93` | `runs` is in the model; a client operation is accepted only from a plugin with host entries, and refused without one. | e2e/m1/11-client-operations.test.ts. | M1.27 (done) | carries |
| api | ✓ `packages/projections/src/modules/api/internal/api.ts:88` | A client operation has its declaration in the API, for the clients' types, and no route. | e2e/m1/11-client-operations.test.ts. | M1.27 (done) | carries |
| server | ✓ `packages/projections/src/modules/names/internal/names.ts:58` | The server holds no code for a client operation. | e2e/m1/11-client-operations.test.ts (the worker holds none). | M1.27 (done) | carries |
| sdk | ✓ `packages/generators/src/modules/render/internal/sdk.ts:125` | A client operation runs in-process from the SDK, under the app's mount, with its steps as spans. | e2e/m1/11-client-operations.test.ts. | M1.27 (done) | carries |
| cli | ✓ `packages/generators/src/modules/render/internal/cli.ts:28` | A client operation runs in-process from the CLI with no server request. | e2e/m1/11-client-operations.test.ts:139-141. | M1.27 (done) | carries |
| mcp | ✓ `packages/generators/src/modules/render/service.ts:19` | No device operation is offered as a remote MCP tool: an agent reaches it through the SDK or the CLI on the device. | check 11 extended: the generated MCP names no client operation. | M1.27 (done); its check proposed for M1.41 | carries |
| docs | ✗ `packages/generators/src/modules/render/internal/docs.ts:40` | A client operation's page says it runs on the device and which hosts it supports. | new: render.test.ts. | M1.13 (proposed addition) | carries |
| portal | ✗ `packages/portal/src/modules/wire/types.ts:35` | The wire carries `runs`, and the operation's page marks it "on your device". | M1.41 reads `runs` in the data file; M1.13's screenshot. | M1.13 (`runs`, K12 section 6) | carries |
| telemetry | ~ `packages/language-effect/src/modules/handler/internal/device.ts:36` | A device operation's spans (operation, steps, refusal, `environment`) reach the environment's sink, so the portal lights it like any call. | e2e/m1/11-client-operations.test.ts:214 (spans exported); new for the sink. | new slice needed: device spans to the environment's sink (portal.md gap 4, ledger `LAH-02`), proposed ST2.07 before ST2.03 | carries |

What "today" means, for each card not yet ✓ (and each regraded one):

- **api.** A client operation gets its declaration and no route (`declarationOnly`). That is this card's green; the reader graded ~ against a route.
- **server.** `serverModel` drops client operations, and check 11 proves the worker holds none. That absence is this card's green; the reader graded ✗ by design.
- **mcp.** `renderMcp` is given `serverModel`, which drops client operations, so a device operation has no tool. Regraded from ✗: it was proposed not needed, but the device block is the caller's, so the card is needed, and that absence is its green.
- **docs.** Docs page for a client op is written like a server op's; no `runs` or 'runs on your device' text, no host entries.
- **portal.** Wire Operation has no `runs` field; the portal lists the client op's steps (check 11 item 6) but cannot say it runs on the device.
- **telemetry.** Operation span plus a span per step (step.kind), payload/answer attributes and principal, exported over OTLP before return. No journal, commit span, move or refusal attributes (no store, 'no one to ask'), and the `environment`/`store` attributes of check 17 do not apply.

## Who each block is for

Aaron, 19 November, on the first list of not-needed cards: "We either have a missing abstraction, or the abstraction's
there but it hasn't been named." It was there: every output is written for someone, and every building block is
meant for some of those people and not others. Named, it replaces the hand-made list. Whether the rule holds is
Aaron's (Q2); the table below, where it lives and how it relates to field visibility are decided here.

**Three audiences, and the outputs each one reads.**

| Audience | Who | Outputs |
|---|---|---|
| caller | a person, a program or an agent calling the app | api, sdk, cli, mcp |
| builder | the person writing the blueprint and the handlers | model, docs, and the scaffold (written once, then theirs; not a column) |
| operator | the person running it | server, telemetry |
| | | the portal serves the builder and the operator |

**Each block belongs to a set of audiences.**

| Block | caller | builder | operator | Why |
|---|---|---|---|---|
| thing | ✓ | ✓ | ✓ | A thing's fields are every payload and answer: callers type against them. |
| operation | ✓ | ✓ | ✓ | The caller's whole contract, the builder's handler, the operator's calls and budget. |
| step | absent | ✓ | ✓ | How the handler works, not what the caller asked for: a step renamed or split must never change a caller's contract. Leaving its audience is a leak. |
| machine | ✓ | ✓ | ✓ | A thing's state is in its answers, and the wrong-state refusal is the first thing a caller meets. |
| event | (M5.05) | ✓ | ✓ | The runtime's record of a move. A caller reads state, not the journal, until views make events followable (Q3). |
| error | ✓ | ✓ | ✓ | Refusals are the caller's contract: name, code and exit. |
| roles | ✓ | ✓ | ✓ | A caller needs to know who may call before calling (M2.03). |
| visibility | ✓ | ✓ | ✓ | The rule over what each audience sees: its caller cards are where a secret must not leave. |
| environment | (Q4) | ✓ | ✓ | Where the app runs and what it binds; a caller is handed a URL. Q4 decides whether the caller gets the environments' names and public domains. |
| store | | ✓ | ✓ | Where things live: a store renamed or rebound must never change a caller's contract. |
| mount | | ✓ | ✓ | A mounted plugin's operations reach callers through the operation lane, as the app's own; which plugin they came from is not the caller's business. |
| device | ✓ | ✓ | ✓ | The caller runs a device operation in its own process; the operator sees its spans (ST2.07). |
| journey | | ✓ | ✓ | Journeys prove the app: they run through the clients (M2.08), never in them. The server's part is the starting world. |

**The rule.** A card is not needed exactly when its output's audiences and its block's audiences don't meet. Where a
block reaching an audience would be a leak (steps reaching callers), the card stays live as an absence check: its
green is that the block is never there. The board derives this from the two tables; no card stores it.

```ts
// design/grid/types.ts
export const cellRole = (block: Block, output: Output): CellRole =>
  output.audiences.some((a) => block.audiences.includes(a)) ? "carries"
  : output.audiences.some((a) => block.absentFrom.includes(a)) ? "absence"
  : "not-needed";
```

On the 126 cards it gives 102 that carry (the invariant lane is for every audience, so its nine all carry), 4 absence checks (step in the api, sdk, cli and mcp) and 20 not needed:
event, environment, store, mount and journey, each in the four caller outputs. Against the first list of 17, it moves
these:

| Card | Was | Now | Why |
|---|---|---|---|
| `journey.server` | proposed not needed | needed, ✓ | the server is the operator's, and so are journeys: `/_world/*` answers only where a lifetime is declared (`server.ts:148`, `:194`). The rule found a real card, already built |
| `device.mcp` | proposed not needed | needed, ✓ as an absence | the device block is the caller's; no device operation is a remote tool (`render/service.ts:19`) |
| `step.api` | ✓, "the endpoint carries the steps" | absence check, ~ | the endpoint names no step, but the API package every client imports exports `steps` (`api.ts:84`) |
| `step.sdk`, `step.cli`, `step.mcp` | ✗, proposed not needed | absence checks, ✓ | nothing a caller reads names a step; the absence is the green |
| `event.api`, `event.sdk` | ✓ and ✗ (M1.42) | not needed until M5.05 | Q3 |
| `environment.sdk`, `environment.cli` | Q4 | not needed unless Q4 is A | Q4's A widens environment to the caller |
| `mount.api`, `.sdk`, `.cli`, `.mcp` | ✓ ("looks native") | not needed | mounted operations are proved in the operation lane; the plugin's name is not the caller's |

**The blueprint narrows, never widens.** A declaration can take an audience away from itself, and already does in
three places: `via` takes an operation away from the agent (MCP) or other callers, a mount's `omit` takes a plugin's
operation away from everyone, and a field's visibility takes a value away from those who don't hold its role. No
declaration can give itself an audience its block doesn't have: there is no way to put a step in the SDK. Widening a
block is a framework change, recorded as a decision, like event's at M5.05.

**Where the table lives (decided here).** A new module in `orthograph`, `audiences`, beside `visibility`: the
`Audience` type, the block table and the output table, as data. `orthograph` is the only package the compiler, the
generators and the runtime all depend on (`packages/compiler/package.json`, `packages/generators/package.json`,
`packages/language-effect/package.json`), and it depends only on Effect, so the table can sit nowhere lower. The
compiler is its one reader: it writes each declaration's audiences into the model, after the blueprint's narrowing
(`via`, `omit`), so a generator asks the model, never the table, and narrowing is applied once. One generic check then
replaces every absence check written by hand: render every output, and fail if any names a declaration whose
audiences leave that output out. Owner: proposed for M1.42, beside the model work it already does; the conductor puts
it on the row.

**How it relates to field visibility (M1.35).** The same idea, one level up, and one vocabulary, but two functions.
M1.35's `Audience` (`principal` with roles, `agent`, `telemetry`, `public`, `owner`) decides at run time which values
of a field reach a viewer. The block audience decides at generation time which declarations reach an output at all.
Each of M1.35's audiences is one of the three kinds: `principal`, `agent` and `public` are callers; `telemetry` and
`owner` are the operator; the builder sees declarations, never values, so it has no M1.35 audience. One implementation
can't serve both: one runs over values on every call, the other over declarations once per generate, and putting the
block table in M1.35's runtime module would make the compiler depend on `language-effect`, which the package rules
forbid. What they share: the kind type, from `orthograph`'s `audiences`, and the rule that both fail closed. Proposed
for M1.35's row: each of its audiences names its kind, so `sees` can first ask whether the field's block reaches that
kind at all. Nothing in M1.35's check changes.

## How the columns relate

The nine columns are not nine independent results. They form three tiers, and a card's evidence follows the tier.

**The source tier: model.** Every other column is generated from the model, so the model card is the floor of its lane.
A building block missing from the model is missing everywhere, and no other card in the lane can be green before it.
The model column is the greenest: 12 of the audit's 13 lanes (Thing & fields is ~), and ~ in the invariant lane.

**The surfaces tier: api, server, sdk, cli, mcp.** The SDK, CLI and MCP are all generated from the one API declaration
(`packages/generators/src/modules/render/internal/sdk.ts`, `cli.ts` and `mcp.ts` each import the generated API), so a
fix in the API reaches all three, and a leak in the API reaches all three too (K12 section 1). The server runs what the
API declares. These cards are proved by calls: first by M1.41's loop, which calls every operation once through the
SDK and once through the CLI, then by journeys run through each client (M2.08: `--through sdk|cli|mcp`), which is
Aaron's "the CLI, the SDK, the MCP, those all have their own evidences through their journeys". Until M2.08, journeys
call the server over raw HTTP (`packages/prove/src/modules/journeys/internal/world.ts`, ledger `JOU-02`), so no journey
proves a client.

**The evidence tier: docs, portal, telemetry.** These three describe and show the app; the portal combines the other
two with the model and the logbook:

```text
portal card  =  model structure     (G: what exists, drawn from model.json: the tree, the lifecycle, the in-and-out band)
             +  docs content        (G: the description and reference shown as the page's prose, never copied)
             +  telemetry evidence  (L: calls, refusals, defects, p95, spans and step signals, lighting up the structure)
             +  logbook proof       (L: M1.04's verdicts, the journeys that cover it, what is unproven)
```

So a portal card is green only when, for that building block:

1. the **model** card is green (the portal draws nothing the model lacks);
2. the **portal's data file and wire** carry it (today the wire drops much of what the data file holds: visibility,
   event fields, error codes, `from`; `packages/portal/src/modules/wire/types.ts:12-17`, `:43-44`);
3. the **docs** card is green where the page shows prose for it (the portal links the docs content; it is the docs'
   content area, as Aaron asked, so the docs card's content is what the portal shows);
4. the **telemetry** card is green where the page shows live numbers or traces for it (the portal "can only light up
   what telemetry carries", K12 section 2), and a trace source reaches the portal: today the wire marks traces, journeys
   and evals "unavailable" (`packages/portal/src/modules/wire/service.ts:6-9`), so no portal card is ✓ anywhere;
5. and the portal view itself renders it, checked by M1.13's screenshot at a fixed `now`.

On the board, a portal card shows its dependencies: when it is red because telemetry is red, it says so and links to
the telemetry card, so the lane is climbed bottom-up (model, then the surfaces, then docs and telemetry, then the
portal) rather than by painting the portal first.

**The portal is the end state of every lane.** For each lane the record names the portal view that shows the whole
lane at once. When that view renders the block from the model, with its docs content and its live evidence, and the
surface cards are proved by journeys, the lane is done. The CLI, SDK and MCP are the exception Aaron named: their
proof is their journeys, not a portal view, though the portal shows those journeys' verdicts on the operation's proof
tab.

## The end-to-end story

The grid is proved cell by cell; the story proves it whole, the way a person meets Orthograph. It is one run, in a
fresh folder with nothing but Node and the published packages (Verdaccio locally, npm after M7.02):

| # | Step | What it proves | Lanes it lights | Already described by | Gap |
|---|---|---|---|---|---|
| 1 | `npm create orthograph plugged-in` in an empty folder | the front door works with no checkout of this repository | all, at the model | M2.09 (`ortho new` scaffolds Plugged In at stage 1, identical to `examples/plugged-in`) | none once M2.09 lands |
| 2 | `ortho generate`, then `ortho prove --env local` | every output is written and every journey passes on workerd | thing, operation, step, machine, event, error, roles, journey | M1.41 (the loop through the real `ortho` binary), M2.12 | M1.41 copies `examples/plugged-in` into the folder; the story starts from `ortho new` instead, so the two meet only at M2.09 |
| 3 | the server runs; every operation is called once through the SDK, the CLI and MCP; a refused claim prints `HN-001` and exits 3 | the surfaces tier, for every lane in stage 1 | the surfaces columns of every stage 1 lane | M1.41 (SDK and CLI), M2.08 (journeys `--through sdk|cli|mcp`) | M1.41 calls no MCP tool; M2.08 brings it |
| 4 | the portal opens on Plugged In's things; a claim lights `handle.claim` and its move, its event, its commit; the proof tab shows the journeys' verdicts | the evidence tier | docs, portal, telemetry of every stage 1 lane | M1.13 (the portal opens on Plugged In's things, a journey's run lights its operation and move) | the portal wire still says traces and journeys are "unavailable" (`packages/portal/src/modules/wire/service.ts:6-9`) |
| 5 | `ortho add feature @orthograph/handles`, then auth (ST1.03, ST1.07); the grid stays green | mounting keeps the promise: a mounted plugin's blocks reach every output with their `from` | mount | M1.10, ST1.03, ST1.07 | no check reads every output for a mounted block's `from` |
| 6 | stage 2: `ortho add feature @orthograph/wallets`; create a wallet on the device; be paid by handle on Anvil; a reorg corrects it | device operations, adapters, chain events, environments with a chain | device, mount (adapters), event (from the follower), environment | ST2.06 | the device lane's CLI, MCP and portal cards have no slice (see that lane) |
| 7 | stage 3: a Safe with the budgets plugin, hats, owners sign above a budget | stores on a chain, workflows, agents under their own hat | store, roles (hats), and the rows still to come | ST3.08 | workflows and agents are not rows yet |
| 8 | stage 4: the same on Aztec; the portal shows the footprint and never a member | visibility at its hardest | visibility | ST4.08 (`the portal shows nothing that names a member`, ST4.07) | none beyond the stage's own slices |

**What is missing to run it as one story.** Each stage gate proves its stage, but nothing yet runs the stages in one
folder from nothing, and nothing reads the grid at each step. Proposed, a new slice after Gate M2: **the story check**
(`e2e/story`), written by an author who is not the builder: steps 1 to 5 in a fresh folder through the real `ortho`
binary, and after each step it evaluates every card's evidence that applies and writes one verdict per card to the
logbook (kind `grid`, keyed by card id and revision), so the board's colours come from verdicts, never from a hand
edit. Steps 6 to 8 are appended as each stage gate lands. Until it exists, the board's colours are set from this record
and each card's evidence run by hand.

## Hill-climb order

No lane can be fully green before M1.13, because every lane's end state is a portal view and the portal column is ✗
or ~ in the thirteen lanes of the audit today (its wire drops most of the model, and no trace source reaches it:
`packages/portal/src/modules/wire/service.ts:6-9`). So the climb is: build the evidence path once on the lane that
needs least besides it, then let every lane after reuse it.

| Order | Lane | Why here | What turns it green |
|---|---|---|---|
| 1 | Operation & read | Seven of nine cards are ✓ already. Climbing it builds the whole evidence path (M1.41's loop through the real binary, M1.13's portal opening on Plugged In, journeys' verdicts on the proof tab) with almost no new model work, so it is the first fully green lane and the template for the rest | M1.42 (the CLI's `--help`), M1.13 (the operation page, the matrix) |
| 2 | Error & refusal code | Six ✓; refusals are what a person meets first when something goes wrong, and `HN-001` is in M1.41's done-when | M1.42 (codes in the wire, a code for `InvalidPayload`), M1.36 (`refusal.code`), M1.13 |
| 3 | Thing & fields | The model card is ~ because no field can be described; that is a blueprint change, small but upstream of every other output's help and schema text, so it lands early | M1.42 (a field description in the blueprint and model, thing types in the SDK, typed and described flags, the wire), M1.13 |
| 4 | Step | Only docs, the portal and one absence are left: the API package's `steps` export moves to the server (Q1) | M1.42 (step details in the docs and the wire), M1.13 (the spine) |
| 5 | Machine, states, move | Needs the state union in the API, which the SDK, CLI and MCP then carry | M1.42 (the union), M1.36 (`move.from`), M1.13 (the lifecycle strip), M1.37 for MCP (M3) |
| 6 | Event | Q3 decides its four caller cards; the rest is M1.42 and M1.36 | M1.42, M1.36, M1.13 |
| 7 | Field visibility | The safety lane: Gate M1 item 8. Check 16 is already written and red, so it climbs by itself beside 1 to 6 | M1.35, then M1.42 and M1.13 for the portal |
| 8 | Journey & starting world | The carrier of the SDK, CLI and MCP columns' proof; its own cards are docs, portal and telemetry | M1.13 (proof tab, journey names on spans), M2.08 (through each client) |
| 9 | Roles | M2's principals change what roles mean, so climbing it before M2.01 would be done twice | M2.01 to M2.07, M3.22 for MCP's exposure |
| 10 | Environment | Waits on Q4; staging makes it real (M7.01) | M1.36, M1.13, Q4's slice, M7.03 |
| 11 | Store | Mostly ✓ or not needed; the data page is M5.06 | M1.36, M1.13, M5.06 |
| 12 | Mount, adapter, plugin origin | `from` reaches the docs, portal and spans; real once stage 1 mounts handles and auth | M1.42 (`from` in the wire), M1.13, M1.36 (proposed) |
| 13 | Runs on the device | Stage 2's wallet is its first real use | M1.13 (`runs`), the proposed ST2.07 (device spans to the sink) |

Lanes 1 to 8 are Gate M1's band, 9 and 10 Gate M2's, 11 to 13 finish with stage 2. Lane 7 runs beside the others from
the start because its check is already written.

**Proposed additions to existing slices**, each named on its card above and collected here so the conductor can put
them on the rows in one change (this record does not edit `milestones.md`):

| Slice | Proposed addition | Lane |
|---|---|---|
| M1.41 | read roles in the SDK's doc comments and the CLI's help; read journeys in the portal's data file; call each operation once through MCP; `/_world/*` answers 404 where no lifetime is declared; the MCP names no client operation | roles, journey, operation, device |
| M1.42 | a field description in the blueprint (`Blueprint.thing` fields, values) and the model; a code for `InvalidPayload`; each thing's `state` as a literal union; step details and event fields in the docs, not only the portal; `orthograph`'s `audiences` module, each declaration's audiences in the model, and one generic absence check; `steps` moved out of `generated/api` | thing, error, machine, step, event, and every lane's absence checks |
| M1.36 | `from.mount` on the operation's span, `call.mount` and `call.name` on a call step's span | mount |
| M1.13 | `journey` and `journey.step` on prove's spans; an environments page and `from`, `runs` and each operation's covering journeys in the docs | journey, environment, mount, device |
| M2.03 | who may call, in the SDK's doc comment and the CLI's help; `principal.role` on the span | roles |

**New slices proposed:** the story check (`e2e/story`, after Gate M2, see "The end-to-end story") and ST2.07 (a
device operation's spans reach the environment's sink, ledger `LAH-02`, before ST2.03).

### 14. invariant

**Waiting for the grid to learn `invariant`, then for ST1.19.** No journey touches an invariant card yet, and the grid cannot see one even when it does: `e2e/grid/src/modules/touches/service.ts` emits no `invariant` row and no evals exist for the block, so ST1.19's rules alone switch nothing on. The checks author adds both, beside ST1.19's checks (a line in the ST1.19 row's needs in `design/milestones.md`); the cards are then switched on by Plugged In's claim journey and their pairs go on `e2e/grid/expected-red.json`. Superseded by `ST1-19-checks.md`, 21 November 2026: the grid has learned `invariant` (the touches row, eight evals, `invariant.cli` held off), and the claim journey's switched-on cells and their 24 red pairs are on the lists.

**Invariants (unique rules, G5).** A thing's rule that stays true among many records of it, declared once in `things/<thing>/invariants.ts` with `Blueprint.invariant.unique(field or tuple, { while, refuse, description })`. The runtime refuses for the handler; every output says the rule. Joined the grid on 20 November 2026 (ST1.10), graded from `goal/stage-1`.

**How it is proved.** Check 25 and its package halves (the model, the compiler's refusals, a real world, the outputs); check 31 (S-19); `ortho prove` on Plugged In's claim journey; ST1.22's Chromium check on the portal's Rules section. Cards and their greens are in `design/grid/grid.json`; the owners are the slices ST1.12 to ST1.18 and ST1.22.

| Output | Today |
|---|---|
| model | ~ G4's per-field `unique` is in the model; no named rule, no `refuse`, no operation map |
| api | ✗ a rule's refusal is in no operation's errors |
| server | ~ the store's index and conflict retry; the handler still refuses by hand |
| sdk | ~ reads an operation's refusals, so it would carry a rule's once the model lists it |
| cli | ~ the same |
| mcp | ✗ the tool says nothing of a rule |
| docs | ~ `## Unique` with its scope; no `## Invariants` or reasons |
| portal | ✗ no Rules section |
| telemetry | ✗ no `refusal.invariant`, no runtime deciding log |

## Rows still to come

The audit's thirteen rows are the blocks that existed then; invariants (G5) is the fourteenth and is already a row. These join the grid as rows when their decision slice names
their outputs, each with nine cards like the rest: **workflows** (M3.01; stage 3's owner signatures), **views**
(M5.01, M5.05), **agents and runs** (M4.01, M4.10), **chains as stores and chain events** (M6.01, M6.09), and
**secrets by declaration** (M2.04; today a field's visibility covers secret fields, not the environment's secrets).
None of them changes a card above.

## Decided here

1. The grid is the goal: 13 lanes (the building blocks) by 9 cards (the outputs), each card an eval with its green,
   its evidence, its grade today with `path:line`, and its owner. `design/grid/grid.json` is the same content as data,
   typed by `design/grid/types.ts`, and the board reads it; card ids (`<block>.<output>`) are stable.
2. A card is green only when its evidence runs in CI and passes; built but unproved is amber, never green.
3. A card agreed not needed stays on the board, greyed, with its reason; one that guards a safety property (no secret
   leaves, no step leaks) stays live as an absence check.
4. Every lane's end state is a portal view, except the clients' columns, which are proved by journeys run through
   them (M2.08). A portal card depends on the model, docs and telemetry cards of its lane.
5. The hill-climb order above, operation first.
6. The proposed slice additions and the two new slices above are proposals for the conductor to put on
   `milestones.md`; this record edits no row.
7. Each output has its audiences and each block its audiences, in the two tables under "Who each block is for"; a
   card's role (carries, absence check, not needed) is derived from them, never stored. Whether the rule holds is Q2.
8. The tables live in a new `audiences` module in `orthograph`, read by the compiler once, which writes each
   declaration's audiences into the model after the blueprint's narrowing; a blueprint narrows, never widens. Block
   audiences and M1.35's field audiences share one kind type and fail closed, but stay two functions.

## What this changes elsewhere

| Was | Now | Why |
|---|---|---|
| K12's grid and K13's 5 by 5 as the measure | this grid, 13 by 9, graded per card against its own green | Aaron, 19 November: the grid is the goal |
| K12, "What the grid leaves alone on purpose": a paragraph | the audiences rule, one reason per block, for Aaron (Q2) | Aaron, 19 November: the hand list hid a missing abstraction |
| M1.42 "the SDK exports … the events" | moves to M5.05, if Q3 is A | no caller can receive an event before views |
| M1.35's `Audience` | each audience names its kind (caller or operator), from `orthograph`'s `audiences` | one vocabulary for field and block audiences |
| M1.41 "fails only where K13's grid says ✗ or ~" | unchanged; this grid is wider, and M1.41 checks its stage 1 basics | M1.41's scope stays the basics; the story check (proposed) covers the rest |
| The portal's gaps table (`portal.md`, "Gaps") | unchanged; gap 4 gets an owner proposed here (ST2.07) | it had none |

## Open risks

- **Field descriptions are a blueprint change.** M1.41 already asks for them; until M1.42 adds a place to write them,
  the thing lane's model card and everything downstream of it stays ~.
- **The portal column carries the whole grid's last mile.** Every lane waits on M1.13, the largest slice in M1. If it
  slips, no lane is fully green before Gate M1.
- **A step or error added after the scaffold is yours writes nothing into your handler.** Confirmed: `ortho generate`
  skips a scaffold that exists (`packages/generators/src/modules/sync/service.ts:23`). Corrected: something does warn,
  for a required step. `ortho check` runs `ortho/required-step-used` as a warning, "required step steps.load is never
  called" (`packages/lint/src/modules/rules/internal/steps.ts:13,35`, wired at
  `packages/cli/src/modules/check/internal/tools.ts:49`), and prove's eval 6 fails a call whose required step ran no
  span (`packages/prove/src/modules/evals/internal/calls.ts:130-143`). What stays open: an optional step added later
  gets no warning from `check`, only prove's note that it was never exercised both ways
  (`packages/prove/src/modules/prove/internal/report.ts:131`), and an error added later is flagged by nothing, though
  the scaffold would have written a `refuse X when?` blank for it (`packages/projections/src/modules/handlers/internal/scaffold.ts:59-94`).
  Proposed for M2.15, which already teaches `ortho add` to edit in place: `ortho add step` and `ortho add error` also
  name the handler to change, and `check` gains `ortho/declared-error-raised`, a warning like the step rule.
- **Grades drift.** They are read from `6419d4b7`. Until the story check writes verdicts per card, the board's colours
  are this record's and go stale as `m1` moves; the conductor regrades a lane when a slice that owns one of its cards
  merges.

## Questions for Aaron

Four calls are his: they decide what a person using a generated app experiences, not how Orthograph is built. Every
other call in this record is the building agent's, under "Who decides".

**Terms for this round.** A *card* is one cell of the grid: one building block in one output. *Green* means the
card's evidence runs in CI and passes. An *audience* is who an output is written for: the *caller* (API, SDK, CLI,
MCP), the *builder* (model, docs, the scaffold) or the *operator* (server, telemetry); the portal serves the builder and
the operator. A block's audiences decide its cards ("Who each block is for"): a card is *not needed* when its output's
audience isn't among its block's, and is then shown greyed with that reason. An *absence check* is a card that stays
live to prove a block never reaches an audience. The *scaffold* is the handler file `ortho generate` writes once, after
which it is yours. The snippets for Plugged In are from Codex's draft on `links/stage-1` (#56), under
`examples/links/`, which M1.40 writes as `examples/plugged-in`; the rest is `origin/m1` at `6419d4b7`.

### Q1 — Does a step's audience include the caller?

**The problem, in code.** You declare a step in the blueprint, the scaffold hands it to your handler, and the
generated API, which every client imports, also exports it:

```ts
// examples/links/blueprint/things/handle/verbs/claim.ts:13 — the blueprint
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
```
```ts
// examples/links/generated/api/src/handle/claim.ts:12 — generated, imported by the SDK, the CLI and MCP
export const steps = ["handle.claim.load", "handle.claim.record"] as const;
```
```ts
// examples/links/src/handle/claim.ts:16,26 — the scaffold, now yours
    const [named, page] = yield* steps.load(Effect.all([PageRecords.find(Handle, handle), PageRecords.find(Profile, profile)]));
    yield* steps.record(Effect.gen(function* () {
```

Nothing a caller reads names a step today, but nothing stops one, and the API package already carries the list. If
nobody decides, someone puts step help into the CLI, and from then on splitting `load` into two is a change every
caller of Plugged In sees.

**What it touches**

| Dependent | Why it cares |
|---|---|
| The step lane's api, sdk, cli and mcp cards | absence checks, or cards to build |
| Versions from the model diff (`packages/prove/src/modules/releases`) | whatever a caller reads bumps its version when it changes |
| `generated/api/src/<thing>/<op>.ts` (`api.ts:84`) | under A, `steps` moves to the server's side |
| The portal's spine (M1.13) | shows steps to the builder and the operator under every option |

**The options**

**Today** — a caller of Plugged In sees the answer or a refusal, no step (`examples/links/generated/cli/src/output.ts`:
a one-field answer prints its value; a refusal prints `[code] Name` to stderr and exits with its exit):
```bash
plugged-in handle claim --name aaron
# <the new handle's id>
plugged-in handle claim --name aaron
# [HN-001] HandleTaken            (exit 3, from errors.ts:3)
```

**A · No: builder and operator only; the four caller cards are absence checks** (recommended)
```ts
// generated/api/src/handle/claim.ts — `steps` moves out, to the server's wiring
export const endpoint = HttpApiEndpoint.post("claim", "/handle/claim", { /* … */ });
// e2e check (generic, from the audiences table): no caller output names handle.claim.load or handle.claim.record
```
```bash
plugged-in handle claim --help
# Claim a free name and make it the address of your public profile.
#   --name <text>
```

**B · Yes, described: steps in the CLI's help and the tool's description**
```bash
plugged-in handle claim --help
# Claim a free name and make it the address of your public profile.
# Steps: load (database), record (database)
#   --name <text>
```

**C · Yes, streamed: the caller watches each step run**
```ts
yield* PluggedIn.handle.claim({ name: "aaron" }, { onStep: (s) => Console.log(`${s.name} ${s.state}`) });
// load started … load done … record started … record done
```

**You do X → what happens**

| Scenario | A · No | B · Described | C · Streamed |
|---|---|---|---|
| You split `load` into `load-handle` and `load-profile` in the blueprint | your handler changes; callers see nothing | the CLI's help and MCP's descriptions change, and the client's version bumps | every caller's progress handler meets new names |
| An agent picks a tool | it reads the operation's description | it also reads the steps | it can show progress |
| A slow claim in the terminal | the person waits for the answer | the same | the person sees which step is slow |
| What you build | one generic check, and `steps` moved out of the API | help text and a version rule | a streaming channel through HTTP, the SDK, the CLI and MCP |

**Rubric**

| Axis | A · No | B · Described | C · Streamed |
|---|---|---|---|
| Floor-first | ✅ three cards already pass; one move for the fourth | ⚠️ small, in three outputs | ❌ new transport |
| Reversibility | ✅ adding the caller later is additive | ⚠️ taking it away breaks help readers | ❌ breaks callers |
| Blast radius | ✅ the API package only | ⚠️ every client's version moves on refactors | ❌ HTTP, SDK, CLI, MCP |
| Correctness | ✅ the handler's inside stays inside | ⚠️ internals as contract | ⚠️ internals as live contract |
| Fit | ✅ K13; the portal shows steps to the builder already | ⚠️ | ❌ step signals are telemetry (M1.21), not a client channel |

**Recommendation: A.** A step is how your handler works, not what the caller asked for; the builder sees it on the
portal's spine and the operator on its span. One honest finding comes with it: the SDK keeps steps out of its types,
but the CLI and MCP import the whole declaration as a value (`cli/src/handle/claim.ts:4`, `mcp/src/index.ts`), so the
step declarations, and the blueprint file itself, ship inside a published CLI. Nobody sees them; M7.06's publishing
should still strip them.

### Q2 — Is a card not needed exactly when its output's audience isn't among its block's audiences?

**The problem, in code.** The first draft of this record proposed 17 cards as not needed, one by one, by hand. Your
answer was that a missing abstraction was behind the list. The rule replaces the list with two tables and one line
("Who each block is for"), and it finds what the list missed. A journey shows how. From the blueprint:

```ts
// examples/links/blueprint/starting-worlds/claimed-aaron.ts:5-7 — the blueprint (a journey author's file)
export default Blueprint.startingWorld("claimed-aaron", {
  cast: { aaron: Blueprint.signedIn },
  makes: (s) => [s.aaron.run(claim, { name: "aaron" }, { request: "first-claim" })],
```
```ts
// examples/links/blueprint/environments/test.ts:5 — only this environment declares a lifetime
  lifetime: "2 hours", // created and destroyed as one unit, with an owner and an expiry
```
```ts
// packages/projections/src/modules/server/internal/server.ts:148 — the generated server
const WORLD_ENVIRONMENTS: ReadonlyArray<string> = ${JSON.stringify(/* environments with a lifetime */)};
```

No scaffold: a journey is never yours to fill. The hand list greyed `journey.server`. The rule says the server is the
operator's and so are journeys, so the card is needed, and its green, `/_world/*` answering only in `test`, is already
built. If nobody decides, every new block gets a hand list again, and the next one is wrong the same way.

**What it touches**

| Dependent | Why it cares |
|---|---|
| The board | derives grey, live and absence from `cellRole`; nothing is stored per card |
| `design/grid/types.ts` | `audiences` on blocks and outputs, `absentFrom` on blocks; `notNeededProposal` is gone |
| The rows still to come (workflows, views, agents, chains) | each declares its audiences once and gets its nine cards for free |
| `orthograph`'s proposed `audiences` module, the compiler, a generic absence check | the same table, read by the code (proposed for M1.42) |
| M1.35 | its audiences each name their kind; nothing else changes |

**The options**

**Today** — 17 cards proposed by hand, each with its own sentence (the first draft of this record).

**A · Yes: the rule, with the tables as written** (recommended)
```ts
// design/grid/types.ts
cellRole(blocks.journey, outputs.server) // "carries"   → journey.server is needed, and ✓
cellRole(blocks.store, outputs.sdk)      // "not-needed" → greyed: "a store renamed never changes a caller's contract"
cellRole(blocks.step, outputs.cli)       // "absence"    → live: no command names a step
```

**B · Yes to the rule, but some cards are set by hand**
```jsonc
// grid.json: an override wins over the rule
{ "mount.sdk": { "override": "carries", "because": "callers should see which plugin an operation came from" } }
```

**C · No: keep a hand list**
```jsonc
{ "notNeededProposal": ["step.sdk", "step.cli", "step.mcp", "journey.server", "store.api", "…"] }
```

**Where the rule gives an answer that may look wrong.** Each is a consequence, not an exception:

| Card | The rule says | Why it may look wrong | Settled by |
|---|---|---|---|
| `event.api`, `event.sdk` | not needed | the API exports events today, and M1.42 plans event types in the SDK | Q3 |
| `environment.sdk`, `environment.cli` | not needed | the CLI already keeps one session per `--env` | Q4: A widens environment to the caller |
| `mount.api`, `.sdk`, `.cli`, `.mcp` | not needed, though ✓ today | mounted operations do reach callers | they do, through the operation lane, as the app's own; only the plugin's name is held back |
| `journey.server` | needed, ✓ | it was greyed | the world gate is the operator's, and real |
| `device.mcp` | needed, ✓ as an absence | it was greyed | a remote tool can't run device code; at stage 2, a local MCP on the device could change its green, not its audience |

**You do X → what happens**

| Scenario | A · The rule | B · Rule with overrides | C · A hand list |
|---|---|---|---|
| Workflows join the grid (M3.01) | declare their audiences once; nine cards fall out | the same, plus overrides argued card by card | nine sentences, by hand |
| Someone asks why `store.sdk` is grey | the block's reason, on the card | the same, unless overridden | whatever sentence was written |
| A builder tries to put a step in the SDK | the generic check fails: the step block isn't the caller's | an override could allow it | nothing stops it |
| You disagree with one card | change the block's audiences, a decision | add an override | edit the list |

**Rubric**

| Axis | A · The rule | B · Overrides | C · Hand list |
|---|---|---|---|
| Floor-first | ✅ the tables are written; the board derives today | ⚠️ the rule plus a second mechanism | ⚠️ works now, wrong later |
| Reversibility | ✅ one block's audiences change, its cards follow | ✅ | ✅ |
| Blast radius | ✅ the board and `types.ts`; code only when M1.42 takes the module | ⚠️ every override is a place the rule doesn't hold | ✅ none |
| Correctness | ✅ found `journey.server`; one reason per block | ⚠️ overrides are where the leaks hide | ❌ missed `journey.server` |
| Fit | ✅ the same idea as field visibility, one level up | ⚠️ | ❌ the missing abstraction stays missing |

**Recommendation: A.** The rule is the abstraction you said was missing; it found a real card the list got wrong, and
a disagreement becomes a change to one block's audiences, not a patch on one card.

### Q3 — Does an event's audience include the caller?

**The problem, in code.** You declare an event and which move emits it; the runtime commits it with the move; your
handler never names it:

```ts
// examples/links/blueprint/things/handle/events.ts:4 and machine.ts:8 — the blueprint
export const HandleClaimed = Blueprint.event({ handle: Handle.fields.id, name: Handle.fields.name });
    claim: { from: [], to: "claimed", emits: HandleClaimed },
```
```ts
// examples/links/generated/api/src/index.ts:35 — generated: the API exports it, for the server's journal
export * as Events from "./events.ts";
// examples/links/generated/sdk/src/index.ts:1-13 — the SDK exports the client, Errors and one namespace per thing; no Events
```
```ts
// examples/links/src/handle/claim.ts:33 — the scaffold, now yours: the move, not the event
    yield* move();
```

M1.42 plans event types in the SDK, but no client can get an event: nothing serves the journal, and following events
is M5's (M5.03 to M5.05). If nobody decides, M1.42 ships types a caller of Plugged In can name and never receive.

**What it touches**

| Dependent | Why it cares |
|---|---|
| The event lane's api, sdk, cli and mcp cards | not needed now, or built now |
| M1.42 ("the SDK exports … the events") | A moves that item to M5.05 |
| M5.05 (views, reads generated in the SDK, CLI and MCP) | where a caller reading events naturally lands |
| M1.35 | any journal read is a new audience to cut private fields for |

**The options**

**Today** — a caller learns a claim happened from the answer, and later by reading:
```bash
plugged-in handle claim --name aaron
# <the new handle's id>
plugged-in handle resolve --name aaron
# <the same id>                   (the name is claimed; no event is shown anywhere)
```

**A · No, until views (M5.05)** (recommended)
```ts
// generated/sdk/src/index.ts — unchanged; M1.42's "the SDK exports the events" moves to M5.05
export { PluggedIn, layer } from "./client.ts";
export { Errors } from "../../api/src/index.ts";
```

**B · Yes, as types only (M1.42 as written)**
```ts
import { Events } from "@plugged-in/sdk";
type Claimed = typeof Events.HandleClaimed.Type; // nameable, but no call returns one
```

**C · Yes, followable now**
```bash
plugged-in events follow --event HandleClaimed
# 12:04:31 HandleClaimed { handle: <id>, name: aaron }
```

**You do X → what happens**

| Scenario | A · No, until views | B · Types only | C · Followable now |
|---|---|---|---|
| You add a field to `HandleClaimed` | callers see nothing change | the SDK's version bumps for a type nobody receives | every follower's decoder changes |
| An agent wants to know what just happened | it reads the handle | the same: the type gives it nothing to read | it is told as it happens |
| You mark an event field private | it never leaves | the type still names it | it must be cut for each follower (M1.35) |
| What you build | nothing in M1 | the export M1.42 planned | a journal endpoint, delivery, a CLI command, an MCP resource: M5 pulled into M1 |

**Rubric**

| Axis | A · No, until views | B · Types only | C · Followable now |
|---|---|---|---|
| Floor-first | ✅ nothing to build | ⚠️ ships a promise of the real thing | ❌ pulls M5 forward |
| Reversibility | ✅ widening at M5.05 is additive | ⚠️ removing the types breaks importers | ❌ |
| Blast radius | ✅ M1.42's row loses one item | ⚠️ the SDK's version moves with every event | ❌ runtime, API, clients |
| Correctness | ✅ a caller reads state, which the app answers for | ⚠️ a type with no value behind it | ⚠️ delivery guarantees |
| Fit | ✅ views are the reads over events (M5.05) | ⚠️ | ❌ |

**Recommendation: A.** Events are the runtime's record, for the builder and the operator; a caller reads state.
Widening event to the caller is one decision at M5.05, where it comes with something to read.

### Q4 — Should the generated CLI and SDK know the environments by name?

**The problem, in code.** The model knows each environment's domains, but the CLI talks to one URL from a variable,
and `--env` is a free label for where a session is kept:

```ts
// examples/acme/blueprint/environments/staging.ts:7-10
deploy: {
  server: Deploy.worker({ domain: "api.staging.acme.dev" }),
```
```ts
// examples/acme/generated/cli/src/main.ts:41
Effect.provide(Sdk.layer(process.env["ACME_URL"] ?? "http://127.0.0.1:8787", process.env["ACME_TOKEN"])),
```

If nobody decides, `acme session sign-in --env staging` keeps a session called "staging" while talking to whatever
`ACME_URL` says, which can be production.

**What it touches**

| Dependent | Why it cares |
|---|---|
| The environment lane's sdk and cli cards | what green means |
| `cli-session.ts:41` and `sdk.ts:98` | the two generated places that pick a URL |
| M7.06 (real releases: npm, Homebrew) | a published CLI would carry the domains |
| M2.06 (the device flow, sign-in per environment) | the session is kept per environment |

**The options**

**Today**
```bash
ACME_URL=https://api.staging.acme.dev acme session sign-in --env staging
acme allowance spend --amount 5      # goes to ACME_URL, whatever --env said
```

**A · Named environments from the model** (recommended)
```bash
acme --env staging allowance spend --amount 5   # https://api.staging.acme.dev, from the model
acme --env prod allowance spend                 # refused: no environment "prod" (local, staging, production)
```
```ts
Sdk.layer.env("staging", token)   // the domain from the model; Sdk.layer(baseUrl) stays for anything else
```

**B · URLs only, `--env` stays a session label** (today, written down)
```bash
ACME_URL=https://api.staging.acme.dev acme allowance spend --amount 5
```

**C · A published CLI defaults to production**
```bash
acme allowance spend --amount 5   # production unless --env says otherwise
```

**You do X → what happens**

| Scenario | A · Named | B · URLs only | C · Production default |
|---|---|---|---|
| You try a call on staging | `--env staging` | set a variable | `--env staging` |
| A typo in the environment | refused, with the list | silently the wrong server | refused |
| A new environment is declared | its name works after `ortho generate` | set its URL by hand | the same as A |
| A published CLI | carries the public domains of the declared environments | carries nothing | carries them, and a forgotten flag hits production |

**Rubric**

| Axis | A · Named | B · URLs only | C · Production default |
|---|---|---|---|
| Floor-first | ✅ small: two generated files | ✅ nothing | ✅ small |
| Reversibility | ✅ `ACME_URL` still wins when set | ✅ | ⚠️ users rely on the default |
| Blast radius | ✅ CLI and SDK only | ✅ | ⚠️ every careless call |
| Correctness | ✅ the session and the URL agree | ❌ they can disagree | ⚠️ the risky default |
| Fit | ✅ "falls out of the blueprint" | ⚠️ hand-configured | ⚠️ |

**Recommendation: A**, with `local` as the default and `ACME_URL` still overriding. Under the audiences rule, A
means environment's audiences include the caller, for the environments' names and public domains only, and its four
caller cards become needed: the API's description lists each environment's domain as a server, the SDK and CLI take
`--env`, and the MCP server is pointed at one by name.

### At a glance

| # | Joint | Recommendation |
|---|---|---|
| Q1 | Does a step's audience include the caller? | A · no; its four caller cards are absence checks |
| Q2 | Not needed exactly when the output's audience isn't the block's? | A · yes, with the tables as written |
| Q3 | Does an event's audience include the caller? | A · not until views (M5.05); M1.42's SDK event types move there |
| Q4 | Environments in the CLI and SDK | A · by name from the model, `local` by default |

**Answer key.** Reply with one letter per question, for example "1A 2A 3A 4A". "Agreed to all" means every
recommendation. Anything else, say which and why, and the card's owner and the board change with it.
