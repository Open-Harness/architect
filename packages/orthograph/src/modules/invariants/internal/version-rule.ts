// The rule a thing with versions (K40 fix 2) holds without declaring it: one row per revision of a key, so two first saves made at once
// cannot both be revision 1. The compiler adds it to the model, the store enforces it with an index, and `Versions` hands it to the runtime.
import type { Thing } from "#modules/things/types.js";
import type { Unique } from "../types.ts";
import { makeUnique } from "./unique.ts";

/** The rule's name, as a thing's own `invariants.ts` would export it. */
export const VERSION_RULE = "oneVersionPerRevision";

/**
 * The rule of a thing with versions and a `revision` field, or undefined for any other. Its key is the versions key and the revision; a thing
 * keyed by its own id (the app's one Settings) has one row per revision whatever the id.
 */
export const versionRule = (thing: Thing): Unique | undefined => {
  const key = thing.versions?.key;
  const revision = thing.fields["revision"];
  if (key === undefined || revision === undefined) return undefined;
  const own = thing.fields[key];
  return makeUnique(key === "id" || own === undefined ? [revision] : [own, revision]);
};
