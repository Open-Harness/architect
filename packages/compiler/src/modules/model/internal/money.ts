// Money in the model (M6-money items 1 and 2): an amount's asset resolved to names, and what the compiler refuses about it.
import type { Asset, Field, Thing, Value, ValueMeta as Declared } from "orthograph";
import type { MoneyAssetModel, ValueMeta } from "../types.ts";
import { pascal } from "./layout.ts";

/** The thing a declaration belongs to: its fields, its operations, and the events and errors under its folder. */
export interface Owner {
  readonly name: string;
  readonly thing: Thing;
}

export interface Names {
  /** Each asset by the file name it has: `usdc` for `blueprint/assets/usdc.ts`. */
  readonly assets: ReadonlyMap<Asset, string>;
  readonly things: ReadonlyMap<Thing, string>;
}

const fieldOf = (owner: Owner, holder: Field | Value, where: string, problems: Array<string>): string | undefined => {
  const mine = Object.entries(owner.thing.fields);
  const said = `${where}: money.of`;
  let key: string | undefined;
  if (holder.kind === "field") {
    if (holder.of === owner.thing) key = holder.key;
    else problems.push(`${said} counts the asset of a field of another thing (${holder.key}): an amount counts the asset of a field of the same thing, ${owner.name}, so a money field reused from another thing can't be used here`);
  } else {
    const keys = mine.filter(([, f]) => f.value === holder).map(([k]) => k);
    if (keys.length === 0) problems.push(`${said} counts the asset of a value that is in none of ${owner.name}'s fields: take it from one, as ${pascal(owner.name)}.fields.<field>, or put the value in one`);
    else if (keys.length > 1) problems.push(`${said} counts the asset of a value that is in ${keys.length} of ${owner.name}'s fields (${keys.join(", ")}): name one of them with ${pascal(owner.name)}.fields.<field>`);
    else key = keys[0];
  }
  if (key !== undefined && owner.thing.fields[key]?.value.meta.type !== "account") {
    problems.push(`${said} counts the asset held by ${owner.name}.${key}, which holds no asset: only an account() field does, read as a token contract`);
    return undefined;
  }
  return key;
};

/**
 * A value's meta as the model records it. A money value's asset is a live reference, so it is resolved to a name here:
 * the asset file's, or the field of the owning thing. A reference that can't be resolved is a problem naming `where`.
 */
export const metaOf = (meta: Declared, where: string, owner: Owner | undefined, names: Names, problems: Array<string>): ValueMeta => {
  if (meta.type !== "money") return meta;
  const { bits, signed, asset } = meta;
  const resolved = ((): MoneyAssetModel => {
    if (asset.kind === "fixed") {
      const name = names.assets.get(asset.asset);
      if (name === undefined) problems.push(`${where}: money of an asset that is not the default export of a blueprint/assets/<name>.ts: declare it there`);
      return asset.asset.of === "token" ? { token: name ?? "?" } : { currency: name ?? "?" };
    }
    if (owner === undefined) {
      problems.push(`${where}: money.of is written outside any thing: an amount counts the asset of a field of the thing whose fields, operations, events or errors it is in`);
      return { field: "?" };
    }
    return { field: fieldOf(owner, asset.of, where, problems) ?? "?" };
  })();
  return { type: "money", bits, signed, asset: resolved };
};
