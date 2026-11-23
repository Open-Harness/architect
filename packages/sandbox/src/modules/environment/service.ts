import { Effect } from "effect";
import { BadVariableName, CredentialLikeVariable, type EnvironmentApi, type EnvVar } from "./types.ts";
import { credentialLike, wellFormed } from "./internal/names.ts";

export const Environment: EnvironmentApi = {
  of: (spec) =>
    Effect.gen(function* () {
      const builtIn: ReadonlyArray<EnvVar> = [
        { name: "SUPERAGENT_DIR", from: "built-in", value: spec.root },
        { name: "SUPERAGENT_NAME", from: "built-in", value: spec.owner },
        { name: "SUPERAGENT_TICKET", from: "built-in", value: spec.tag },
        { name: "SUPERAGENT_BLOCKED_COMMANDS", from: "built-in", value: spec.blocked.join(",") },
      ];
      const seen = new Set(builtIn.map((v) => v.name));
      const given: Array<EnvVar> = [];
      for (const variable of spec.variables) {
        if (!wellFormed(variable.name) || seen.has(variable.name)) return yield* Effect.fail(new BadVariableName({ variable: variable.name }));
        if (credentialLike(variable.name)) return yield* Effect.fail(new CredentialLikeVariable({ variable: variable.name }));
        seen.add(variable.name);
        given.push({ name: variable.name, from: variable.from ?? "settings", value: variable.value });
      }
      // Sources' variables come before Settings', as the record has it; each group keeps the order it was given in.
      return [...builtIn, ...given.filter((v) => v.from === "source"), ...given.filter((v) => v.from === "settings")];
    }),
  processEnv: (variables, where) => ({
    ...Object.fromEntries(variables.map((v) => [v.name, v.value])),
    PATH: `${where.shims}:${where.systemPath}`,
    HOME: where.root,
    TMPDIR: `${where.root}/.tmp`,
    LANG: "C.UTF-8",
  }),
};
