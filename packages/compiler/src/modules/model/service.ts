import { Effect } from "effect";
import { ErrorNames, EventNames } from "orthograph/server";
import { BlueprintSource } from "#modules/source/types.js";
import { BlueprintInvalid, type CompilerApi, type Model, type MountModel } from "./types.ts";
import { hashOf } from "./internal/hash.ts";
import { describe } from "./internal/describe.ts";
import { readLayout } from "./internal/layout.ts";
import { Mounts } from "#modules/mounts/service.js";

export const Compiler: CompilerApi = {
  model: Effect.gen(function* () {
    const source = yield* BlueprintSource;
    const paths = yield* source.list;
    const files = yield* Effect.forEach(paths, source.load);
    const layout = readLayout(files);
    // Each mount's plugin, folded in: its things beside the project's own, under the names the mount gives them.
    const folded = yield* Mounts.fold(layout);
    // An app folder of verbs with no thing.ts adds operations to a plugin's thing: they join it, and are the app's.
    // It finds the thing by the thing its operations are declared on, so a plugin mounted under an alias is found as well.
    for (const [folder, own] of [...layout.things]) {
      if (own.thing) continue;
      const declaredOn = [...own.verbs.values()][0]?.declaration.thing;
      const found = declaredOn === undefined ? undefined : [...folded.things].find(([, x]) => x.thing === declaredOn);
      if (!found) continue;
      const [name, t] = found;
      for (const [verb, v] of own.verbs) {
        const taken = t.verbs.get(verb);
        // One operation has one declaration: the app may not add a verb the thing already has, from its plugin or another folder.
        if (taken) layout.problems.push(`${v.file}: adds ${name}.${verb}, which ${name} already has (${taken.file}): name the operation another verb`);
        else t.verbs.set(verb, { ...v, from: { kind: "app" } });
      }
      const at = layout.problems.indexOf(`${own.base}: has no thing.ts`);
      if (at >= 0) layout.problems.splice(at, 1);
      layout.things.delete(folder);
    }
    for (const [name, t] of folded.things) layout.things.set(name, t);
    for (const [n, a] of folded.agents) {
      const mine = layout.agents.get(n);
      if (mine) layout.problems.push(`${mine.file}: the app's agent ${n} has the name of the one ${a.mount} brings (${a.file}): an agent is named by its file`);
      else layout.agents.set(n, a);
    }
    for (const [n, s] of folded.sources) {
      const mine = layout.sources.get(n);
      if (mine) layout.problems.push(`${mine.file}: the app's source ${n} has the name of the one ${s.mount} brings (${s.file}): a source is named by its file`);
      else layout.sources.set(n, s);
    }
    for (const [call, reach] of folded.calls) layout.calls.set(call, reach);
    for (const [file, journey] of folded.journeys) layout.journeys.set(file, journey);
    for (const [name, s] of folded.stores) layout.stores.set(name, s);
    layout.problems.push(...folded.problems);
    // Errors take their names from their exports; stamping them here lets the loaded classes be used by name.
    for (const t of layout.things.values()) for (const [name, cls] of t.errors) ErrorNames.name(cls, name);
    for (const t of layout.things.values()) for (const [name, event] of t.events) EventNames.name(event, name);
    const { model, problems } = describe(layout, folded.mounts);
    if (problems.length > 0) return yield* new BlueprintInvalid({ problems: Mounts.attributed(problems, folded.mounts) });
    return Object.keys(folded.mounts).length > 0 ? { ...narrowed(model, folded.mounts), mounts: folded.mounts } : model;
  }),
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
