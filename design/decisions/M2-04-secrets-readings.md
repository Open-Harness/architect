# M2-04-secrets-readings: how secrets by declaration are read, in eight calls

Decided 23 November 2026 for slice M2.04 (#635), by the Goal 3 lead on the checks pull request (#659), recorded by the
builder with the build. It settles the places where `design/frame/secrets.md`, `design/decisions/M2-auth.md` (smaller calls,
row 7 and row 9) and M2.04's row in `design/milestones.md` were silent or disagreed. Grounded at `origin/goal/stage-1`
`dc471c87`.

## Context

The frame says a plugin or the app declares a secret by export in its own `blueprint/secrets.ts`, that the name in every
environment is derived from the mount and the export, that only the declaring plugin's layer sees the value, as a
`Redacted`, and that `ortho secrets set` puts one in. It does not say where the model keeps them, which spelling
`secrets set` takes, where a local value lives, how `Secret.release` coexists with the existing `Secret` type, how a name
with digits or acronyms splits, or what happens to the built-in `AUTH_SECRET`. The checks (`e2e/m2/02` to `05`,
`packages/orthograph/src/modules/secrets/declared.test.ts`) were written for one reading of each; this records them.

## The calls

1. **Model shape.** `model.secrets[NAME] = { how, kind, export, from }`, never a value, and `from` is `{ kind: "app" }` or
   `{ kind: "feature" | "adapter" | "projection", mount, package, version }`. Each environment's existing `secrets` (name to
   `how`) also names every runtime secret, in every environment; a release or builder secret never reaches one. The `secrets`
   key is absent when nothing is declared, so acme's model, hashes and `generated/` do not change.
   *Evidence:* `e2e/m2/02` (12 tests) and `05` (4); built in `packages/compiler/src/modules/model/internal/secrets.ts` and
   `environments.ts`.
2. **`ortho secrets set` takes the derived NAME** (`STRIPE_API_KEY`), the spelling the listing prints and M2-auth row 7 and the
   issue use. The frame's `stripe.apiKey` is rewritten. The value is read from stdin only: the whole of it less one final
   newline, kept as given; a value on the command line (an argument, `--value x`, `--value=x`) is refused before the argument
   parser runs, because the parser quotes what it rejects. An empty value, a value of more than one line, an unknown name,
   an unknown environment and a release or builder secret (CI's and a developer's, not a running place's) are refused.
   *Evidence:* `e2e/m2/03`, 13 tests.
3. **Local values live in `.ortho/environments/<env>/secrets.env`, mode 0600, gitignored,** in every environment in the local
   pass, production included. `set` makes the mode 0600 before it writes the value, and again after, and leaves every other
   line. `promote` reads the target's own file: a stored runtime secret with no value there is refused by name, before a bundle
   is looked at or anything starts; a declared `test` value does not count, and a value set for another environment does not.
   Staging and production values in CI come from the Actions secrets, as they do today; the cloud pass puts them in the
   Worker's store. `ortho secrets` says `set`, `missing` or `in CI` (release and builder); a generated runtime secret with no
   value yet says `set (made when first needed)`, or `missing (promote makes it)` in an environment with a cloud.
   *Evidence:* `e2e/m2/03` and `04` (8 tests, 7 failing before).
4. **`Secret.release`.** `Secret` is now a value, `{ runtime, release, builder }`, exported beside `Blueprint`; the old `Secret`
   type is `SecretDeclaration`, whose discriminant stays `kind: "secret"` and whose own kind is `secretKind` (default
   `runtime`). Options are `describe`, `test` (stored only), `bytes` (generated only) and `kind`.
   *Evidence:* TS2323 forbids a type and a const of one name exported from `index.ts`; `secrets.test.ts`.
5. **Digits and acronyms in names.** An export must be lowercase words in camelCase (`/^[a-z]+([A-Z][a-z]+)*$/`); one with a
   digit or a run of capitals (`key2Value`, `apiURL`) is refused, naming the file, because its words could split two ways. A
   mount's name is already words joined by dashes, so it splits by the dashes. No check judges this; a snag is filed.
   Two exports on one derived name are refused by `ortho check`, naming the name and both declarations (`export authSecret in
   blueprint/secrets.ts and export secret of @fixture/auth, mounted in blueprint/features/auth.ts`).
   *Evidence:* `e2e/m2/04` (collisions, including two different mount and export pairs that join to `TEAM_SIGNING_SECRET`).
6. **The built-in `AUTH_SECRET` stays until M2.05.** Acme mounts no plugin until then and its server reads `env.AUTH_SECRET`,
   so removing it here would change acme's `generated/`. *Evidence:* `e2e/m2/05` (the 112 files byte for byte).
7. **The runtime layer, end to end, is M2.05's.** `Blueprint.layer(plugin, factory)` is the function of the `made` record
   `({ secrets, settings?, db? })`; the factory reads a secret with `yield* secrets.<export>` as a `Redacted<string>`, one not
   handed fails with the typed `SecretNotHanded` naming the export, and `settings` is `{}`. How the generated server finds and
   calls a plugin's layer is M2.05's. *Evidence:* `declared.test.ts`, 6 tests.
8. **The acme manifest** (`e2e/fixtures/m2/acme/generated-before-m2-04.json`): whichever slice changes acme's `generated/`
   first, its author recaptures it in the same pair. This slice does not touch it.

## Not decided here

- A stored secret's `test` value is not in the model (never a value, even a stand-in), so `ortho secrets` calls a stored secret
  with no value `missing` locally too, though a world and a local environment run on the stand-in. Left for the cloud pass.
- `secrets.env` of a cloud environment is the local pass's place; the cloud pass moves production and staging to the store.

## Supersedes

- design/frame/secrets.md: "ortho secrets set stripe.apiKey --env production   # prompts without echo, or reads stdin; writes to the store" → "printf %s "$VALUE" | ortho secrets set STRIPE_API_KEY --env production   # reads stdin only, never an argument; the local pass writes .ortho/environments/production/secrets.env (0600)"
- design/docs/index.html: "$ ortho secrets set stripe.apiKey --env production     # prompts without echo; never an argument" → "$ printf %s "$VALUE" | ortho secrets set STRIPE_API_KEY --env production     # reads stdin only; never an argument"
- design/frame/secrets.md: "`ortho secrets set`, no echo, straight to the store" → "`ortho secrets set <NAME>`, from stdin, into the environment's `secrets.env` (0600) in the local pass, the store in the cloud pass"
