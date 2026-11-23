// What a promotion needs before anything starts: a clean tree, the revision's own built bundle, and its verdicts.
import { Effect } from "effect";
import type { Model } from "@orthograph/compiler";
import { Build } from "#modules/build/service.js";
import type { Built } from "#modules/build/types.js";
import type { Held } from "#modules/verdicts/types.js";
import { Verdicts } from "#modules/verdicts/service.js";
import { PromoteFailed, PromoteRefused } from "../types.ts";

/** Only verdicts posted from `main` open a gate: a pull request's never do (D3 #8). */
const MAIN = "refs/heads/main";

const failed = (e: { readonly message: string }) => new PromoteFailed({ message: e.message });

/** The revision's bundle, as `ortho build` kept it: refused when the tree isn't that commit, or there is no bundle, or it was altered. */
export const bundleOf = (root: string, revision: string): Effect.Effect<Built, PromoteRefused | PromoteFailed> =>
  Effect.gen(function* () {
    const problems: Array<string> = [];
    if (yield* Build.dirty(root).pipe(Effect.mapError(failed))) {
      problems.push(`refused: the working tree differs from ${revision}: commit or stash what changed, so the bundle is that commit's`);
    }
    const kept = yield* Build.find(root, revision).pipe(
      Effect.catchTag("BuildFailed", (e) => Effect.sync(() => void problems.push(`refused: the bundle of ${revision} is not what was built: ${e.message}`)).pipe(Effect.as(undefined))),
    );
    if (kept === undefined && problems.length === 0) problems.push(`refused: ${revision} has no built bundle: run \`ortho build\``);
    if (problems.length > 0 || kept === undefined) return yield* new PromoteRefused({ lines: problems });
    return kept;
  });

/** Every operation of the model has a passing verdict from `main` for the revision in `environment`, or the refusal says which do not. */
export const verdictsIn = (logbook: string, model: Model, revision: string, environment: string, sha256: string): Effect.Effect<ReadonlyArray<Held>, PromoteRefused | PromoteFailed> =>
  Effect.gen(function* () {
    const held = yield* Verdicts.latest({ logbook, revision, environment, ref: MAIN }).pipe(Effect.mapError(failed));
    const passed = held.filter((v) => v.verdict === "pass" && v.sha256 === sha256);
    const passing = new Set(passed.map((v) => v.operation));
    const missing = Object.keys(model.operations).filter((op) => !passing.has(op)).sort();
    if (missing.length === 0) return passed;
    return yield* new PromoteRefused({
      lines: [
        passing.size === 0 ? `refused: ${revision} has no green verdicts in ${environment}` : `refused: ${revision} has no green verdicts in ${environment} for every operation`,
        `missing: ${missing.join(", ")}`,
        ...(held.some((v) => v.verdict === "pass" && v.sha256 !== sha256) ? [`bundle ${sha256}: the latest proof is missing its bundle hash or names different bytes`] : []),
      ],
    });
  });
