import type { CellId, Eval } from "../../grid/types.ts";
import type { Fields, OperationModel, ProjectEvidence, ThingModel } from "../../project-evidence/types.ts";
import { Reading } from "../../reading/service.ts";

/** An event, the thing that declares it, and the operations whose move emits it. */
export interface Found { readonly name: string; readonly thing: ThingModel; readonly fields: Fields; readonly emitters: ReadonlyArray<OperationModel> }

export const eventOf = (e: ProjectEvidence, subject: string): Found | undefined => {
  const thing = Object.values(e.model.things).find((t) => t.events?.[subject] !== undefined);
  return thing === undefined ? undefined : { name: subject, thing, fields: thing.events![subject]!, emitters: Object.values(e.model.operations).filter((op) => op.move?.emits === subject) };
};

/** An eval for one event's cell: `problems` says what is wrong with it, empty when it is right. */
export const over = (cell: CellId, problems: (found: Found, evidence: ProjectEvidence, subject: string) => ReadonlyArray<string>): Eval<ProjectEvidence> =>
  Reading.over(cell, "event", eventOf, problems);
