# adapter

`Adapter.generate({ name, spec })` makes an adapter plugin from a service's own published description (OpenAPI 3.x or
Swagger 2.0, already parsed): a list of files, pure. `ortho new adapter` (in `packages/cli`) reads the document and
writes them.

A call is named from its `operationId`, split at `/` and `.` into groups, each piece camel-cased at `-` and `_`
(`issues/create-comment` is `calls.issues.createComment`, `chat_postMessage` is `calls.chatPostMessage`). An event is a
webhook's `x-github.subcategory`, camel-cased; its payload is any one of the actions the description lists for it.

What it writes, each generated file opening `// Generated from <title> <version>. Do not edit.` (no path and no time, so the
same document as JSON or YAML, from any path, is the same bytes):

| File | |
|---|---|
| `src/index.ts` | the descriptor: `Blueprint.adapter({ calls, events })`, every call a `Blueprint.call()` in its group |
| `src/client.ts` | `client({ baseUrl, token? })`, whose calls are promises of the answer's JSON |
| `src/spec/{operations,components,events}.ts` | the description's data: each call's request and success schema, the schemas they refer to, the events' payloads |
| `src/runtime/*.ts` | `internal/runtime/`, copied in: the JSON schema judge and the client, so a plugin imports only `orthograph` and `effect` |
| `package.json`, `blueprint/README.md`, `src/written.ts` | scaffolds, yours from the first run: what the description doesn't say (events it has no schema for, the stand-in) |

The judge (`internal/runtime/json-schema.ts`) reads types, enums, required parts, items, `allOf` / `oneOf` / `anyOf`, string
patterns, formats and lengths, and number bounds; it never changes the value, so a decoded event is the JSON that came in.

Not done here: the declared errors per response (a failure is a tagged value, `ApiFailure` with its status or Slack's
`code`), and types of payloads from the schemas (events decode to `unknown`). Test: `adapter.test.ts`; the whole check is
`e2e/superagent/`.
