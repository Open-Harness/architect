// The four operations of a thing with versions (K40 fix 2) are the framework's: served from the thing's declaration, with no handler file.
import type { Model, OperationModel, ThingModel } from "@orthograph/compiler";

/** The verbs of the four operations a thing with versions has. */
const VERSION_VERBS = ["save", "get", "history", "restore"];

/** Is this one of the four: its verb is one of them, and its thing's key is a field of its payload? */
export const versioned = (model: Model, o: OperationModel): boolean => {
  const versions = model.things[o.thing]?.versions;
  return o.kind === "operation" && VERSION_VERBS.includes(o.verb) && versions !== undefined && Object.keys(o.payload).includes(versions.key);
};

/**
 * The things with rules, told apart by where a rule comes from. The framework holds one rule for a thing with versions (one row per
 * revision of a key) that no `invariants.ts` declares: the runtime makes it (`Versions.rulesOf`). The others are read from their files.
 */
export const rulesByOrigin = (ruled: ReadonlyArray<ThingModel>) => ({
  declaredRules: ruled.filter((t) => Object.values(t.invariants ?? {}).some((r) => r.framework !== true)),
  versionedRules: ruled.filter((t) => Object.values(t.invariants ?? {}).some((r) => r.framework === true)),
});

/** The refusal a stale save or restore answers with, as the model names it; a get or a history has none. */
export const staleOf = (o: OperationModel): string => (o.stale === undefined ? "undefined" : `Errors.declared.${o.stale}`);
