import { Effect } from "effect";
import { Compiler, nodeSource, type Model } from "@orthograph/compiler";
import { Secrets, type SecretRow } from "@orthograph/prove";
import type { Said, SecretsCommandApi } from "./types.ts";
import { VALUE_REFUSED, carriesValue } from "./internal/argv.ts";

const refused = (message: string): Said => ({ out: "", err: `${message}\n`, exit: 2 });

/** The model, or the answer that says why there is none. */
const modelOf = (root: string): Effect.Effect<Model, Said> =>
  Compiler.model.pipe(
    Effect.provide(nodeSource(root)),
    Effect.mapError((e) => refused(e._tag === "BlueprintInvalid" ? `The blueprint is invalid:\n${e.problems.map((p) => `  - ${p}`).join("\n")}` : e.message)),
  );

const table = (rows: ReadonlyArray<SecretRow>): string => {
  const cells = [["NAME", "HOW", "KIND", "STATUS"], ...rows.map((r) => [r.name, r.how, r.kind, r.status])];
  const wide = [0, 1, 2].map((i) => Math.max(...cells.map((c) => c[i]!.length)));
  return cells.map((c) => [...c.slice(0, 3).map((x, i) => x.padEnd(wide[i]! + 2)), c[3]].join("")).join("\n") + "\n";
};

export const SecretsCommand: SecretsCommandApi = {
  refusesValue: (args) => (carriesValue(args) ? VALUE_REFUSED : undefined),
  list: ({ root, env }) =>
    Effect.gen(function* () {
      const model = yield* modelOf(root);
      const rows = yield* Secrets.rows({ root, env, model }).pipe(Effect.mapError((e) => refused(e.message)));
      return { out: rows.length === 0 ? "no secrets declared\n" : table(rows), err: "", exit: 0 } satisfies Said;
    }).pipe(Effect.catch((said: Said) => Effect.succeed(said))),
  set: ({ root, env, name, stdin }) =>
    Effect.gen(function* () {
      const model = yield* modelOf(root);
      const value = stdin.endsWith("\n") ? stdin.slice(0, -1) : stdin;
      yield* Secrets.set({ root, env, name, value, model }).pipe(Effect.mapError((e) => refused(e.message)));
      return { out: `set ${name} in ${env}\n`, err: "", exit: 0 } satisfies Said;
    }).pipe(Effect.catch((said: Said) => Effect.succeed(said))),
};
