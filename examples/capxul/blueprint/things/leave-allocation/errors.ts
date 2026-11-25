import { Blueprint } from "orthograph";
import { Day } from "../../values/employee.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `leave-allocation.create` refuses AllocateeNotInCompany, AllocateeHasLeft,
// AllocationTypeNotInCompany, AllocationEndsBeforeStart, AllocationOverlaps, LeaveWithoutPayNotAllocated,
// NoLeavesAllocated, then AllocationExceedsPeriod: Capxul's own checks, then HRMS's `validate` order.
/** Capxul's own: the employee named works for another company. HRMS copies `company` from the employee (`fetch_from`). */
export class AllocateeNotInCompany extends Blueprint.error({}, { exit: 41 }) {}
/**
 * Capxul's own (`decisions/CX-expense-leavers.md`): a new allocation is only for an employee still at work, judged on
 * create. HRMS's allocation has no employee check. A draft made before the employee left can still be submitted.
 */
export class AllocateeHasLeft extends Blueprint.error({}, { exit: 42 }) {}
/** Capxul's own: the leave type named is another company's. HRMS's types are site-wide (`decisions/CX-leave.md`, call 8). */
export class AllocationTypeNotInCompany extends Blueprint.error({}, { exit: 43 }) {}
/** HRMS's `validate_period`: "To date cannot be before from date". The same day is allowed. */
export class AllocationEndsBeforeStart extends Blueprint.error({ fromDate: Day }, { exit: 44 }) {}
/**
 * HRMS's `validate_allocation_overlap`: a submitted allocation of the same employee and type shares a day with this
 * one. Judged on create and again on submit, so two overlapping drafts can't both be submitted.
 */
export class AllocationOverlaps extends Blueprint.error({}, { exit: 45 }) {}
/** HRMS's `validate_lwp`: "Leave Type {0} cannot be allocated since it is leave without pay". */
export class LeaveWithoutPayNotAllocated extends Blueprint.error({}, { exit: 46 }) {}
/** HRMS's `set_total_leaves_allocated`: "Total leaves allocated is mandatory". Capxul refuses below 0 too. */
export class NoLeavesAllocated extends Blueprint.error({}, { exit: 47 }) {}
/** HRMS's `validate_total_leaves_allocated`: more leaves than the days from the first to the last, both counted. */
export class AllocationExceedsPeriod extends Blueprint.error({}, { exit: 48 }) {}
