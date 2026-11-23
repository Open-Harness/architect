// What a change means on a chain (M6-chain items 2 and 11, M6-money item 5): a row on chain is what its states' numbers and
// its amounts say, so moving a thing there, renumbering its states, or changing what an amount counts breaks every old row.
import type { FieldsModel, Model, ThingModel } from "#modules/model/types.js";
import { canonical } from "#modules/model/service.js";
import type { Versioned } from "../types.ts";

const onChain = (model: Model, t: ThingModel): boolean => t.store !== undefined && model.stores?.[t.store]?.kind === "chain.evm";

/** Each field of a thing by place (`fields.limit`, `events.Spent.amount`, `errors.Exceeded.remaining`), with its value as recorded. */
const valuesOf = (t: ThingModel): ReadonlyMap<string, string> => {
  const at = (place: string, fields: FieldsModel) => Object.entries(fields).map(([k, f]) => [`${place}.${k}`, canonical(f.value)] as const);
  return new Map([
    ...at("fields", t.fields),
    ...Object.entries(t.events).flatMap(([e, f]) => at(`events.${e}`, f)),
    ...Object.entries(t.errors).flatMap(([e, x]) => at(`errors.${e}`, x.fields)),
  ]);
};

/** The bumps a change to one thing makes beyond a patch: its place, the numbers of its states on chain, and what its amounts count. */
export const thingBumps = (name: string, before: Model, after: Model): ReadonlyArray<Versioned> => {
  const [was, now] = [before.things[name], after.things[name]];
  if (!was || !now) return [];
  const [wasChain, nowChain] = [onChain(before, was), onChain(after, now)];
  const what = `thing:${name}`;
  if (wasChain !== nowChain) return [{ kind: "changed", what, detail: nowChain ? "moved to a chain store" : "moved off a chain store", bump: "major" }];
  const out: Array<Versioned> = [];
  if (wasChain) {
    const [a, b] = [was.stateNumbers ?? {}, now.stateNumbers ?? {}];
    const moved = Object.entries(a).filter(([s, n]) => b[s] !== n).map(([s]) => s);
    const added = Object.keys(b).filter((s) => !(s in a));
    if (moved.length > 0) out.push({ kind: "changed", what, detail: `states renumbered or removed: ${moved.join(", ")}`, bump: "major" });
    else if (added.length > 0) out.push({ kind: "changed", what, detail: `states added at the end: ${added.join(", ")}`, bump: "minor" });
  }
  // An amount that counts another asset, has other bits or another sign, or that stops or starts being money, means another number to every old reader.
  const [a, b] = [valuesOf(was), valuesOf(now)];
  const counted = [...a].filter(([place, v]) => b.has(place) && b.get(place) !== v && (v.includes('"money"') || b.get(place)!.includes('"money"'))).map(([place]) => place);
  if (counted.length > 0) out.push({ kind: "changed", what, detail: `what an amount counts changed: ${counted.join(", ")}`, bump: "major" });
  return out;
};
