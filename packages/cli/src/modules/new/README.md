# new

`ortho new adapter <name> --from-openapi <file or URL>` (M5.07) reads a service's own published API description, OpenAPI
3.x or Swagger 2.0, JSON or YAML (PostHog's own URL serves YAML), and writes the adapter to `plugins/<name>/`: the
descriptor, a client, the spec's data and the runtime the client needs, each generated file under
`// Generated from <title> <version>. Do not edit.`, and the files that are yours (`package.json`, `src/written.ts`,
`blueprint/`) written once and never touched again. Running it again puts every generated file back.

The generator is `@orthograph/generators/adapter` (pure: a parsed document in, files out). This module reads the document,
refuses what can't make an adapter before writing anything (`could not read`, `could not parse`, `not an OpenAPI or
Swagger description`, `no operations`, `lower case words`), writes, and says what it made on the last line.
Test: `new.test.ts`.

`ortho new app <name>` is not here: it is `App.create` in `@orthograph/preset`, which `create-orthograph` calls too, so both make exactly what the preset makes. `main.ts` only parses the name and prints.
