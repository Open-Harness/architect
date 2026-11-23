import { join } from "node:path";
import { Effect } from "effect";
import { Render } from "#modules/render/service.js";
import type { SyncApi } from "./types.ts";
import { filesUnder } from "./internal/files.ts";
import { modelOf } from "./internal/model.ts";
import { missingHandlers } from "./internal/handlers.ts";
import { ModelFailed } from "./types.ts";

export const Sync: SyncApi = {
  project: (tree, root) =>
    Effect.gen(function* () {
      const model = yield* modelOf(join(tree.root, root), root);
      const missing = missingHandlers(join(tree.root, root), model);
      if (missing.length > 0) return yield* new ModelFailed({ root, problems: missing.join("\n") });
      const name = root.split("/").at(-1) ?? root;
      const files = yield* Render.files({ name, model, root: join(tree.root, root) }).pipe(
        Effect.mapError((e) => new ModelFailed({ root, problems: e.message })),
      );
      // A write whose bytes match what is on disk is no change, so a synced project reports nothing to do.
      for (const f of files) {
        const path = `${root}/${f.path}`;
        if (f.scaffold && tree.exists(path)) continue;
        tree.write(path, f.content);
      }
      const wanted = new Set(files.filter((f) => !f.scaffold).map((f) => `${root}/${f.path}`));
      // `generated/model/changes.json` is the model against the last release in the logbook: the CLI writes it, never the generators.
      const kept = `${root}/generated/model/changes.json`;
      for (const path of filesUnder(tree, `${root}/generated`)) if (!wanted.has(path) && path !== kept) tree.delete(path);
    }),
};
export { ModelFailed } from "./types.ts";
