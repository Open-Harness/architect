// What a change to a declared asset means for the version (M6-chain item 2): a row's amounts are what it means for good, so an asset
// that a money field counts, changed or gone, is another number to every old reader. One nothing counts moves nothing.
import { canonical } from "#modules/model/service.js";
import type { AssetModel, Model } from "#modules/model/types.js";
import type { Versioned } from "../types.ts";

/** Every asset name a money field counts, wherever it sits in the things and operations (`{ asset: { token: "usdc" } }`). */
const referenced = (x: unknown, into: Set<string> = new Set()): ReadonlySet<string> => {
  if (Array.isArray(x)) x.forEach((v) => referenced(v, into));
  else if (typeof x === "object" && x !== null) {
    const o = x as Record<string, unknown>;
    const asset = o["type"] === "money" ? o["asset"] : undefined;
    for (const k of ["token", "currency"]) if (typeof (asset as Record<string, unknown> | undefined)?.[k] === "string") into.add((asset as Record<string, string>)[k]!);
    Object.values(o).forEach((v) => referenced(v, into));
  }
  return into;
};

/** The parts of a definition that differ, `code EUR to JPY`; the file says where it lives, not what it is. */
const detailOf = (a: AssetModel, b: AssetModel): string | undefined => {
  const [x, y] = [a as unknown as Record<string, unknown>, b as unknown as Record<string, unknown>];
  const said = [...new Set([...Object.keys(x), ...Object.keys(y)])].filter((k) => k !== "file" && k !== "name" && canonical(x[k]) !== canonical(y[k]))
    .sort().map((k) => `${k} ${x[k] === undefined ? "added" : y[k] === undefined ? "removed" : `${canonical(x[k])} to ${canonical(y[k])}`}`);
  return said.length > 0 ? said.join(", ") : undefined;
};

/** Each asset that was added, removed or changed: major when a money field of `before` counts it and it changed or went, else a patch. */
export const assetBumps = (before: Model, after: Model): ReadonlyArray<Versioned> => {
  const [a, b] = [before.assets ?? {}, after.assets ?? {}];
  const counted = referenced([before.things, before.operations]);
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().flatMap((name): ReadonlyArray<Versioned> => {
    const what = `asset:${name}`;
    const [was, now] = [a[name], b[name]];
    if (!was) return [{ kind: "added", what, bump: "patch" }];
    const bump = counted.has(name) ? "major" : "patch";
    if (!now) return [{ kind: "removed", what, bump }];
    const detail = detailOf(was, now);
    return detail === undefined ? [] : [{ kind: "changed", what, detail, bump }];
  });
};
