import { Effect } from "effect";
import type { Model } from "@orthograph/compiler";
import { SecretsRefused, type SecretRow, type SecretsApi } from "./types.ts";
import { fileOf, keep, valuesOf } from "./internal/file.ts";

const declared = (model: Model) => Object.entries(model.secrets ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

/** `local` always exists; any other environment is a file in `blueprint/environments/`. */
const known = (model: Model, env: string): Effect.Effect<void, SecretsRefused> =>
  env === "local" || model.environments?.[env] !== undefined ? Effect.void
    : Effect.fail(new SecretsRefused({ message: `no environment "${env}" in blueprint/environments/ (${Object.keys(model.environments ?? {}).join(", ") || "none"})` }));

export const Secrets: SecretsApi = {
  rows: ({ root, env, model }) => Effect.gen(function* () {
    yield* known(model, env);
    const have = yield* Effect.sync(() => valuesOf(fileOf(root, env)));
    const cloud = model.environments?.[env]?.cloud != null;
    return declared(model).map(([name, s]): SecretRow => ({
      name, how: s.how, kind: s.kind,
      status: s.kind !== "runtime" ? "in CI"
        : have.has(name) ? "set"
        : s.how === "stored" ? "missing"
        : cloud ? "missing (promote makes it)" : "set (made when first needed)",
    }));
  }),
  set: ({ root, env, name, value, model }) => Effect.gen(function* () {
    yield* known(model, env);
    const secret = model.secrets?.[name];
    if (!secret) return yield* new SecretsRefused({ message: `no secret named ${name}: the blueprint declares ${declared(model).map(([n]) => n).join(", ") || "none"}` });
    if (secret.kind !== "runtime") return yield* new SecretsRefused({ message: `${name} is a ${secret.kind} secret: ${secret.kind === "release" ? "CI holds it" : "a developer's machine holds it"}, so it is not set here` });
    if (value === "") return yield* new SecretsRefused({ message: `no value for ${name}: pipe it in, e.g. \`printf %s "$VALUE" | ortho secrets set ${name}\`` });
    if (/[\r\n]/.test(value)) return yield* new SecretsRefused({ message: `the value for ${name} runs over more than one line, and secrets.env keeps one line a value` });
    yield* Effect.sync(() => keep(fileOf(root, env), name, value));
  }),
  missing: ({ root, target, model }) => Effect.sync(() => {
    const have = valuesOf(fileOf(root, target));
    return declared(model).flatMap(([name, s]) => (s.kind === "runtime" && s.how === "stored" && !have.has(name) ? [name] : []));
  }),
};
