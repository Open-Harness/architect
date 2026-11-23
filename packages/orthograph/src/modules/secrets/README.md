# secrets

Owns `Blueprint.secret.generated(options?)`, `Blueprint.secret.stored(options?)`, `Secret.release` / `Secret.builder`
(the `kind` option; `Secret` is exported beside `Blueprint`) and `Blueprint.layer(plugin, factory)`.

A plugin or the app declares a secret by export in its own `blueprint/secrets.ts`. The declaration names a value and says
how it gets one (`generated` or `stored`), who holds it (`runtime`, `release` or `builder`) and, for a stored one, an
optional `test` stand-in. It never holds a credential. The name in an environment is derived by the compiler from the
mount and the export (`design/decisions/M2-04-secrets-readings.md`), so nobody types it. The declaration's discriminant
stays `kind: "secret"`; the secret's own kind is `secretKind`.

`Blueprint.layer(plugin, factory)` is the plugin's own layer: the generated server hands it what it made, and the factory
reads a secret with `yield* secrets.<export>` as a `Redacted<string>`. One that was not handed fails with
`SecretNotHanded` (a typed failure naming the export). `settings` is `{}` until M2.06. How the server calls the layer is
M2.05's.

Tests: `secrets.test.ts` (declarations), `declared.test.ts` (the layer).
