import { Blueprint } from "orthograph";
import { LeaveAllocation } from "./thing.ts";

export const LeaveAllocationCreated = Blueprint.event({
  leaveAllocation: LeaveAllocation.fields.id,
  company: LeaveAllocation.fields.company,
  employee: LeaveAllocation.fields.employee,
  leaveType: LeaveAllocation.fields.leaveType,
});
export const LeaveAllocationSubmitted = Blueprint.event({ leaveAllocation: LeaveAllocation.fields.id });
