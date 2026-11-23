import type { CellId, Eval } from "../../grid/types.ts";
import type { FieldModel, OperationModel, ProjectEvidence, ThingModel } from "../../project-evidence/types.ts";
import { Reading } from "../../reading/service.ts";

/** An eval for one thing's cell: `problems` says what is wrong with it, empty when it is right. */
export const over = (cell: CellId, problems: (thing: ThingModel, evidence: ProjectEvidence, subject: string) => ReadonlyArray<string>): Eval<ProjectEvidence> =>
  Reading.over(cell, "thing", (e, subject) => e.model.things[subject], problems);

/** The operations that act on a thing, in the model's order. */
export const operationsOf = (e: ProjectEvidence, thing: string): ReadonlyArray<OperationModel> => Object.values(e.model.operations).filter((op) => op.thing === thing);

/** The fields of an operation's payload that a caller may see: the ones with no visibility rule. */
export const publicFields = (fields: Readonly<Record<string, FieldModel>>): ReadonlyArray<[string, FieldModel]> => Object.entries(fields).filter(([, f]) => f.visibility === undefined);

/** How the model names a field's type: the thing field it refers to, the named value, else its primitive. */
export const typeName = (field: FieldModel): string => field.ref ?? field.named ?? field.value.type;
