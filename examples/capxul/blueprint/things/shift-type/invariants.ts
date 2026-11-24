import { Blueprint } from "orthograph";
import { ShiftType } from "./thing.ts";
import { ShiftTypeNameTaken } from "./errors.ts";

// HRMS names a shift type by its name, so a company has one of each.
export const oneNamePerCompany = Blueprint.invariant.unique([ShiftType.fields.company, ShiftType.fields.shiftTypeName], {
  refuse: ShiftTypeNameTaken,
});
