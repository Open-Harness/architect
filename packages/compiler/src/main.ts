#!/usr/bin/env node
// `ortho-model <project-root>`: the model as JSON on stdout. Generators run this in a fresh process, so a
// long-lived Nx daemon never reads a blueprint file it imported before an edit. With `--locked`, the output is
// `{ "model": …, "lock": "…" }`: the model and the text `blueprint/refusals.lock` must have for it (M6-chain item 4).
import { Effect } from "effect";
import { Compiler } from "#modules/model/service.js";
import { nodeSource } from "#modules/source/service.js";

const args = process.argv.slice(2);
const root = args.find((a) => !a.startsWith("--")) ?? process.cwd();
const asked = args.includes("--locked") ? Effect.map(Compiler.locked, (c) => JSON.stringify(c)) : Effect.map(Compiler.model, (m) => JSON.stringify(m, null, 2) + "\n");
const result = await Effect.runPromise(Effect.result(Effect.provide(asked, nodeSource(root))));
if (result._tag === "Success") process.stdout.write(result.success);
else {
  const e = result.failure;
  process.stderr.write(e._tag === "BlueprintInvalid" ? e.problems.map((p) => `${p}\n`).join("") : `${e.message}\n`);
  process.exitCode = 2;
}
