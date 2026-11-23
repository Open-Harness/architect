// Assets in the model (M6-money item 2): each named by its file, refused where it is declared when it is wrong, and which fixed tokens a chain store counts.
import { placesOf } from "orthograph/server";
import type { AssetModel, FieldsModel, OperationModel, ThingModel } from "../types.ts";
import type { Layout } from "./layout.ts";

const MAX_DECIMALS = 255;

export const assetsOf = (layout: Layout, problems: Array<string>): Readonly<Record<string, AssetModel>> =>
  Object.fromEntries([...layout.assets].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([name, { file, asset }]): [string, AssetModel] => {
    if (asset.of === "currency") {
      const places = placesOf(asset.code);
      if (places === undefined) problems.push(`${file}: ${JSON.stringify(asset.code)} is an unknown currency code: use an ISO 4217 code in capitals, such as EUR`);
      return [name, { name, file, kind: "currency", code: asset.code, decimals: places ?? 0 }];
    }
    if (typeof asset.symbol !== "string" || asset.symbol === "") problems.push(`${file}: a token asset needs a symbol, such as "USDC"`);
    if (!Number.isInteger(asset.decimals) || asset.decimals < 0 || asset.decimals > MAX_DECIMALS) problems.push(`${file}: a token asset's decimals is a whole number from 0 to ${MAX_DECIMALS}, as the token's own decimals() says`);
    return [name, { name, file, kind: "token", symbol: asset.symbol, decimals: asset.decimals }];
  }));

const fixedTokens = (fields: FieldsModel): ReadonlyArray<string> =>
  Object.values(fields).flatMap((f) => (f.value.type === "money" && "token" in f.value.asset ? [f.value.asset.token] : []));

/** For each chain store, the fixed token assets its things count in their fields, events, errors and operations. */
export const tokensUsed = (things: Readonly<Record<string, ThingModel>>, operations: Readonly<Record<string, OperationModel>>): ReadonlyMap<string, ReadonlySet<string>> => {
  const used = new Map<string, Set<string>>();
  const note = (store: string | undefined, tokens: ReadonlyArray<string>) => {
    if (store === undefined || tokens.length === 0) return;
    used.set(store, new Set([...(used.get(store) ?? []), ...tokens]));
  };
  for (const t of Object.values(things)) note(t.store, [...fixedTokens(t.fields), ...Object.values(t.events).flatMap(fixedTokens), ...Object.values(t.errors).flatMap((e) => fixedTokens(e.fields))]);
  for (const op of Object.values(operations)) note(things[op.thing]?.store, [...fixedTokens(op.payload), ...fixedTokens(op.answer)]);
  return used;
};
