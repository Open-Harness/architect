// The smaller framework forms in the model: agents and their slots, declared instances, and what can fail beside a thing.
import type { Event, Field, Thing } from "orthograph";
import type { MountModel, ThingModel } from "../types.ts";
import { holdsModel } from "./holds.ts";
import type { Layout } from "./layout.ts";
import { sourceNameOf, sourcesModel } from "./sources.ts";

export interface FormContext {
  readonly layout: Layout;
  readonly thingNames: ReadonlyMap<Thing, string>;
  readonly problems: Array<string>;
}

const fieldName = (ctx: FormContext, f: Field) => `${ctx.thingNames.get(f.of) ?? "?"}.${f.key}`;

/** `agents.<name>`: its file, and its slots as `{ size, reserve, held }` when it holds a seat. */
export const agentsModel = (ctx: FormContext) =>
  Object.fromEntries([...ctx.layout.agents].sort(([a], [b]) => a.localeCompare(b)).map(([name, { file, declaration: a }]) => {
    const slots = a.slots;
    if (slots !== undefined && !(slots.size.key in slots.size.of.fields)) ctx.problems.push(`${file}: slots.size is not a field of its thing`);
    if (slots !== undefined && (!Number.isInteger(slots.reserve) || slots.reserve < 0)) ctx.problems.push(`${file}: slots.reserve must be a whole number, 0 or more`);
    return [name, {
      file,
      ...(slots === undefined ? {} : { slots: { size: fieldName(ctx, slots.size), reserve: slots.reserve, held: ctx.thingNames.get(slots.held) ?? "?" } }),
    }];
  }));

/** What a declared value is in the model: plain data, a connection by the name of its source. */
const plain = (ctx: FormContext, file: string, x: unknown): unknown => {
  if (Array.isArray(x)) return x.map((i) => plain(ctx, file, i));
  if (typeof x === "object" && x !== null) {
    const o = x as { readonly kind?: unknown; readonly source?: unknown; readonly config?: unknown };
    if (o.kind === "connection") {
      const source = sourceNameOf(ctx.layout, o.source as never);
      if (source === undefined) ctx.problems.push(`${file}: lists a connection of a source that is not a file of a plugin's blueprint/sources/`);
      return { source: source ?? "?", config: plain(ctx, file, o.config) };
    }
    return Object.fromEntries(Object.entries(x).filter(([, v]) => typeof v !== "function").map(([k, v]) => [k, plain(ctx, file, v)]));
  }
  return typeof x === "bigint" ? x.toString() : x;
};

/** `declared.<things>`: every `Blueprint.declare` file of the app, by its thing's plural. */
export const declaredModel = (ctx: FormContext) => {
  const out: Record<string, Array<unknown>> = {};
  for (const [, { file, declaration }] of [...ctx.layout.declared].sort(([a], [b]) => a.localeCompare(b))) {
    const key = `${ctx.thingNames.get(declaration.thing) ?? "?"}s`;
    (out[key] ??= []).push({ file, ...(plain(ctx, file, declaration.values) as object) });
  }
  return out;
};

/** `problems`: each `Blueprint.problem`, the fields it names by name, and when it shows. */
export const problemsModel = (ctx: FormContext) =>
  [...ctx.layout.things].flatMap(([thing, t]) => (t.problem === undefined ? [] : [(() => {
    const p = t.problem.declaration;
    return { kind: p.of, thing, of: p.points.key, name: p.name.key, failures: p.failures.key, after: typeof p.after === "number" ? p.after : p.after.key };
  })()])).sort((a, b) => a.kind.localeCompare(b.kind));

export interface FormsContext extends FormContext {
  readonly mounts: Readonly<Record<string, MountModel>>;
  readonly things: Readonly<Record<string, ThingModel>>;
  readonly eventNames: ReadonlyMap<Event, string>;
  readonly opName: (declaration: unknown) => string | undefined;
}

/** What the new forms add to the model, each key only when the blueprint uses it: agents, sources, holds, problems and declared. */
export const formsOf = (c: FormsContext) => {
  const some = <V extends object>(key: string, value: V) => (Object.keys(value).length > 0 ? { [key]: value } : {});
  const problems = problemsModel(c);
  return {
    ...some("agents", agentsModel(c)), ...some("sources", sourcesModel(c)), ...some("holds", holdsModel(c)),
    ...(problems.length > 0 ? { problems } : {}), ...some("declared", declaredModel(c)),
  };
};
