// The four operations of a thing with versions (K40 fix 2) are the framework's: served from the thing's declaration, with no handler file.
import type { Model, OperationModel } from "@orthograph/compiler";

/** The verbs of the four operations a thing with versions has. */
const VERSION_VERBS = ["save", "get", "history", "restore"];

/** Is this one of the four: its verb is one of them, and its thing's key is a field of its payload? */
export const versioned = (model: Model, o: OperationModel): boolean => {
  const versions = model.things[o.thing]?.versions;
  return o.kind === "operation" && VERSION_VERBS.includes(o.verb) && versions !== undefined && Object.keys(o.payload).includes(versions.key);
};

/** The refusal a stale save answers with, when the operation declares it. */
export const staleOf = (o: OperationModel): string => (o.errors.includes("StaleRevision") ? "Errors.declared.StaleRevision" : "undefined");
