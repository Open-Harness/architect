// Every path through a thing's machine (K16 e): a machine is finite, so each move, by each operation that makes it, is a
// list of allowed transitions (each `from`, or creating, to each `to`) then refused moves (each state not in its `from`,
// refused with the machine's `notFrom`). A creating move has no refused path: the runtime never checks it.
import type { Model, OperationModel } from "@orthograph/compiler";

export type MachinePath =
  | { readonly kind: "allowed"; readonly operation: string; readonly move: string; readonly from: string | null; readonly to: string; readonly emits: string }
  | { readonly kind: "refused"; readonly operation: string; readonly move: string; readonly from: string; readonly refusal: string };

/** The thing's operations and reads, by name: what `add journeys` walks after the machine. */
export const callsOf = (model: Model, thing: string): ReadonlyArray<OperationModel> =>
  Object.values(model.operations).filter((o) => o.thing === thing).sort((a, b) => a.name.localeCompare(b.name));

export const machinePaths = (model: Model, thing: string): ReadonlyArray<MachinePath> => {
  const machine = model.things[thing]?.machine;
  if (!machine) return [];
  return Object.entries(machine.moves).flatMap(([key, move]) =>
    callsOf(model, thing).filter((o) => o.move?.key === key).flatMap((op): ReadonlyArray<MachinePath> => [
      ...(move.from.length ? move.from : [null]).flatMap((from) =>
        move.to.map((to) => ({ kind: "allowed" as const, operation: op.name, move: key, from, to, emits: move.emits }))),
      ...(move.from.length === 0 ? [] : machine.states.filter((s) => !move.from.includes(s)).map((from) =>
        ({ kind: "refused" as const, operation: op.name, move: key, from, refusal: machine.notFrom.error }))),
    ]));
};
