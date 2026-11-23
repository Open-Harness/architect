// SQL that reads the database's own clock: the world's clock must be the only one (K23 section 6, M8.06), so a time is
// passed to the database as a parameter and never asked of it. The spellings are `now()`, `CURRENT_TIMESTAMP` and
// `datetime('now')` (and `CURRENT_DATE`, `CURRENT_TIME`, `date('now')`, which SQLite reads the same way).
import type { Node } from "../types.ts";

const ALWAYS = /\bcurrent_(timestamp|date|time)\b|\b(datetime|date|time|julianday|strftime)\s*\([^)]*['"]now['"]/i;
// `now()` is a word of prose and of other APIs too: it counts only inside text that reads as SQL.
const NOW = /\bnow\s*\(\s*\)/i;
const SQL = /\b(select|insert|update|delete|values|where|default|create\s+table|alter\s+table|returning)\b/i;

/** What in this string reads the database's clock, or nothing. */
export const sqlClockRead = (text: string): string | undefined => {
  const always = ALWAYS.exec(text);
  if (always) return always[0].trim();
  return NOW.test(text) && SQL.test(text) ? "now()" : undefined;
};

/** The text of a string literal or a template's piece, when the node is one. */
const textOf = (node: Node): string | undefined => {
  if (typeof node["value"] === "string") return node["value"];
  const value = node["value"] as { readonly raw?: unknown } | undefined;
  return typeof value?.raw === "string" ? value.raw : undefined;
};

/** The report for a string literal or a template's piece that reads the database's clock; nothing for any other node. */
export const sqlClockMessage = (node: Node): string | undefined => {
  const text = textOf(node);
  const read = text === undefined ? undefined : sqlClockRead(text);
  return read === undefined ? undefined : `${read} reads the database's clock, not the world's: pass the time as a parameter, from Clock`;
};
