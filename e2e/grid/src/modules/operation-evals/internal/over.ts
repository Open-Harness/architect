import type { CellId, Eval } from "../../grid/types.ts";
import type { ProjectEvidence } from "../../project-evidence/types.ts";
import { Reading } from "../../reading/service.ts";

/** An eval for one operation's cell: `problems` says what is wrong with it, empty when it is right. */
export const over = (cell: CellId, problems: (op: OperationOf, evidence: ProjectEvidence, subject: string) => ReadonlyArray<string>): Eval<ProjectEvidence> =>
  Reading.over(cell, "operation", opOf, problems);

export type OperationOf = ProjectEvidence["model"]["operations"][string];
export const opOf = (e: ProjectEvidence, subject: string): OperationOf | undefined => e.model.operations[subject];
