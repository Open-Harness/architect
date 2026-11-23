// The drift part, which is also the rule no-edited-output: generated/ must be exactly what the blueprint renders.
import { existsSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { Cause, Effect } from "effect";
import type { Model } from "@orthograph/compiler";
import { Render } from "@orthograph/generators/render";
import type { Finding } from "../types.ts";
import { allFiles } from "./files.ts";

export const drift = (root: string, model: Model): Effect.Effect<ReadonlyArray<Finding>> => Effect.gen(function* () {
  // A projection that can't be loaded or won't render is drift too: nothing it should make can be compared.
  // A projection that crashes on a model it has no rendering for (a chain-stored thing, until its language renders) is the same finding, never a crash of check.
  const rendered = yield* Render.files({ name: basename(root), model, root }).pipe(
    Effect.catchCause((cause) => Effect.fail({ message: `can't render: ${Cause.pretty(cause).split("\n")[0] ?? "a projection failed"}` })),
    Effect.result,
  );
  if (rendered._tag === "Failure") return [{ part: "drift", rule: "no-edited-output", file: "generated", message: rendered.failure.message } satisfies Finding];
  const wanted = rendered.success.filter((f) => !f.scaffold);
  const edited = wanted.flatMap((f): ReadonlyArray<Finding> => {
    const at = join(root, f.path);
    if (!existsSync(at)) return [{ part: "drift", rule: "no-edited-output", file: f.path, message: "is missing: run ortho generate" }];
    return readFileSync(at, "utf8") === f.content ? [] : [{ part: "drift", rule: "no-edited-output", file: f.path, message: "differs from what the blueprint generates: never edit generated/, run ortho generate" }];
  });
  // Dot-folders under generated/ are tools' own state (wrangler's `.wrangler/`), never output.
  const known = new Set(wanted.map((f) => f.path));
  const orphans = allFiles(join(root, "generated")).map((f) => relative(root, f)).filter((p) => !known.has(p) && !p.split("/").some((part) => part.startsWith(".")))
    .map((p): Finding => ({ part: "drift", rule: "no-edited-output", file: p, message: "is in generated/ but the blueprint doesn't generate it" }));
  return [...edited, ...orphans];
});
