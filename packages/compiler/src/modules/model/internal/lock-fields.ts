// What the lock records of a refusal's fields: each value as its kind and what the kind needs (M6-chain item 4, M6-money item 5).
import type { LockValue } from "#modules/lock/types.js";
import type { FieldsModel, ValueMeta } from "../types.ts";

const valueOf = (meta: ValueMeta): LockValue => {
  switch (meta.type) {
    case "uint": return { value: "uint", bits: meta.bits };
    case "id": return { value: "id", prefix: meta.prefix };
    case "text": return { value: "text", max: meta.max };
    case "account": return { value: "account" };
    case "money": return { value: "money", bits: meta.bits, signed: meta.signed, asset: meta.asset };
    // Its own kind, though it travels as ISO text: a field moving between an instant and text changes what clients parse.
    case "instant": return { value: "instant" };
    case "schema": return { value: "schema" };
  }
};

export const lockFields = (fields: FieldsModel): Readonly<Record<string, LockValue>> =>
  Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, valueOf(f.value)]));
