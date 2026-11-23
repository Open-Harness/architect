import type { Incoming, Json } from "../types.ts";

const EVAL = /evl_[0-9a-z]+/g;

/**
 * The words a scripted turn's arguments may use for what only the request knows (GOAL17-stage-one, call 11): `"$eval"` is the id of the eval its
 * request was told (the last the messages name), and `"$ticket"` the id of the ticket the answering agent is about (`ticket/<id>`).
 */
export const fill = (value: Json, incoming: Incoming): Json => {
  if (value === "$eval") return incoming.text.match(EVAL)?.at(-1) ?? value;
  if (value === "$ticket") return incoming.about?.startsWith("ticket/") ? incoming.about.slice("ticket/".length) : value;
  if (Array.isArray(value)) return value.map((v) => fill(v, incoming));
  if (typeof value === "object" && value !== null) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v, incoming)]));
  return value;
};
