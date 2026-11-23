import type { Model, OperationModel } from "@orthograph/compiler";

/** The runtime's refusals the generated code names: the machine's, when the move starts from a state (D2 #37), and each not-found. */
export const notFromOf = (model: Model, o: OperationModel) => {
  const machine = model.things[o.thing]?.machine;
  const notFrom = o.move && o.move.from.length > 0 && machine ? `, notFrom: "${machine.notFrom.error}"` : "";
  // Each payload field no role check reads, and the `<Thing>NotFound` a missing one is refused with (K16, M1.46).
  const missing = Object.entries(o.notFound ?? {});
  // Each refusal the runtime makes for a rule this operation can break (G5), and the rule it is for.
  const ruled = Object.entries(o.invariants ?? {});
  return `${notFrom}${missing.length > 0 ? `, notFound: { ${missing.map(([k, e]) => `${k}: "${e}"`).join(", ")} }` : ""}${ruled.length > 0 ? `, invariants: { ${ruled.map(([tag, rule]) => `${tag}: "${rule}"`).join(", ")} }` : ""}`;
};
