// A rule's index refusing a commit (G5): D1 words it `UNIQUE constraint failed: <table>.<column>[, <table>.<column>]`, naming the key's columns and never the index.
// The table is the generated one, hyphens and all (`user-handle`). Only a column this commit's things have a rule over counts, so any other constraint failure stays a defect.
import type { NamedRule, Write } from "@orthograph/language-effect";

/** The columns a thing's rules are over: each declared rule's key (from the model's invariants). */
const columnsOf = (thing: Write["thing"], table: string, rules: ReadonlyArray<NamedRule>) => [
  ...rules.filter(({ rule }) => rule.fields[0].of === thing).flatMap(({ rule }) => rule.fields.map((f) => f.key)),
].map((field) => `${table}.${field}`);

/** Did this failure come from the unique index of a rule over one of these writes' things? */
export const lostUnique = (error: unknown, writes: ReadonlyArray<Write>, tableOf: (thing: Write["thing"]) => string, rules: ReadonlyArray<NamedRule> = []): boolean => {
  const columns = new Set(writes.flatMap((w) => columnsOf(w.thing, tableOf(w.thing), rules)));
  if (columns.size === 0) return false;
  for (let e: unknown = error, depth = 0; e !== undefined && e !== null && depth < 8; e = (e as { cause?: unknown }).cause, depth++) {
    const message = String((e as { message?: unknown }).message ?? e);
    const failed = /UNIQUE constraint failed: ([^:]+)/.exec(message)?.[1];
    if (failed && failed.split(",").some((c) => columns.has(c.trim().replaceAll('"', "")))) return true;
  }
  return false;
};
