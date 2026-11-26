import { Blueprint } from "orthograph";
import { LeaveType } from "./thing.ts";
import { LeaveTypeNameTaken } from "./errors.ts";

// HRMS names a leave type by its name, so a company has one type of each name.
export const oneNamePerCompany = Blueprint.invariant.unique([LeaveType.fields.company, LeaveType.fields.leaveTypeName], {
  refuse: LeaveTypeNameTaken,
});
