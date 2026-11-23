import type { CellId, Eval } from "../../grid/types.ts";
import type { MachineModel, OperationModel, ProjectEvidence, ThingModel } from "../../project-evidence/types.ts";
import { Reading } from "../../reading/service.ts";

/** A thing's machine and the operations that move it. */
export interface Found { readonly thing: ThingModel; readonly machine: MachineModel; readonly moves: ReadonlyArray<OperationModel & { readonly move: NonNullable<OperationModel["move"]> }> }

export const machineOf = (e: ProjectEvidence, subject: string): Found | undefined => {
  const thing = e.model.things[subject];
  if (thing?.machine == null) return undefined;
  const moves = Object.values(e.model.operations).flatMap((op) => (op.thing === subject && op.move !== null ? [{ ...op, move: op.move }] : []));
  return { thing, machine: thing.machine, moves };
};

/** An eval for one thing's machine: `problems` says what is wrong with it, empty when it is right. */
export const over = (cell: CellId, problems: (found: Found, evidence: ProjectEvidence, subject: string) => ReadonlyArray<string>): Eval<ProjectEvidence> =>
  Reading.over(cell, "thing with a machine", machineOf, problems);
