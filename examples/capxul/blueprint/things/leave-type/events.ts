import { Blueprint } from "orthograph";
import { LeaveType } from "./thing.ts";

export const LeaveTypeCreated = Blueprint.event({ leaveType: LeaveType.fields.id, company: LeaveType.fields.company });
