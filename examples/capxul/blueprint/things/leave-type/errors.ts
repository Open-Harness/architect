import { Blueprint } from "orthograph";
import { LeaveTypeName } from "../../values/leave.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
/** HRMS names a leave type by its name (`autoname: field:leave_type_name`), so a company has one type of each name. */
export class LeaveTypeNameTaken extends Blueprint.error({ leaveTypeName: LeaveTypeName }, { exit: 41 }) {}
