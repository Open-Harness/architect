// The project's name: the `name` in `ortho.config.ts`, loaded. The prefix of every resource and the address of a deployed Worker both start from it.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect } from "effect";
import { StagingRefused } from "../types.ts";

export const appOf = (root: string): Effect.Effect<string, StagingRefused> =>
  Effect.gen(function* () {
    const config = yield* Effect.tryPromise({
      try: () => import(pathToFileURL(join(root, "ortho.config.ts")).href) as Promise<{ readonly default?: { readonly kind?: string; readonly name?: unknown } }>,
      catch: () => new StagingRefused({ message: "ortho.config.ts is missing or does not load: the project's name is read from it" }),
    });
    const app = config.default?.name;
    if (config.default?.kind !== "config" || typeof app !== "string") return yield* new StagingRefused({ message: "ortho.config.ts does not export Blueprint.config({ name })" });
    return app;
  });
