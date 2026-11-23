import { Effect } from "effect";
import type { Given, Made, SecretDeclaration, SecretKind, SecretsApi } from "./types.ts";

/** `kind: Secret.release` in a declaration: who holds the secret. */
export const Secret: Readonly<Record<SecretKind, SecretKind>> = Object.freeze({ runtime: "runtime", release: "release", builder: "builder" });

const declared = (how: SecretDeclaration["how"]) => (options: { readonly kind?: SecretKind; readonly describe?: string; readonly test?: string; readonly bytes?: number } = {}): SecretDeclaration =>
  Object.freeze({
    kind: "secret",
    how,
    secretKind: options.kind ?? "runtime",
    ...(options.describe === undefined ? {} : { describe: options.describe }),
    ...(options.test === undefined ? {} : { test: options.test }),
    ...(options.bytes === undefined ? {} : { bytes: options.bytes }),
  });

/** A secret not handed is a failure the plugin can handle; it names the export and holds nothing else. */
const handed = (made: Made): Given["secrets"] =>
  Object.fromEntries(Object.entries(made.secrets).map(([name, value]) => [name, Effect.succeed(value)])) as Given["secrets"];

const notHanded = (secrets: Given["secrets"]): Given["secrets"] =>
  new Proxy(secrets, {
    get: (target, name) => typeof name !== "string" || Object.hasOwn(target, name) ? Reflect.get(target, name) : Effect.fail({ _tag: "SecretNotHanded" as const, secret: name }),
  });

export const Secrets: SecretsApi = {
  secret: { generated: declared("generated"), stored: declared("stored") },
  layer: (_plugin, factory) => (made) => factory({ secrets: notHanded(handed(made)), settings: {}, ...(made.db === undefined ? {} : { db: made.db }) }),
};
