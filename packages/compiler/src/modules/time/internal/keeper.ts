// The keeper's two rules (K23 section 3): it calls only moves made by time, and nobody else calls them.
import type { Move } from "orthograph";

const lists = (allowed: ReadonlyArray<{ readonly kind: string }>) => allowed.some((a) => a.kind === "keeper");

/** Whether any operation or read lists the keeper: a blank's `allowed` isn't written yet, so it says nothing. */
export const keeperUsed = (declared: ReadonlyArray<unknown>): boolean =>
  declared.some((allowed) => Array.isArray(allowed) && lists(allowed as ReadonlyArray<{ readonly kind: string }>));

/** The problems with who an operation or a read allows, naming it: `move` is absent for a read and for an operation with no move. */
export const keeperProblems = (spec: {
  readonly file: string;
  readonly name: string;
  readonly kind: "operation" | "read";
  readonly move: Move | undefined;
  readonly allowed: ReadonlyArray<{ readonly kind: string }>;
}): ReadonlyArray<string> => {
  const madeByTime = spec.move?.by !== undefined;
  const keeper = lists(spec.allowed);
  // Access accepts any entry that matches, so one more entry beside the keeper lets that caller run the move too.
  const others = spec.allowed.filter((a) => a.kind !== "keeper");
  if (madeByTime && keeper && others.length > 0) return [`${spec.file}: ${spec.name} makes the move ${spec.move!.key}, which is made by time, so it is allowed to the keeper alone, but it also allows ${others.map((a) => a.kind).join(", ")}`];
  if (madeByTime && !keeper) return [`${spec.file}: ${spec.name} makes the move ${spec.move!.key}, which is made by time, so it must be allowed to the keeper (allowed: [Blueprint.keeper])`];
  if (keeper && !madeByTime) {
    const why = spec.kind === "read" ? "is a read" : spec.move ? `makes the move ${spec.move.key}, which is not made by time` : "makes no move";
    return [`${spec.file}: ${spec.name} allows the keeper, but it ${why}: the keeper calls only moves made by time`];
  }
  return [];
};
