# GOAL17-adapters-from-spec: what slice 4 built, and the seams it changed

Decided 23 November 2026 by the building agent (🔨 builder of Goal 17, slice 4), on `goal-17/s4-adapters-from-spec-build`. It
builds M5.07 (`ortho new adapter --from-openapi`) on the integration branch, as K39 allows, to the contract in
`e2e/superagent/README.md`. Slice 3's checks are its done-when.

## What was built

| Where | What |
|---|---|
| `packages/generators/src/modules/adapter/` | `Adapter.generate`: a parsed OpenAPI 3.x or Swagger 2.0 description in, the plugin's files out (pure). Its `internal/runtime/` is copied into each plugin: the JSON schema judge and the client |
| `packages/cli/src/modules/new/` | `ortho new adapter <name> --from-openapi <file or URL>`: reads JSON or YAML, refuses before writing, writes `plugins/<name>/` |
| `packages/orthograph` (plugins) | nested call groups, `events` of `{ kind: "event", schema }`, `Blueprint.incoming(schema)`, `p.events` in a mount |
| `packages/compiler` (mounts) | `include` takes events; dotted call names; `mounts.<name>.events`; a missing event is refused naming the mount's file |
| `examples/superagent/plugins/{github,slack,posthog}` | generated from the committed fixtures, with their stand-ins and Slack's events by hand |

## Calls the builder made (the contract left them open)

1. **A plugin carries its runtime.** The client and the judge are copied into each plugin under the Generated line, so a plugin
   imports only `orthograph` and `effect` and resolves from any project. The cost is one copy per plugin; a later
   `@orthograph/openapi` package could replace it without changing a plugin's exports.
2. **Data is JSON in a `.ts` file** (`JSON.parse("...")`), so a plugin of 2,802 calls loads and type-checks quickly. The
   descriptor and the client are plain code.
3. **`src/written.ts` is the one hand-written seam** of a generated plugin: the events its description lacks and its stand-in.
   The generated descriptor spreads it in, so regenerating never loses it and the held plugins' generated files stay the
   generator's output byte for byte. `package.json` and `blueprint/README.md` are scaffolds, written once.
4. **An event's schema is the judge over the spec's payloads, not a `Schema.Struct`**: a struct decode drops what the schema
   doesn't name, and the contract says nothing documented is dropped. `Schema.Unknown` with one filter decodes to the value itself.
5. **Errors.** A failure is a tagged value (`ApiFailure` with `status`, or Slack's `code`; `InputRefused`, `AnswerRefused`,
   `Unreachable`). Declared error classes per response are not generated yet: `Blueprint.call()` is given none. (_Superseded by G16-adapter-mounts, 25 November 2026: every generated call declares its adapter's four errors._)
6. **The judge honours `pattern`, `format`, lengths and bounds** (the lead's note of 23 November, and the checks' oracle now does). One
   spec contradiction is tolerated: GitHub's label says `type: [null]` beside an `allOf` of a user.

## Framework changes on this branch (Goal 11's and the CLI owner's seams)

- `Adapter` has a third type parameter, its events, and `AdapterSpec.events` is typed (was `Record<string, unknown>`).
- `AdapterSpec.calls` is a `CallTree`: calls or groups of them. `Mounts.fold` names a call by its dotted path.
- `ViewOf<Adapter>` gains `events`; `include` takes calls and events (it took `unknown` before in practice).
- `MountModel.events`, and the problem `includes the event X, which <pkg> doesn't have (its events: ...)`.
- A new `Blueprint.incoming(schema)` makes an event of an adapter; it is not `Blueprint.event`, which takes fields.
- `pnpm-workspace.yaml` lists `examples/superagent/plugins/*`.

## Supersedes

- `design/decisions/GOAL17-source-from.md`: "Goal 11's (M5.03) typed event; today an adapter's `events` are `unknown`" → "adapter events are typed (`AdapterEvent`) and built by `Blueprint.incoming(schema)`; Goal 11's `Blueprint.on` reads them"
- `design/decisions/GOAL17-source-from.md`: "`Blueprint.event(…, { id, actor })`" → "`Blueprint.incoming(schema)`, which slice 11 widens with `{ id, actor }`"
- `design/decisions/GOAL17-source-from.md`: "Goal 11's `Blueprint.event` has `id`" → "`Blueprint.incoming` has `id`"
- `design/goals/17-superagent.md`: "Slice 3's checks are being written. Slice 4 starts when they land." → "Slice 4 is built on `goal-17/s4-adapters-from-spec-build`."

## Not done

- Declared error classes per response; types of event payloads from the schemas (they decode to `unknown`).
- The door's signature check, `catchUp` and `lend` (slices 10 and 11).
- The generator carries its runtime as text (`internal/runtime-sources.ts`, written by `packages/generators/scripts/embed-runtime.ts`, kept in sync by a test), so a built package needs no source folder.
- Swagger's and OpenAPI's non-JSON request bodies: a body is sent as JSON. Array and object query values are stringified (`String(value)`), not encoded by the spec's `style` and `explode`.
- Events are generated GitHub-shaped only: from a webhook's `x-github.subcategory`. A description that lists webhooks another way gets no events from the generator; they are written by hand in `src/written.ts`.
- A path parameter and a body field of one name (GitHub's `actions/update-org-variable` has `name` in both, PostHog's `update` has `id`) can't be one flat input: the generator keeps both, so the whole spec still generates, and the client refuses that call before sending, naming the field, rather than merging them; a `token` in the query or body is the client's bearer and never a field, but a `token` in the path is a field.
