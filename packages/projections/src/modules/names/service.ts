import { Effect } from "effect";
import type { Output } from "orthograph";
import type { Model } from "@orthograph/compiler";
import { MountedElsewhere, type RenderedFile } from "./types.ts";

export * from "./internal/names.ts";
export * from "./internal/words.ts";
export * from "./internal/when.ts";

/** The model a projection renders from: the compiler's, which `orthograph` types as unknown. */
export const modelOf = (input: { readonly model: unknown }): Model => input.model as Model;

/**
 * A built-in projection's files as its mount's output: each path relative to `generated/<mount>/`. The renderers write
 * the paths the rest of the tooling reads (`generated/server/main.ts`), so a built-in projection is mounted under its own
 * name, and a mount named otherwise is refused here, naming the file it should be.
 */
export const within = (input: { readonly mount: string }, folder: string, files: ReadonlyArray<RenderedFile>): Effect.Effect<ReadonlyArray<Output>, MountedElsewhere> => {
  if (input.mount !== folder) {
    return Effect.fail(new MountedElsewhere({ message: `blueprint/projections/${input.mount}.ts: this projection writes generated/${folder}/, which the other tools read by that name: mount it as blueprint/projections/${folder}.ts` }));
  }
  const prefix = `generated/${folder}/`;
  return Effect.succeed(files.map((f) => ({ path: f.path.startsWith(prefix) ? f.path.slice(prefix.length) : f.path, content: f.content })));
};
