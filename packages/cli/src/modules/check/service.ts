import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { Effect } from "effect";
import { Compiler, nodeSource } from "@orthograph/compiler";
import type { CheckApi, Finding } from "./types.ts";
import { blankLines, blanks } from "./internal/blanks.ts";
import { textsUnder } from "./internal/files.ts";
import { rules, types } from "./internal/tools.ts";
import { drift } from "./internal/drift.ts";
import { ratchet, ratchetsOf } from "./internal/ratchets.ts";

const part = (name: string, found: ReadonlyArray<Finding>) =>
  found.length === 0
    ? [`${name} ✔`]
    : [`${name} ✘ ${found.length}`, ...found.map((f) => `  ${f.file}${f.line ? `:${f.line}` : ""}  ${f.rule}: ${f.message}`)];

const run: CheckApi["run"] = (at) =>
  Effect.gen(function* () {
    // The real path: tools report files by it, so a root reached through a symlink (macOS /var) still matches.
    const root = existsSync(at) ? realpathSync(at) : resolve(at);
    const left = blanks(textsUnder(root, "blueprint"));
    const compiled = yield* Compiler.model.pipe(Effect.provide(nodeSource(root)), Effect.result);
    if (compiled._tag === "Failure") {
      // Each problem names its files: the app's, and a plugin's package path with the mount that brought it in.
      const problems = compiled.failure._tag === "BlueprintInvalid" ? compiled.failure.problems : [compiled.failure.message];
      return { lines: [...blankLines(left), `model ✘ ${problems.length}`, ...problems.map((p) => `  ${p}`), "check ✘"], passed: false };
    }
    const model = { value: compiled.success };
    const typed = yield* Effect.sync(() => types(root));
    const ruled = yield* Effect.sync(() => rules(root, model.value));
    const drifted = yield* drift(root, model.value);
    const ratchets = ratchet(ruled.errors, ratchetsOf(root));
    const warnings = ruled.warnings.map((f) => `  warning: ${f.file}:${f.line}  ${f.message}`);
    const passed = left.length === 0 && typed.length === 0 && ratchets.over.length === 0 && drifted.length === 0;
    return {
      lines: [...blankLines(left), ...part("types", typed), ...part("rules", ratchets.over), ...warnings, ...part("drift", drifted), ...ratchets.lines, passed ? "check ✔" : "check ✘"],
      passed,
    };
  });

export const Check: CheckApi = { blanks, report: (all) => ({ lines: blankLines(all), passed: all.length === 0 }), run };
