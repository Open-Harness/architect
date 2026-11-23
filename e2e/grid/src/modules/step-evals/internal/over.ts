import type { CellId, Eval } from "../../grid/types.ts";
import type { OperationModel, ProjectEvidence, StepModel } from "../../project-evidence/types.ts";
import { Reading } from "../../reading/service.ts";

/** A declared step, found by its full name (`handle.claim.load`) in the operation that declares it. */
export interface Found { readonly op: OperationModel; readonly step: StepModel }

export const stepOf = (e: ProjectEvidence, subject: string): Found | undefined => {
  for (const op of Object.values(e.model.operations)) {
    const step = Object.values(op.steps ?? {}).find((s) => s.name === subject);
    if (step !== undefined) return { op, step };
  }
  return undefined;
};

/** An eval for one step's cell: `problems` says what is wrong with it, empty when it is right. */
export const over = (cell: CellId, problems: (found: Found, evidence: ProjectEvidence, subject: string) => ReadonlyArray<string>): Eval<ProjectEvidence> =>
  Reading.over(cell, "step", stepOf, problems);

/** The files of a generated package (`generated/sdk/`) that name the step: a step belongs to no caller's contract. */
export const filesNaming = (e: ProjectEvidence, folder: string, step: string): ReadonlyArray<string> =>
  Object.entries(e.files).filter(([path, text]) => path.startsWith(`generated/${folder}/`) && text.includes(step)).map(([path]) => path);
