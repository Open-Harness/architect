# adapter

`Adapter.generate({ name, spec })` makes an adapter plugin from a service's own published description (OpenAPI 3.x or
Swagger 2.0, already parsed): a list of files, pure. `ortho new adapter` (in `packages/cli`) reads the document and
writes them.

A call is named from its `operationId`, split at `/` and `.` into groups, each piece camel-cased at `-` and `_`
(`issues/create-comment` is `calls.issues.createComment`, `chat_postMessage` is `calls.chatPostMessage`). A call with no
`operationId` is named from its path's fixed parts, camel-cased the same way, then its method's word: on a collection (the
path ends in a fixed part) get, post, put, patch, delete are `list`, `create`, `update`, `update`, `delete`; on an item (it
ends in a `{parameter}`) `get`, `create`, `update`, `update`, `delete` (`GET /widgets/{id}/spare_parts` is
`calls.widgets.spareParts.list`). Two operations that come to one name are refused, naming it. An event is a webhook's
`x-github.subcategory`, camel-cased; its payload is any one of the actions the description lists for it.

What the client sends, per call:

- **The token** goes where the call's security (its own, else the document's) says: in the header an `apiKey` scheme
  `in: header` names (OpenAPI's `securitySchemes`, Swagger's `securityDefinitions`), nowhere for `security: []`, and as
  `Authorization: Bearer` for any other scheme or none. A parameter named `token` outside the path is the credential,
  never a field (Slack declares it as a header), and so is a header parameter named where the credential goes
  (`Authorization`, or the apiKey's own header). Of a requirement naming several schemes, the first decides.
- **Header parameters** are fields of the input under the spec's name, judged like any field and sent only as headers.
  `Idempotency-Key` (any case), where a call declares it, is never required: the caller's key is sent as given, else a
  fresh random UUID on every call.
- **A `oneOf` or `anyOf` body** takes the fields of any alternative, and the body given is judged against the whole
  schema before sending. No body field given, no body sent.
- **Answers** that misfit their status's schema, or a 2xx the call doesn't document, are `AnswerRefused`; with
  `client({ ..., answers: "lenient", onMisfit })` they come back as they came and `onMisfit({ call, status, problems })`
  is told once. Lenient is for answers only.

What it writes, each generated file opening `// Generated from <title> <version>. Do not edit.` (no path and no time, so the
same document as JSON or YAML, from any path, is the same bytes):

| File | |
|---|---|
| `src/index.ts` | the descriptor: `Blueprint.adapter({ calls, events })`, every call a `Blueprint.call()` in its group |
| `src/client.ts` | `client({ baseUrl, token?, answers?, onMisfit? })`, whose calls are promises of the answer's JSON |
| `src/spec/{operations,components,events}.ts` | the description's data: each call's request and success schema, the schemas they refer to, the events' payloads |
| `src/runtime/*.ts` | `internal/runtime/`, copied in: the JSON schema judge and the client, so a plugin imports only `orthograph` and `effect` |
| `package.json`, `blueprint/README.md`, `src/written.ts` | scaffolds, yours from the first run: what the description doesn't say (events it has no schema for, the stand-in) |

The judge (`internal/runtime/json-schema.ts`) reads types, enums, required parts, items, `allOf` / `oneOf` / `anyOf`, string
patterns, formats and lengths, and number bounds; it never changes the value, so a decoded event is the JSON that came in.

Not done here: the declared errors per response (a failure is a tagged value, `ApiFailure` with its status or Slack's
`code`), and types of payloads from the schemas (events decode to `unknown`). Tests: `adapter.test.ts`, and #739's
`gaps.test.ts`, `bodies-and-answers.test.ts` and `bridge.test.ts` (on Bridge's pinned description); the whole check is
`e2e/superagent/`.
