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
    // An instant travels as 24 characters of ISO text, so the lock records it as that text.
    case "instant": return { value: "text", max: 24 };
    case "schema": return { value: "schema" };
  }
};

export const lockFields = (fields: FieldsModel): Readonly<Record<string, LockValue>> =>
  Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, valueOf(f.value)]));
