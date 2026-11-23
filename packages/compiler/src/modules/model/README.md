# model

Builds the model, the one description every generator reads, from a loaded blueprint.

- Names come from paths and exports: `things/<thing>/verbs/<verb>.ts` is operation `<thing>.<verb>`; an error is named by
  its exported class; a step by its key, as `<thing>.<verb>.<key>`.
- References are resolved: a field taken from another thing's field carries `ref`, a named value carries `named`.
- Each thing and operation carries a `hash` of its canonical JSON (sorted keys), so reformatting a file never changes
  it and renaming a file does.
- A blueprint that breaks the layout fails with `BlueprintInvalid`, listing every problem, never the first only.
- Stores (K3): `blueprint/stores/<name>.ts` is store `<name>`; a thing that names one carries `store`, a feature's own
  are `<mount>-<name>`. The kinds a host supplies are `STORE_KINDS` (`internal/stores.ts`). An operation whose `move`
  and steps write to more than one store is refused with the operation, its file and what writes where. An
  environment's `stores:` may bind only declared database stores. A project with no store has none in its model.
  Tests: `stores.test.ts`; `vault.test.ts` runs the real fixture feature beside acme.
- Rules (G5): `things/<thing>/invariants.ts` is read like `errors.ts`; each `Blueprint.invariant.unique` export is
  `things.<thing>.invariants.<name>` (`kind`, `fields`, and `while`, `refuse`, `description` when written), hashed with
  the thing. The compiler adds each rule's refusal to `refusals` of every operation that can break it (`internal/invariants.ts`,
  decision G5 section 3) and maps it back in `operations.<op>.invariants` (refusal to `<thing>.<rule>`), never in `errors`;
  every operation also carries `breaks`, the full names of every rule it can break, with a refusal or without (S31; a database step that
  leaves `writes` unset is unknown and breaks the rules of a thing with no machine, `writes: []` is reads only). The exit-clash scan reads them too.
  A thing with no rule carries no `invariants` field, so its hash is unchanged.
  Tests: `invariants.test.ts`.
- Secrets (M2.04): `blueprint/secrets.ts` (the app's) and each mounted plugin's own `blueprint/secrets.ts` are read by
  export, each a `Blueprint.secret.generated(…)` or `.stored(…)`. The name is derived, never written: the mount, then the
  export, each in UPPER_SNAKE (`stripe-eu` + `apiKey` is `STRIPE_EU_API_KEY`); the app's own have no mount in the name. The
  model gets `secrets[NAME] = { how, kind, export, from }` (never a value; absent when nothing is declared), and every
  environment's `secrets` also names every runtime secret (release and builder ones never reach a running place). Refused,
  naming both places: two exports on one name (`internal/secrets.ts`), an export with digits or a run of capitals
  (`key2`, `apiURL`) because its words could split two ways, and an environment that also names a declared secret by hand.
  Tests: `e2e/m2/02` and `04`.
