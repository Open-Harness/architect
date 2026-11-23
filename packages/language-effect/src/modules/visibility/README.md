# visibility

The one rule for what leaves (M1.35, K12 section 1). Every output asks it, with the `Audience` it is speaking to:

| Audience | Who | Shown |
|---|---|---|
| `Audience.principal(held, { issuing })` | someone who called, with the roles they hold in this call | public; private to a role they hold; a secret only when `issuing` and the field is `Blueprint.issued` |
| `Audience.agent(held)` | an agent acting for a person (MCP) | public; private to a role the person holds; never a secret |
| `Audience.telemetry` | spans, logs, metrics | public values that are traceable (a public text value only if `traced`) |
| `Audience.public` | the journal, the docs | public values |
| `Audience.owner` | whoever runs the deployment, reading its own record | public and private values, never a secret |

- `Visibility.sees(audience, field)`: whether it is shown a value declared as `field`.
- `Visibility.redact(audience, fields, values, items?)`: `values` cut to the keys the declaration names and the audience sees.
  A key the declaration does not name is dropped: the rule fails closed. A list read's `items` are cut by `items`.
- `Visibility.schema(audience, fields, items?)`: the struct schema of what that audience is answered with. The wire's schema
  (`principal`) names every declared field and makes the ones not every caller is shown optional, because a client decodes
  whatever a server sent; `redact` is what cuts.
- `Visibility.needsRoles(...groups)`: some field is private to roles, so who holds which role matters.

Who calls it: the generated server cuts every HTTP answer and refusal (`Wire.shown`); the generated API's endpoint and error
schemas come from `schema`; MCP is the agent case; span attributes, the journal and the log redactor ask `sees`. The SDK and
the CLI show what the server sent: only the server knows the roles a caller holds in a call.

The module is pure: it imports `orthograph` and Effect only, and is also served as `@orthograph/language-effect/visibility`,
so a bundled client takes the rule without the rest of the runtime.

Test: `visibility.test.ts`.
