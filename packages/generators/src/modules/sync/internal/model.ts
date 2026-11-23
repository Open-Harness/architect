import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Effect } from "effect";
import type { Model } from "@orthograph/compiler";
import { ModelFailed } from "../types.ts";

const compiler = fileURLToPath(import.meta.resolve("@orthograph/compiler/main"));

/** The model and the text `blueprint/refusals.lock` must have, from a fresh process: a long-lived Nx daemon would otherwise keep blueprint files it imported earlier. */
export const modelOf = (absoluteRoot: string, root: string): Effect.Effect<{ readonly model: Model; readonly lock: string }, ModelFailed> =>
  Effect.try({
    try: () => JSON.parse(execFileSync(process.execPath, [compiler, absoluteRoot, "--locked"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 })) as { model: Model; lock: string },
    catch: (e) => new ModelFailed({ root, problems: String((e as { readonly stderr?: unknown }).stderr ?? e) }),
  });
