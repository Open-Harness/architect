import { Effect } from "effect";
import { ErrorNames, EventNames } from "orthograph/server";
import { BlueprintSource } from "#modules/source/types.js";
import { RefusalLock } from "#modules/lock/service.js";
import { BlueprintInvalid, type CompilerApi, type Model, type MountModel } from "./types.ts";
import { hashOf } from "./internal/hash.ts";
import { describe } from "./internal/describe.ts";
import { readLayout } from "./internal/layout.ts";
import { Mounts } from "#modules/mounts/service.js";

const locked: CompilerApi["locked"] = Effect.gen(function* () {
  const source = yield* BlueprintSource;
  const paths = yield* source.list;
  const files = yield* Effect.forEach(paths, source.load);
  const layout = readLayout(files);
  // Each mount's plugin, folded in: its things beside the project's own, under the names the mount gives them.
  const folded = yield* Mounts.fold(layout);
  for (const [name, t] of folded.things) layout.things.set(name, t);
  for (const [call, reach] of folded.calls) layout.calls.set(call, reach);
  for (const [file, journey] of folded.journeys) layout.journeys.set(file, journey);
  for (const [name, s] of folded.stores) layout.stores.set(name, s);
  layout.problems.push(...folded.problems);
  // Errors take their names from their exports; stamping them here lets the loaded classes be used by name.
  for (const t of layout.things.values()) for (const [name, cls] of t.errors) ErrorNames.name(cls, name);
  for (const t of layout.things.values()) for (const [name, event] of t.events) EventNames.name(event, name);
  // The codes come from the lock the project keeps (M6-chain item 4): a name keeps its code, a new name takes the next number.
  const text = source.lock === undefined ? undefined : yield* source.lock;
  const before = yield* RefusalLock.parse(text).pipe(Effect.mapError((e) => new BlueprintInvalid({ problems: [`blueprint/refusals.lock: ${e.message}`] })));
  const { model, problems, lock } = describe(layout, before);
  if (problems.length > 0) return yield* new BlueprintInvalid({ problems: Mounts.attributed(problems, folded.mounts) });
  return { model: Object.keys(folded.mounts).length > 0 ? { ...narrowed(model, folded.mounts), mounts: folded.mounts } : model, lock: RefusalLock.text(lock) };
});

export const Compiler: CompilerApi = {
  model: Effect.map(locked, (c) => c.model),
  locked,
};

/** An operation a mount narrowed keeps only the ways in named: `via` on it, in its hash; it is an agent's tool only while `agent` is kept. */
const narrowed = (model: Model, mounts: Readonly<Record<string, MountModel>>): Model => {
  const operations = { ...model.operations };
  for (const m of Object.values(mounts)) {
    for (const [name, via] of Object.entries(m.narrowed ?? {})) {
      const op = operations[name];
      if (!op) continue;
      const { hash: _, ...entry } = op;
      const agentTool = entry.agentTool && via.includes("agent");
      operations[name] = { ...entry, agentTool, via, hash: hashOf({ ...entry, agentTool, via }) };
    }
  }
  return { ...model, operations };
};

export { canonical } from "./internal/hash.ts";
export { DEVICE_HOSTS, handlerFiles, type HandlerFile } from "./internal/handler-files.ts";
