// Secrets: a value the blueprint names but never holds. A plugin or the app declares one by export in its own
// `blueprint/secrets.ts`; its name in every environment is derived from the mount and the export (M2-04-secrets-readings).
// The value lives in the environment; only the declaring plugin's code sees it, as a `Redacted`.
import type { Effect, Redacted } from "effect";
import type { Plugin } from "#modules/plugins/types.js";

/** Who holds a secret: a running place (the default), shipping (CI), or the tools that build (a developer's machine). */
export type SecretKind = "runtime" | "release" | "builder";

/** What a declaration is: a name for a value and the facts about it, never the value (a `test` value is a stand-in, not a credential). */
export interface SecretDeclaration {
  /** The discriminant: every declaration says it is a secret. */
  readonly kind: "secret";
  /** `generated` is made for each world or environment; `stored` is put there by whoever runs it. */
  readonly how: "generated" | "stored";
  /** Who holds it: `Secret.runtime` unless the declaration says `kind: Secret.release` or `Secret.builder`. */
  readonly secretKind: SecretKind;
  /** What it is, for the person who sets it. */
  readonly describe?: string;
  /** A stored secret's stand-in for a world and a local environment; never staging's or production's. */
  readonly test?: string;
  /** A generated secret's length in bytes. */
  readonly bytes?: number;
}

export interface GeneratedOptions {
  readonly kind?: SecretKind;
  readonly describe?: string;
  readonly bytes?: number;
}
export interface StoredOptions {
  readonly kind?: SecretKind;
  readonly describe?: string;
  readonly test?: string;
}

/** A secret a layer asked for that the server did not hand it. Names the export, never a value. */
export interface SecretNotHanded {
  readonly _tag: "SecretNotHanded";
  readonly secret: string;
}

/** What the generated server hands a plugin's layer: the secrets by export, each already `Redacted`, and no settings yet (M2.06). */
export interface Made {
  readonly secrets: Readonly<Record<string, Redacted.Redacted<string>>>;
  readonly settings?: Readonly<Record<string, unknown>>;
  readonly db?: unknown;
}

/** What a plugin's layer factory is given: each secret as an Effect to `yield*`, failing with `SecretNotHanded` when it was not handed. */
export interface Given {
  readonly secrets: Readonly<Record<string, Effect.Effect<Redacted.Redacted<string>, SecretNotHanded>>>;
  readonly settings: Readonly<Record<string, never>>;
  readonly db?: unknown;
}

export interface SecretsApi {
  readonly secret: {
    readonly generated: (options?: GeneratedOptions) => SecretDeclaration;
    readonly stored: (options?: StoredOptions) => SecretDeclaration;
  };
  /** The plugin's own layer: `factory` gets its secrets as `Redacted`, and the whole is a function of what the server made. */
  readonly layer: <A, E, R = never>(plugin: Plugin, factory: (given: Given) => Effect.Effect<A, E, R>) => (made: Made) => Effect.Effect<A, E | SecretNotHanded, R>;
}
