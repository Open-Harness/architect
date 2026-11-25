import { Blueprint } from "orthograph";
import { LeaveAllocation } from "../thing.ts";
import { machine } from "../machine.ts";
import {
  AllocateeHasLeft,
  AllocateeNotInCompany,
  AllocationEndsBeforeStart,
  AllocationExceedsPeriod,
  AllocationOverlaps,
  AllocationTypeNotInCompany,
  LeaveWithoutPayNotAllocated,
  NoLeavesAllocated,
} from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts). AllocationOverlaps is judged against submitted allocations only, found with
// `Records.list` (HRMS's `docstatus=1`): two days overlap when one's last day is on or after the other's first and its
// first on or before the other's last.
export default Blueprint.operation(LeaveAllocation, {
  description: "Give an employee leave days of one type, between two days, as a draft.",
  payload: {
    company: LeaveAllocation.fields.company,
    employee: LeaveAllocation.fields.employee,
    leaveType: LeaveAllocation.fields.leaveType,
    fromDate: LeaveAllocation.fields.fromDate,
    toDate: LeaveAllocation.fields.toDate,
    newLeavesAllocated: LeaveAllocation.fields.newLeavesAllocated,
  },
  answer: { leaveAllocation: LeaveAllocation.fields.id },
  move: machine.moves.create,
  errors: [
    AllocateeNotInCompany,
    AllocateeHasLeft,
    AllocationTypeNotInCompany,
    AllocationEndsBeforeStart,
    AllocationOverlaps,
    LeaveWithoutPayNotAllocated,
    NoLeavesAllocated,
    AllocationExceedsPeriod,
  ],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "200 millis" },
});
