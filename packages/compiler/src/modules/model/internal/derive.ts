// A derived read's part of the model (GOAL17-derived-reads): its looks, what it adds, the hash of its function, and the five refusals.
import type { Derive, Field, Thing } from "orthograph";
import type { FieldsModel } from "../types.ts";
import { hashOf } from "./hash.ts";

/** Whether a field holds `root`'s id: followed back through the fields it was taken from, as the runtime's role check does. */
const holdsIdOf = (field: Field, root: Thing): boolean => {
  for (let f: Field | undefined = field; f; f = f.from) if (f.key === "id") return f.of === root;
  return false;
};

export interface DeriveContext {
  readonly thingNames: ReadonlyMap<Thing, string>;
  readonly problems: Array<string>;
}

export const deriveModel = (derive: Derive, file: string, adds: FieldsModel, ctx: DeriveContext) => {
  const root = ctx.thingNames.get(derive.root) ?? "?";
  const looks = Object.fromEntries(Object.entries(derive.looks).map(([name, look]) => {
    if (look.kind === "problems") return [name, { kind: "problems" as const }];
    const thing = ctx.thingNames.get(look.thing) ?? "?";
    if (!holdsIdOf(look.by, derive.root)) ctx.problems.push(`${file}: look ${name} follows ${thing}.${look.by.key}, which does not hold ${root}'s id: a look's \`by\` is a field taken from ${root}.fields.id`);
    if (look.thing.lives === "actor") ctx.problems.push(`${file}: look ${name} looks at ${thing}, which lives as actors: a look reads rows, and an actor has none to list`);
    if (!Number.isInteger(look.max) || look.max < 1 || look.max > 100) ctx.problems.push(`${file}: look ${name}: max ${look.max} is outside 1 to 100`);
    return [name, {
      thing, by: look.by.key, ...(look.state === undefined ? {} : { state: look.state }), ...(look.where === undefined ? {} : { where: look.where }),
      take: look.take, max: look.max,
    }];
  }));
  for (const name of Object.keys(derive.adds)) {
    if (name in derive.root.fields) ctx.problems.push(`${file}: derive adds ${name}, which is a stored field of ${root}: a derived field has a name of its own`);
  }
  return { looks, adds, hash: hashOf({ looks, is: derive.is.toString() }) };
};
