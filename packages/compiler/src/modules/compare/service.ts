import type { Model, OperationModel } from "#modules/model/types.js";
import type { CompareApi, Depends } from "./types.ts";
import { diff } from "./internal/diff.ts";
import { next, release } from "./internal/versions.ts";

/** The mounts an operation calls out through, in name order. */
const callsOf = (op: OperationModel): ReadonlyArray<string> => [...new Set(Object.values(op.steps).flatMap((s) => (s.call ? [s.call.mount] : [])))].sort();

const dependsOn = (model: Model, name: string): Depends => {
  const op = model.operations[name];
  if (!op) return {};
  const thingOf = (ref: string | undefined) => (ref ? [ref.split(".")[0]!] : []);
  const fields = [...Object.values(op.payload), ...Object.values(op.answer), ...Object.values(model.things[op.thing]?.fields ?? {})];
  const roles = op.allowed.flatMap((a) => ("role" in a ? thingOf(a.role) : []));
  const things = [...new Set([op.thing, ...fields.flatMap((f) => thingOf(f.ref)), ...roles])].sort();
  // A plugin's operation rests on its mount: the picks, the verbs and the installed package's bytes (M1-plugins section 7).
  // Stored models from before M1.03 may have no discriminator.
  const from = op.from?.kind === "app" ? undefined : op.from;
  const mount = from ? model.mounts?.[from.mount] : undefined;
  // An operation that calls an adapter rests on that mount too: its picks and its installed bytes (section 9).
  const reached = callsOf(op).flatMap((m) => (model.mounts?.[m] ? [[`${model.mounts[m]!.kind}:${m}`, model.mounts[m]!.hash] as const] : []));
  return {
    [`operation:${name}`]: op.hash,
    ...Object.fromEntries(things.flatMap((t) => (model.things[t] ? [[`thing:${t}`, model.things[t]!.hash]] : []))),
    ...(mount && from ? { [`${mount.kind}:${from.mount}`]: mount.hash } : {}),
    ...Object.fromEntries(reached),
  };
};

const hashOf = (model: Model, key: string): string | undefined => {
  const [kind, name] = key.split(/:(.*)/s) as [string, string];
  if (kind === "operation") return model.operations[name]?.hash;
  if (kind === "thing") return model.things[name]?.hash;
  const mount = model.mounts?.[name];
  return mount && mount.kind === kind ? mount.hash : undefined;
};

const edges = (model: Model): ReadonlyArray<string> => {
  const lines = Object.entries(model.mounts ?? {}).flatMap(([name, m]) => [
    ...Object.values(model.operations).filter((op) => op.from?.kind !== "app" && op.from?.mount === name).map((op) => `${m.kind}:${name} -> ${op.name}  provides`),
    ...(m.needs ?? []).map((need) => `${m.kind}:${name} -> ${need}  needs`),
    ...Object.values(model.operations).filter((op) => callsOf(op).includes(name)).map((op) => `${m.kind}:${name} -> ${op.name}  used-by`),
  ]);
  return [...new Set(lines)].sort();
};

export const Compare: CompareApi = { models: diff, release, next, dependsOn, hashOf, edges };
