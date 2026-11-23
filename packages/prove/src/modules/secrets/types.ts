// Secrets, as an environment holds them: which of the model's declared secrets have a value in an environment, and
// setting one. Values live in `.ortho/environments/<env>/secrets.env` (mode 0600, gitignored) in the local pass; this module
// returns names and set/unset, never a value.
import { Data, type Effect } from "effect";
import type { Model } from "@orthograph/compiler";

/** A secret command the rules turn away: an environment or a name nothing declares, an empty value, a secret CI holds. */
export class SecretsRefused extends Data.TaggedError("SecretsRefused")<{ readonly message: string }> {}

/** One declared secret in one environment: `how` it is given, whose it is (`kind`), and its state in words (`set`, `missing`, `in CI`). */
export interface SecretRow {
  readonly name: string;
  readonly how: "generated" | "stored";
  readonly kind: "runtime" | "release" | "builder";
  readonly status: string;
}

export interface SecretsApi {
  /** Every declared secret, sorted by name, with its state in `env`. Refuses an environment the blueprint doesn't have. */
  readonly rows: (options: { readonly root: string; readonly env: string; readonly model: Model }) => Effect.Effect<ReadonlyArray<SecretRow>, SecretsRefused>;
  /**
   * Keep `value` (as given) for `name` in `env`'s `secrets.env`, mode 0600, leaving every other line as it was. Refuses an
   * environment or a name the blueprint doesn't declare, a release or builder secret (CI's and a developer's, not a running
   * place's), and an empty value or one that runs over a line.
   */
  readonly set: (options: { readonly root: string; readonly env: string; readonly name: string; readonly value: string; readonly model: Model }) => Effect.Effect<void, SecretsRefused>;
  /** The stored runtime secrets that `target` has no value for, sorted: what `promote` refuses on. A declared `test` value doesn't count. */
  readonly missing: (options: { readonly root: string; readonly target: string; readonly model: Model }) => Effect.Effect<ReadonlyArray<string>>;
}
