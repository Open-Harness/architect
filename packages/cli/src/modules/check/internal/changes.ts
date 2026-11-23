// The changes part: what the blueprint now says against the model checked in under `generated/model/model.json`, and what each change means for the version.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { Compare, type Model } from "@orthograph/compiler";

/**
 * One line for each change that is not a patch, naming what changed and the bump it makes: `thing:allowance (states
 * renumbered or removed: exhausted): major`. Nothing when nothing changed that matters, or when no model is checked in.
 * These are what the next version will be made of (D3 #1), so they inform: they never fail the check.
 */
export const changes = (root: string, model: Model): Effect.Effect<ReadonlyArray<string>> => {
  const file = join(root, "generated/model/model.json");
  if (!existsSync(file)) return Effect.succeed([]);
  return Effect.try({ try: () => JSON.parse(readFileSync(file, "utf8")) as Model, catch: (e) => e }).pipe(
    Effect.map((before) => Compare.release(before, model).changes.filter((c) => c.bump !== "patch")),
    Effect.map((found) => (found.length === 0 ? [] : [`changes ${found.length}`, ...found.map((c) => `  ${c.what}${c.detail ? ` (${c.detail})` : ""}: ${c.bump}`)])),
    Effect.orElseSucceed(() => []),
  );
};
