// A feature mount's omit and narrow: each names one of the plugin's own operations, matched by identity.
import type { Mount, Operation, Read } from "orthograph";
import type { Layout, ThingFiles } from "#modules/model/internal/layout.js";

/** The name an operation goes by in `layout`, when it is there. */
const nameIn = (layout: Layout, op: unknown): string | undefined => {
  for (const t of layout.things.values()) for (const [verb, v] of t.verbs) if (v.declaration === op) return `${t.name}.${verb}`;
  return undefined;
};

/**
 * Apply a feature mount's `omit` and `narrow` to its renamed things: an omitted operation leaves them; a narrowed one
 * keeps the ways in named. `app` names an operation that isn't the plugin's, for the message.
 */
export const applyVerbs = (file: string, pkg: string, mount: Mount, things: ReadonlyArray<ThingFiles>, app: Layout) => {
  const problems: Array<string> = [];
  const omitted: Array<string> = [];
  const narrowed: Record<string, ReadonlyArray<string>> = {};
  const owner = (op: Operation | Read) => {
    for (const t of things) for (const [verb, v] of t.verbs) if (v.declaration === op) return { t, verb, name: `${t.name}.${verb}` };
    return undefined;
  };
  for (const v of mount.verbs) {
    if (v.verb !== "omit" && v.verb !== "narrow") continue;
    const found = owner(v.operation);
    if (!found) {
      problems.push(`${file}: ${v.verb}s ${nameIn(app, v.operation) ?? "an operation"}, which isn't one of ${pkg}'s operations: a mount only ${v.verb}s its own plugin's`);
      continue;
    }
    if (v.verb === "omit") {
      found.t.verbs.delete(found.verb);
      omitted.push(found.name);
    } else if (v.via.length === 0) {
      problems.push(`${file}: narrows ${found.name} to no ways in (an empty via): omit is how an operation goes, p.omit(...)`);
    } else {
      narrowed[found.name] = [...new Set(v.via)].sort();
    }
  }
  return { problems, omitted: omitted.sort(), narrowed };
};
