// Generated from the blueprint. Do not edit.
import { Schema } from "effect";
import { ErrorNames, wireStruct } from "orthograph/server";
import * as Attendance from "../../../blueprint/things/attendance/errors.ts";
import * as AttendanceRequest from "../../../blueprint/things/attendance-request/errors.ts";
import * as BankAccount from "../../../blueprint/things/bank-account/errors.ts";
import * as Branch from "../../../blueprint/things/branch/errors.ts";
import * as BridgeBusiness from "../../../blueprint/things/bridge-business/errors.ts";
import * as BridgeIndividual from "../../../blueprint/things/bridge-individual/errors.ts";
import * as Company from "../../../blueprint/things/company/errors.ts";
import * as Department from "../../../blueprint/things/department/errors.ts";
import * as Designation from "../../../blueprint/things/designation/errors.ts";
import * as Employee from "../../../blueprint/things/employee/errors.ts";
import * as EmployeeGrade from "../../../blueprint/things/employee-grade/errors.ts";
import * as EmploymentType from "../../../blueprint/things/employment-type/errors.ts";
import * as Expense from "../../../blueprint/things/expense/errors.ts";
import * as ExpenseClaim from "../../../blueprint/things/expense-claim/errors.ts";
import * as ExpenseClaimType from "../../../blueprint/things/expense-claim-type/errors.ts";
import * as Holiday from "../../../blueprint/things/holiday/errors.ts";
import * as HolidayList from "../../../blueprint/things/holiday-list/errors.ts";
import * as LeaveAllocation from "../../../blueprint/things/leave-allocation/errors.ts";
import * as LeaveApplication from "../../../blueprint/things/leave-application/errors.ts";
import * as LeaveType from "../../../blueprint/things/leave-type/errors.ts";
import * as ShiftType from "../../../blueprint/things/shift-type/errors.ts";

/** Every refusal's code, its exit for the CLI and its HTTP status: one row each, read by the CLI, HTTP and MCP. */
export const refusals = {
  AttendeeNotInCompany: { code: "AN-001", exit: 41, status: 422 },
  AttendeeHasLeft: { code: "AN-002", exit: 42, status: 422 },
  AttendanceBeforeJoining: { code: "AN-003", exit: 43, status: 422 },
  AttendanceAlreadyMarked: { code: "AN-004", exit: 44, status: 422 },
  AttendanceOnLeave: { code: "AN-005", exit: 45, status: 422 },
  RequesterNotInCompany: { code: "AQ-001", exit: 41, status: 422 },
  RequesterHasLeft: { code: "AQ-002", exit: 42, status: 422 },
  RequestEndsBeforeStart: { code: "AQ-003", exit: 43, status: 422 },
  RequestBeforeJoining: { code: "AQ-004", exit: 44, status: 422 },
  AttendanceRequestOverlaps: { code: "AQ-005", exit: 45, status: 422 },
  KybNotApproved: { code: "BA-001", exit: 41, status: 422 },
  BankAccountNameTaken: { code: "BA-002", exit: 42, status: 422 },
  BranchNameTaken: { code: "BR-001", exit: 41, status: 422 },
  KybAlreadyStarted: { code: "KB-001", exit: 41, status: 422 },
  KycAlreadyStarted: { code: "KC-001", exit: 41, status: 422 },
  CompanyNameTaken: { code: "CO-001", exit: 41, status: 422 },
  CompanyAbbrTaken: { code: "CO-002", exit: 42, status: 422 },
  DepartmentNameTaken: { code: "DE-001", exit: 41, status: 422 },
  DesignationNameTaken: { code: "DS-001", exit: 41, status: 422 },
  EmployeeAlreadyHired: { code: "EM-001", exit: 41, status: 422 },
  DepartmentNotInCompany: { code: "EM-002", exit: 42, status: 422 },
  DesignationNotInCompany: { code: "EM-003", exit: 43, status: 422 },
  JoinedBeforeBorn: { code: "EM-004", exit: 44, status: 422 },
  RelievedBeforeJoined: { code: "EM-005", exit: 45, status: 422 },
  EmployeeGradeNameTaken: { code: "EG-001", exit: 41, status: 422 },
  EmploymentTypeNameTaken: { code: "TY-001", exit: 41, status: 422 },
  SanctionedOverClaimed: { code: "EX-001", exit: 41, status: 422 },
  ExpenseTypeNotInCompany: { code: "EX-002", exit: 42, status: 422 },
  ClaimNotDraft: { code: "EX-003", exit: 43, status: 422 },
  ClaimantNotActive: { code: "EC-001", exit: 41, status: 422 },
  EmployeeNotInCompany: { code: "EC-002", exit: 42, status: 422 },
  ClaimHasNoExpenses: { code: "EC-003", exit: 43, status: 422 },
  ExpenseTypeTaken: { code: "ET-001", exit: 41, status: 422 },
  HolidayDateTaken: { code: "HD-001", exit: 41, status: 422 },
  HolidayOutsideList: { code: "HD-002", exit: 42, status: 422 },
  HolidayListNameTaken: { code: "HL-001", exit: 43, status: 422 },
  HolidayListEndsBeforeStart: { code: "HL-002", exit: 44, status: 422 },
  AllocateeNotInCompany: { code: "LL-001", exit: 41, status: 422 },
  AllocateeHasLeft: { code: "LL-002", exit: 42, status: 422 },
  AllocationTypeNotInCompany: { code: "LL-003", exit: 43, status: 422 },
  AllocationEndsBeforeStart: { code: "LL-004", exit: 44, status: 422 },
  AllocationOverlaps: { code: "LL-005", exit: 45, status: 422 },
  LeaveWithoutPayNotAllocated: { code: "LL-006", exit: 46, status: 422 },
  NoLeavesAllocated: { code: "LL-007", exit: 47, status: 422 },
  AllocationExceedsPeriod: { code: "LL-008", exit: 48, status: 422 },
  ApplicantNotInCompany: { code: "LP-001", exit: 41, status: 422 },
  ApplicantHasLeft: { code: "LP-002", exit: 42, status: 422 },
  ApplicationTypeNotInCompany: { code: "LP-003", exit: 43, status: 422 },
  LeaveEndsBeforeStart: { code: "LP-004", exit: 44, status: 422 },
  LeaveBeforeJoining: { code: "LP-005", exit: 45, status: 422 },
  NoAllocationCovers: { code: "LP-006", exit: 46, status: 422 },
  LeaveAllHolidays: { code: "LP-007", exit: 47, status: 422 },
  InsufficientLeaveBalance: { code: "LP-008", exit: 48, status: 422 },
  LeaveOverlaps: { code: "LP-009", exit: 49, status: 422 },
  LeaveTooLong: { code: "LP-010", exit: 50, status: 422 },
  LeaveDayAttended: { code: "LP-011", exit: 51, status: 422 },
  LeaveTypeNameTaken: { code: "LT-001", exit: 41, status: 422 },
  ShiftTypeNameTaken: { code: "SH-001", exit: 41, status: 422 },
  ShiftStartsWhenItEnds: { code: "SH-002", exit: 42, status: 422 },
  AttendanceNotMarked: { code: "AN-900", exit: 40, status: 409 },
  AttendanceRequestNotDraft: { code: "AQ-900", exit: 40, status: 409 },
  BankAccountNotOpen: { code: "BA-900", exit: 40, status: 409 },
  BranchNotActive: { code: "BR-900", exit: 40, status: 409 },
  BridgeBusinessNotStarted: { code: "KB-900", exit: 40, status: 409 },
  BridgeIndividualNotStarted: { code: "KC-900", exit: 40, status: 409 },
  CompanyNotActive: { code: "CO-900", exit: 40, status: 409 },
  DepartmentNotActive: { code: "DE-900", exit: 40, status: 409 },
  DesignationNotActive: { code: "DS-900", exit: 40, status: 409 },
  EmployeeNotActive: { code: "EM-900", exit: 40, status: 409 },
  EmployeeGradeNotActive: { code: "EG-900", exit: 40, status: 409 },
  EmploymentTypeNotActive: { code: "TY-900", exit: 40, status: 409 },
  ExpenseNotActive: { code: "EX-900", exit: 40, status: 409 },
  ExpenseClaimNotDraft: { code: "EC-900", exit: 40, status: 409 },
  ExpenseClaimTypeNotActive: { code: "ET-900", exit: 40, status: 409 },
  HolidayNotActive: { code: "HD-900", exit: 40, status: 409 },
  HolidayListNotActive: { code: "HL-900", exit: 40, status: 409 },
  LeaveAllocationNotDraft: { code: "LL-900", exit: 40, status: 409 },
  LeaveApplicationNotOpen: { code: "LP-900", exit: 40, status: 409 },
  LeaveTypeNotActive: { code: "LT-900", exit: 40, status: 409 },
  ShiftTypeNotActive: { code: "SH-900", exit: 40, status: 409 },
  BridgeBusinessNotFound: { code: "KB-901", exit: 4, status: 404 },
  BridgeIndividualNotFound: { code: "KC-901", exit: 4, status: 404 },
  CompanyNotFound: { code: "CO-901", exit: 4, status: 404 },
  DepartmentNotFound: { code: "DE-901", exit: 4, status: 404 },
  DesignationNotFound: { code: "DS-901", exit: 4, status: 404 },
  EmployeeNotFound: { code: "EM-901", exit: 4, status: 404 },
  ExpenseClaimTypeNotFound: { code: "ET-901", exit: 4, status: 404 },
  LeaveTypeNotFound: { code: "LT-901", exit: 4, status: 404 },
  NotAllowed: { code: "AR-001", exit: 3, status: 403 },
  IdempotencyConflict: { code: "AR-002", exit: 120, status: 409 },
} as const;
type Refusal = keyof typeof refusals;

ErrorNames.name(Attendance.AttendeeNotInCompany, "AttendeeNotInCompany");
export class AttendeeNotInCompany extends Schema.TaggedError<AttendeeNotInCompany>()("AttendeeNotInCompany", { code: Schema.Literal(refusals.AttendeeNotInCompany.code), ...wireStruct(Attendance.AttendeeNotInCompany.fields).fields }, { httpApiStatus: refusals.AttendeeNotInCompany.status }) { static readonly code = refusals.AttendeeNotInCompany.code; }
ErrorNames.name(Attendance.AttendeeHasLeft, "AttendeeHasLeft");
export class AttendeeHasLeft extends Schema.TaggedError<AttendeeHasLeft>()("AttendeeHasLeft", { code: Schema.Literal(refusals.AttendeeHasLeft.code), ...wireStruct(Attendance.AttendeeHasLeft.fields).fields }, { httpApiStatus: refusals.AttendeeHasLeft.status }) { static readonly code = refusals.AttendeeHasLeft.code; }
ErrorNames.name(Attendance.AttendanceBeforeJoining, "AttendanceBeforeJoining");
export class AttendanceBeforeJoining extends Schema.TaggedError<AttendanceBeforeJoining>()("AttendanceBeforeJoining", { code: Schema.Literal(refusals.AttendanceBeforeJoining.code), ...wireStruct(Attendance.AttendanceBeforeJoining.fields).fields }, { httpApiStatus: refusals.AttendanceBeforeJoining.status }) { static readonly code = refusals.AttendanceBeforeJoining.code; }
ErrorNames.name(Attendance.AttendanceAlreadyMarked, "AttendanceAlreadyMarked");
export class AttendanceAlreadyMarked extends Schema.TaggedError<AttendanceAlreadyMarked>()("AttendanceAlreadyMarked", { code: Schema.Literal(refusals.AttendanceAlreadyMarked.code), ...wireStruct(Attendance.AttendanceAlreadyMarked.fields).fields }, { httpApiStatus: refusals.AttendanceAlreadyMarked.status }) { static readonly code = refusals.AttendanceAlreadyMarked.code; }
ErrorNames.name(Attendance.AttendanceOnLeave, "AttendanceOnLeave");
export class AttendanceOnLeave extends Schema.TaggedError<AttendanceOnLeave>()("AttendanceOnLeave", { code: Schema.Literal(refusals.AttendanceOnLeave.code), ...wireStruct(Attendance.AttendanceOnLeave.fields).fields }, { httpApiStatus: refusals.AttendanceOnLeave.status }) { static readonly code = refusals.AttendanceOnLeave.code; }
ErrorNames.name(AttendanceRequest.RequesterNotInCompany, "RequesterNotInCompany");
export class RequesterNotInCompany extends Schema.TaggedError<RequesterNotInCompany>()("RequesterNotInCompany", { code: Schema.Literal(refusals.RequesterNotInCompany.code), ...wireStruct(AttendanceRequest.RequesterNotInCompany.fields).fields }, { httpApiStatus: refusals.RequesterNotInCompany.status }) { static readonly code = refusals.RequesterNotInCompany.code; }
ErrorNames.name(AttendanceRequest.RequesterHasLeft, "RequesterHasLeft");
export class RequesterHasLeft extends Schema.TaggedError<RequesterHasLeft>()("RequesterHasLeft", { code: Schema.Literal(refusals.RequesterHasLeft.code), ...wireStruct(AttendanceRequest.RequesterHasLeft.fields).fields }, { httpApiStatus: refusals.RequesterHasLeft.status }) { static readonly code = refusals.RequesterHasLeft.code; }
ErrorNames.name(AttendanceRequest.RequestEndsBeforeStart, "RequestEndsBeforeStart");
export class RequestEndsBeforeStart extends Schema.TaggedError<RequestEndsBeforeStart>()("RequestEndsBeforeStart", { code: Schema.Literal(refusals.RequestEndsBeforeStart.code), ...wireStruct(AttendanceRequest.RequestEndsBeforeStart.fields).fields }, { httpApiStatus: refusals.RequestEndsBeforeStart.status }) { static readonly code = refusals.RequestEndsBeforeStart.code; }
ErrorNames.name(AttendanceRequest.RequestBeforeJoining, "RequestBeforeJoining");
export class RequestBeforeJoining extends Schema.TaggedError<RequestBeforeJoining>()("RequestBeforeJoining", { code: Schema.Literal(refusals.RequestBeforeJoining.code), ...wireStruct(AttendanceRequest.RequestBeforeJoining.fields).fields }, { httpApiStatus: refusals.RequestBeforeJoining.status }) { static readonly code = refusals.RequestBeforeJoining.code; }
ErrorNames.name(AttendanceRequest.AttendanceRequestOverlaps, "AttendanceRequestOverlaps");
export class AttendanceRequestOverlaps extends Schema.TaggedError<AttendanceRequestOverlaps>()("AttendanceRequestOverlaps", { code: Schema.Literal(refusals.AttendanceRequestOverlaps.code), ...wireStruct(AttendanceRequest.AttendanceRequestOverlaps.fields).fields }, { httpApiStatus: refusals.AttendanceRequestOverlaps.status }) { static readonly code = refusals.AttendanceRequestOverlaps.code; }
ErrorNames.name(BankAccount.KybNotApproved, "KybNotApproved");
export class KybNotApproved extends Schema.TaggedError<KybNotApproved>()("KybNotApproved", { code: Schema.Literal(refusals.KybNotApproved.code), ...wireStruct(BankAccount.KybNotApproved.fields).fields }, { httpApiStatus: refusals.KybNotApproved.status }) { static readonly code = refusals.KybNotApproved.code; }
ErrorNames.name(BankAccount.BankAccountNameTaken, "BankAccountNameTaken");
export class BankAccountNameTaken extends Schema.TaggedError<BankAccountNameTaken>()("BankAccountNameTaken", { code: Schema.Literal(refusals.BankAccountNameTaken.code), ...wireStruct(BankAccount.BankAccountNameTaken.fields).fields }, { httpApiStatus: refusals.BankAccountNameTaken.status }) { static readonly code = refusals.BankAccountNameTaken.code; }
ErrorNames.name(Branch.BranchNameTaken, "BranchNameTaken");
export class BranchNameTaken extends Schema.TaggedError<BranchNameTaken>()("BranchNameTaken", { code: Schema.Literal(refusals.BranchNameTaken.code), ...wireStruct(Branch.BranchNameTaken.fields).fields }, { httpApiStatus: refusals.BranchNameTaken.status }) { static readonly code = refusals.BranchNameTaken.code; }
ErrorNames.name(BridgeBusiness.KybAlreadyStarted, "KybAlreadyStarted");
export class KybAlreadyStarted extends Schema.TaggedError<KybAlreadyStarted>()("KybAlreadyStarted", { code: Schema.Literal(refusals.KybAlreadyStarted.code), ...wireStruct(BridgeBusiness.KybAlreadyStarted.fields).fields }, { httpApiStatus: refusals.KybAlreadyStarted.status }) { static readonly code = refusals.KybAlreadyStarted.code; }
ErrorNames.name(BridgeIndividual.KycAlreadyStarted, "KycAlreadyStarted");
export class KycAlreadyStarted extends Schema.TaggedError<KycAlreadyStarted>()("KycAlreadyStarted", { code: Schema.Literal(refusals.KycAlreadyStarted.code), ...wireStruct(BridgeIndividual.KycAlreadyStarted.fields).fields }, { httpApiStatus: refusals.KycAlreadyStarted.status }) { static readonly code = refusals.KycAlreadyStarted.code; }
ErrorNames.name(Company.CompanyNameTaken, "CompanyNameTaken");
export class CompanyNameTaken extends Schema.TaggedError<CompanyNameTaken>()("CompanyNameTaken", { code: Schema.Literal(refusals.CompanyNameTaken.code), ...wireStruct(Company.CompanyNameTaken.fields).fields }, { httpApiStatus: refusals.CompanyNameTaken.status }) { static readonly code = refusals.CompanyNameTaken.code; }
ErrorNames.name(Company.CompanyAbbrTaken, "CompanyAbbrTaken");
export class CompanyAbbrTaken extends Schema.TaggedError<CompanyAbbrTaken>()("CompanyAbbrTaken", { code: Schema.Literal(refusals.CompanyAbbrTaken.code), ...wireStruct(Company.CompanyAbbrTaken.fields).fields }, { httpApiStatus: refusals.CompanyAbbrTaken.status }) { static readonly code = refusals.CompanyAbbrTaken.code; }
ErrorNames.name(Department.DepartmentNameTaken, "DepartmentNameTaken");
export class DepartmentNameTaken extends Schema.TaggedError<DepartmentNameTaken>()("DepartmentNameTaken", { code: Schema.Literal(refusals.DepartmentNameTaken.code), ...wireStruct(Department.DepartmentNameTaken.fields).fields }, { httpApiStatus: refusals.DepartmentNameTaken.status }) { static readonly code = refusals.DepartmentNameTaken.code; }
ErrorNames.name(Designation.DesignationNameTaken, "DesignationNameTaken");
export class DesignationNameTaken extends Schema.TaggedError<DesignationNameTaken>()("DesignationNameTaken", { code: Schema.Literal(refusals.DesignationNameTaken.code), ...wireStruct(Designation.DesignationNameTaken.fields).fields }, { httpApiStatus: refusals.DesignationNameTaken.status }) { static readonly code = refusals.DesignationNameTaken.code; }
ErrorNames.name(Employee.EmployeeAlreadyHired, "EmployeeAlreadyHired");
export class EmployeeAlreadyHired extends Schema.TaggedError<EmployeeAlreadyHired>()("EmployeeAlreadyHired", { code: Schema.Literal(refusals.EmployeeAlreadyHired.code), ...wireStruct(Employee.EmployeeAlreadyHired.fields).fields }, { httpApiStatus: refusals.EmployeeAlreadyHired.status }) { static readonly code = refusals.EmployeeAlreadyHired.code; }
ErrorNames.name(Employee.DepartmentNotInCompany, "DepartmentNotInCompany");
export class DepartmentNotInCompany extends Schema.TaggedError<DepartmentNotInCompany>()("DepartmentNotInCompany", { code: Schema.Literal(refusals.DepartmentNotInCompany.code), ...wireStruct(Employee.DepartmentNotInCompany.fields).fields }, { httpApiStatus: refusals.DepartmentNotInCompany.status }) { static readonly code = refusals.DepartmentNotInCompany.code; }
ErrorNames.name(Employee.DesignationNotInCompany, "DesignationNotInCompany");
export class DesignationNotInCompany extends Schema.TaggedError<DesignationNotInCompany>()("DesignationNotInCompany", { code: Schema.Literal(refusals.DesignationNotInCompany.code), ...wireStruct(Employee.DesignationNotInCompany.fields).fields }, { httpApiStatus: refusals.DesignationNotInCompany.status }) { static readonly code = refusals.DesignationNotInCompany.code; }
ErrorNames.name(Employee.JoinedBeforeBorn, "JoinedBeforeBorn");
export class JoinedBeforeBorn extends Schema.TaggedError<JoinedBeforeBorn>()("JoinedBeforeBorn", { code: Schema.Literal(refusals.JoinedBeforeBorn.code), ...wireStruct(Employee.JoinedBeforeBorn.fields).fields }, { httpApiStatus: refusals.JoinedBeforeBorn.status }) { static readonly code = refusals.JoinedBeforeBorn.code; }
ErrorNames.name(Employee.RelievedBeforeJoined, "RelievedBeforeJoined");
export class RelievedBeforeJoined extends Schema.TaggedError<RelievedBeforeJoined>()("RelievedBeforeJoined", { code: Schema.Literal(refusals.RelievedBeforeJoined.code), ...wireStruct(Employee.RelievedBeforeJoined.fields).fields }, { httpApiStatus: refusals.RelievedBeforeJoined.status }) { static readonly code = refusals.RelievedBeforeJoined.code; }
ErrorNames.name(EmployeeGrade.EmployeeGradeNameTaken, "EmployeeGradeNameTaken");
export class EmployeeGradeNameTaken extends Schema.TaggedError<EmployeeGradeNameTaken>()("EmployeeGradeNameTaken", { code: Schema.Literal(refusals.EmployeeGradeNameTaken.code), ...wireStruct(EmployeeGrade.EmployeeGradeNameTaken.fields).fields }, { httpApiStatus: refusals.EmployeeGradeNameTaken.status }) { static readonly code = refusals.EmployeeGradeNameTaken.code; }
ErrorNames.name(EmploymentType.EmploymentTypeNameTaken, "EmploymentTypeNameTaken");
export class EmploymentTypeNameTaken extends Schema.TaggedError<EmploymentTypeNameTaken>()("EmploymentTypeNameTaken", { code: Schema.Literal(refusals.EmploymentTypeNameTaken.code), ...wireStruct(EmploymentType.EmploymentTypeNameTaken.fields).fields }, { httpApiStatus: refusals.EmploymentTypeNameTaken.status }) { static readonly code = refusals.EmploymentTypeNameTaken.code; }
ErrorNames.name(Expense.SanctionedOverClaimed, "SanctionedOverClaimed");
export class SanctionedOverClaimed extends Schema.TaggedError<SanctionedOverClaimed>()("SanctionedOverClaimed", { code: Schema.Literal(refusals.SanctionedOverClaimed.code), ...wireStruct(Expense.SanctionedOverClaimed.fields).fields }, { httpApiStatus: refusals.SanctionedOverClaimed.status }) { static readonly code = refusals.SanctionedOverClaimed.code; }
ErrorNames.name(Expense.ExpenseTypeNotInCompany, "ExpenseTypeNotInCompany");
export class ExpenseTypeNotInCompany extends Schema.TaggedError<ExpenseTypeNotInCompany>()("ExpenseTypeNotInCompany", { code: Schema.Literal(refusals.ExpenseTypeNotInCompany.code), ...wireStruct(Expense.ExpenseTypeNotInCompany.fields).fields }, { httpApiStatus: refusals.ExpenseTypeNotInCompany.status }) { static readonly code = refusals.ExpenseTypeNotInCompany.code; }
ErrorNames.name(Expense.ClaimNotDraft, "ClaimNotDraft");
export class ClaimNotDraft extends Schema.TaggedError<ClaimNotDraft>()("ClaimNotDraft", { code: Schema.Literal(refusals.ClaimNotDraft.code), ...wireStruct(Expense.ClaimNotDraft.fields).fields }, { httpApiStatus: refusals.ClaimNotDraft.status }) { static readonly code = refusals.ClaimNotDraft.code; }
ErrorNames.name(ExpenseClaim.ClaimantNotActive, "ClaimantNotActive");
export class ClaimantNotActive extends Schema.TaggedError<ClaimantNotActive>()("ClaimantNotActive", { code: Schema.Literal(refusals.ClaimantNotActive.code), ...wireStruct(ExpenseClaim.ClaimantNotActive.fields).fields }, { httpApiStatus: refusals.ClaimantNotActive.status }) { static readonly code = refusals.ClaimantNotActive.code; }
ErrorNames.name(ExpenseClaim.EmployeeNotInCompany, "EmployeeNotInCompany");
export class EmployeeNotInCompany extends Schema.TaggedError<EmployeeNotInCompany>()("EmployeeNotInCompany", { code: Schema.Literal(refusals.EmployeeNotInCompany.code), ...wireStruct(ExpenseClaim.EmployeeNotInCompany.fields).fields }, { httpApiStatus: refusals.EmployeeNotInCompany.status }) { static readonly code = refusals.EmployeeNotInCompany.code; }
ErrorNames.name(ExpenseClaim.ClaimHasNoExpenses, "ClaimHasNoExpenses");
export class ClaimHasNoExpenses extends Schema.TaggedError<ClaimHasNoExpenses>()("ClaimHasNoExpenses", { code: Schema.Literal(refusals.ClaimHasNoExpenses.code), ...wireStruct(ExpenseClaim.ClaimHasNoExpenses.fields).fields }, { httpApiStatus: refusals.ClaimHasNoExpenses.status }) { static readonly code = refusals.ClaimHasNoExpenses.code; }
ErrorNames.name(ExpenseClaimType.ExpenseTypeTaken, "ExpenseTypeTaken");
export class ExpenseTypeTaken extends Schema.TaggedError<ExpenseTypeTaken>()("ExpenseTypeTaken", { code: Schema.Literal(refusals.ExpenseTypeTaken.code), ...wireStruct(ExpenseClaimType.ExpenseTypeTaken.fields).fields }, { httpApiStatus: refusals.ExpenseTypeTaken.status }) { static readonly code = refusals.ExpenseTypeTaken.code; }
ErrorNames.name(Holiday.HolidayDateTaken, "HolidayDateTaken");
export class HolidayDateTaken extends Schema.TaggedError<HolidayDateTaken>()("HolidayDateTaken", { code: Schema.Literal(refusals.HolidayDateTaken.code), ...wireStruct(Holiday.HolidayDateTaken.fields).fields }, { httpApiStatus: refusals.HolidayDateTaken.status }) { static readonly code = refusals.HolidayDateTaken.code; }
ErrorNames.name(Holiday.HolidayOutsideList, "HolidayOutsideList");
export class HolidayOutsideList extends Schema.TaggedError<HolidayOutsideList>()("HolidayOutsideList", { code: Schema.Literal(refusals.HolidayOutsideList.code), ...wireStruct(Holiday.HolidayOutsideList.fields).fields }, { httpApiStatus: refusals.HolidayOutsideList.status }) { static readonly code = refusals.HolidayOutsideList.code; }
ErrorNames.name(HolidayList.HolidayListNameTaken, "HolidayListNameTaken");
export class HolidayListNameTaken extends Schema.TaggedError<HolidayListNameTaken>()("HolidayListNameTaken", { code: Schema.Literal(refusals.HolidayListNameTaken.code), ...wireStruct(HolidayList.HolidayListNameTaken.fields).fields }, { httpApiStatus: refusals.HolidayListNameTaken.status }) { static readonly code = refusals.HolidayListNameTaken.code; }
ErrorNames.name(HolidayList.HolidayListEndsBeforeStart, "HolidayListEndsBeforeStart");
export class HolidayListEndsBeforeStart extends Schema.TaggedError<HolidayListEndsBeforeStart>()("HolidayListEndsBeforeStart", { code: Schema.Literal(refusals.HolidayListEndsBeforeStart.code), ...wireStruct(HolidayList.HolidayListEndsBeforeStart.fields).fields }, { httpApiStatus: refusals.HolidayListEndsBeforeStart.status }) { static readonly code = refusals.HolidayListEndsBeforeStart.code; }
ErrorNames.name(LeaveAllocation.AllocateeNotInCompany, "AllocateeNotInCompany");
export class AllocateeNotInCompany extends Schema.TaggedError<AllocateeNotInCompany>()("AllocateeNotInCompany", { code: Schema.Literal(refusals.AllocateeNotInCompany.code), ...wireStruct(LeaveAllocation.AllocateeNotInCompany.fields).fields }, { httpApiStatus: refusals.AllocateeNotInCompany.status }) { static readonly code = refusals.AllocateeNotInCompany.code; }
ErrorNames.name(LeaveAllocation.AllocateeHasLeft, "AllocateeHasLeft");
export class AllocateeHasLeft extends Schema.TaggedError<AllocateeHasLeft>()("AllocateeHasLeft", { code: Schema.Literal(refusals.AllocateeHasLeft.code), ...wireStruct(LeaveAllocation.AllocateeHasLeft.fields).fields }, { httpApiStatus: refusals.AllocateeHasLeft.status }) { static readonly code = refusals.AllocateeHasLeft.code; }
ErrorNames.name(LeaveAllocation.AllocationTypeNotInCompany, "AllocationTypeNotInCompany");
export class AllocationTypeNotInCompany extends Schema.TaggedError<AllocationTypeNotInCompany>()("AllocationTypeNotInCompany", { code: Schema.Literal(refusals.AllocationTypeNotInCompany.code), ...wireStruct(LeaveAllocation.AllocationTypeNotInCompany.fields).fields }, { httpApiStatus: refusals.AllocationTypeNotInCompany.status }) { static readonly code = refusals.AllocationTypeNotInCompany.code; }
ErrorNames.name(LeaveAllocation.AllocationEndsBeforeStart, "AllocationEndsBeforeStart");
export class AllocationEndsBeforeStart extends Schema.TaggedError<AllocationEndsBeforeStart>()("AllocationEndsBeforeStart", { code: Schema.Literal(refusals.AllocationEndsBeforeStart.code), ...wireStruct(LeaveAllocation.AllocationEndsBeforeStart.fields).fields }, { httpApiStatus: refusals.AllocationEndsBeforeStart.status }) { static readonly code = refusals.AllocationEndsBeforeStart.code; }
ErrorNames.name(LeaveAllocation.AllocationOverlaps, "AllocationOverlaps");
export class AllocationOverlaps extends Schema.TaggedError<AllocationOverlaps>()("AllocationOverlaps", { code: Schema.Literal(refusals.AllocationOverlaps.code), ...wireStruct(LeaveAllocation.AllocationOverlaps.fields).fields }, { httpApiStatus: refusals.AllocationOverlaps.status }) { static readonly code = refusals.AllocationOverlaps.code; }
ErrorNames.name(LeaveAllocation.LeaveWithoutPayNotAllocated, "LeaveWithoutPayNotAllocated");
export class LeaveWithoutPayNotAllocated extends Schema.TaggedError<LeaveWithoutPayNotAllocated>()("LeaveWithoutPayNotAllocated", { code: Schema.Literal(refusals.LeaveWithoutPayNotAllocated.code), ...wireStruct(LeaveAllocation.LeaveWithoutPayNotAllocated.fields).fields }, { httpApiStatus: refusals.LeaveWithoutPayNotAllocated.status }) { static readonly code = refusals.LeaveWithoutPayNotAllocated.code; }
ErrorNames.name(LeaveAllocation.NoLeavesAllocated, "NoLeavesAllocated");
export class NoLeavesAllocated extends Schema.TaggedError<NoLeavesAllocated>()("NoLeavesAllocated", { code: Schema.Literal(refusals.NoLeavesAllocated.code), ...wireStruct(LeaveAllocation.NoLeavesAllocated.fields).fields }, { httpApiStatus: refusals.NoLeavesAllocated.status }) { static readonly code = refusals.NoLeavesAllocated.code; }
ErrorNames.name(LeaveAllocation.AllocationExceedsPeriod, "AllocationExceedsPeriod");
export class AllocationExceedsPeriod extends Schema.TaggedError<AllocationExceedsPeriod>()("AllocationExceedsPeriod", { code: Schema.Literal(refusals.AllocationExceedsPeriod.code), ...wireStruct(LeaveAllocation.AllocationExceedsPeriod.fields).fields }, { httpApiStatus: refusals.AllocationExceedsPeriod.status }) { static readonly code = refusals.AllocationExceedsPeriod.code; }
ErrorNames.name(LeaveApplication.ApplicantNotInCompany, "ApplicantNotInCompany");
export class ApplicantNotInCompany extends Schema.TaggedError<ApplicantNotInCompany>()("ApplicantNotInCompany", { code: Schema.Literal(refusals.ApplicantNotInCompany.code), ...wireStruct(LeaveApplication.ApplicantNotInCompany.fields).fields }, { httpApiStatus: refusals.ApplicantNotInCompany.status }) { static readonly code = refusals.ApplicantNotInCompany.code; }
ErrorNames.name(LeaveApplication.ApplicantHasLeft, "ApplicantHasLeft");
export class ApplicantHasLeft extends Schema.TaggedError<ApplicantHasLeft>()("ApplicantHasLeft", { code: Schema.Literal(refusals.ApplicantHasLeft.code), ...wireStruct(LeaveApplication.ApplicantHasLeft.fields).fields }, { httpApiStatus: refusals.ApplicantHasLeft.status }) { static readonly code = refusals.ApplicantHasLeft.code; }
ErrorNames.name(LeaveApplication.ApplicationTypeNotInCompany, "ApplicationTypeNotInCompany");
export class ApplicationTypeNotInCompany extends Schema.TaggedError<ApplicationTypeNotInCompany>()("ApplicationTypeNotInCompany", { code: Schema.Literal(refusals.ApplicationTypeNotInCompany.code), ...wireStruct(LeaveApplication.ApplicationTypeNotInCompany.fields).fields }, { httpApiStatus: refusals.ApplicationTypeNotInCompany.status }) { static readonly code = refusals.ApplicationTypeNotInCompany.code; }
ErrorNames.name(LeaveApplication.LeaveEndsBeforeStart, "LeaveEndsBeforeStart");
export class LeaveEndsBeforeStart extends Schema.TaggedError<LeaveEndsBeforeStart>()("LeaveEndsBeforeStart", { code: Schema.Literal(refusals.LeaveEndsBeforeStart.code), ...wireStruct(LeaveApplication.LeaveEndsBeforeStart.fields).fields }, { httpApiStatus: refusals.LeaveEndsBeforeStart.status }) { static readonly code = refusals.LeaveEndsBeforeStart.code; }
ErrorNames.name(LeaveApplication.LeaveBeforeJoining, "LeaveBeforeJoining");
export class LeaveBeforeJoining extends Schema.TaggedError<LeaveBeforeJoining>()("LeaveBeforeJoining", { code: Schema.Literal(refusals.LeaveBeforeJoining.code), ...wireStruct(LeaveApplication.LeaveBeforeJoining.fields).fields }, { httpApiStatus: refusals.LeaveBeforeJoining.status }) { static readonly code = refusals.LeaveBeforeJoining.code; }
ErrorNames.name(LeaveApplication.NoAllocationCovers, "NoAllocationCovers");
export class NoAllocationCovers extends Schema.TaggedError<NoAllocationCovers>()("NoAllocationCovers", { code: Schema.Literal(refusals.NoAllocationCovers.code), ...wireStruct(LeaveApplication.NoAllocationCovers.fields).fields }, { httpApiStatus: refusals.NoAllocationCovers.status }) { static readonly code = refusals.NoAllocationCovers.code; }
ErrorNames.name(LeaveApplication.LeaveAllHolidays, "LeaveAllHolidays");
export class LeaveAllHolidays extends Schema.TaggedError<LeaveAllHolidays>()("LeaveAllHolidays", { code: Schema.Literal(refusals.LeaveAllHolidays.code), ...wireStruct(LeaveApplication.LeaveAllHolidays.fields).fields }, { httpApiStatus: refusals.LeaveAllHolidays.status }) { static readonly code = refusals.LeaveAllHolidays.code; }
ErrorNames.name(LeaveApplication.InsufficientLeaveBalance, "InsufficientLeaveBalance");
export class InsufficientLeaveBalance extends Schema.TaggedError<InsufficientLeaveBalance>()("InsufficientLeaveBalance", { code: Schema.Literal(refusals.InsufficientLeaveBalance.code), ...wireStruct(LeaveApplication.InsufficientLeaveBalance.fields).fields }, { httpApiStatus: refusals.InsufficientLeaveBalance.status }) { static readonly code = refusals.InsufficientLeaveBalance.code; }
ErrorNames.name(LeaveApplication.LeaveOverlaps, "LeaveOverlaps");
export class LeaveOverlaps extends Schema.TaggedError<LeaveOverlaps>()("LeaveOverlaps", { code: Schema.Literal(refusals.LeaveOverlaps.code), ...wireStruct(LeaveApplication.LeaveOverlaps.fields).fields }, { httpApiStatus: refusals.LeaveOverlaps.status }) { static readonly code = refusals.LeaveOverlaps.code; }
ErrorNames.name(LeaveApplication.LeaveTooLong, "LeaveTooLong");
export class LeaveTooLong extends Schema.TaggedError<LeaveTooLong>()("LeaveTooLong", { code: Schema.Literal(refusals.LeaveTooLong.code), ...wireStruct(LeaveApplication.LeaveTooLong.fields).fields }, { httpApiStatus: refusals.LeaveTooLong.status }) { static readonly code = refusals.LeaveTooLong.code; }
ErrorNames.name(LeaveApplication.LeaveDayAttended, "LeaveDayAttended");
export class LeaveDayAttended extends Schema.TaggedError<LeaveDayAttended>()("LeaveDayAttended", { code: Schema.Literal(refusals.LeaveDayAttended.code), ...wireStruct(LeaveApplication.LeaveDayAttended.fields).fields }, { httpApiStatus: refusals.LeaveDayAttended.status }) { static readonly code = refusals.LeaveDayAttended.code; }
ErrorNames.name(LeaveType.LeaveTypeNameTaken, "LeaveTypeNameTaken");
export class LeaveTypeNameTaken extends Schema.TaggedError<LeaveTypeNameTaken>()("LeaveTypeNameTaken", { code: Schema.Literal(refusals.LeaveTypeNameTaken.code), ...wireStruct(LeaveType.LeaveTypeNameTaken.fields).fields }, { httpApiStatus: refusals.LeaveTypeNameTaken.status }) { static readonly code = refusals.LeaveTypeNameTaken.code; }
ErrorNames.name(ShiftType.ShiftTypeNameTaken, "ShiftTypeNameTaken");
export class ShiftTypeNameTaken extends Schema.TaggedError<ShiftTypeNameTaken>()("ShiftTypeNameTaken", { code: Schema.Literal(refusals.ShiftTypeNameTaken.code), ...wireStruct(ShiftType.ShiftTypeNameTaken.fields).fields }, { httpApiStatus: refusals.ShiftTypeNameTaken.status }) { static readonly code = refusals.ShiftTypeNameTaken.code; }
ErrorNames.name(ShiftType.ShiftStartsWhenItEnds, "ShiftStartsWhenItEnds");
export class ShiftStartsWhenItEnds extends Schema.TaggedError<ShiftStartsWhenItEnds>()("ShiftStartsWhenItEnds", { code: Schema.Literal(refusals.ShiftStartsWhenItEnds.code), ...wireStruct(ShiftType.ShiftStartsWhenItEnds.fields).fields }, { httpApiStatus: refusals.ShiftStartsWhenItEnds.status }) { static readonly code = refusals.ShiftStartsWhenItEnds.code; }
export class AttendanceNotMarked extends Schema.TaggedError<AttendanceNotMarked>()("AttendanceNotMarked", { code: Schema.Literal(refusals.AttendanceNotMarked.code), ...{ state: Schema.Literals(["marked"]) } }, { httpApiStatus: refusals.AttendanceNotMarked.status }) { static readonly code = refusals.AttendanceNotMarked.code; }
export class AttendanceRequestNotDraft extends Schema.TaggedError<AttendanceRequestNotDraft>()("AttendanceRequestNotDraft", { code: Schema.Literal(refusals.AttendanceRequestNotDraft.code), ...{ state: Schema.Literals(["draft", "approved", "rejected"]) } }, { httpApiStatus: refusals.AttendanceRequestNotDraft.status }) { static readonly code = refusals.AttendanceRequestNotDraft.code; }
export class BankAccountNotOpen extends Schema.TaggedError<BankAccountNotOpen>()("BankAccountNotOpen", { code: Schema.Literal(refusals.BankAccountNotOpen.code), ...{ state: Schema.Literals(["open", "closed"]) } }, { httpApiStatus: refusals.BankAccountNotOpen.status }) { static readonly code = refusals.BankAccountNotOpen.code; }
export class BranchNotActive extends Schema.TaggedError<BranchNotActive>()("BranchNotActive", { code: Schema.Literal(refusals.BranchNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.BranchNotActive.status }) { static readonly code = refusals.BranchNotActive.code; }
export class BridgeBusinessNotStarted extends Schema.TaggedError<BridgeBusinessNotStarted>()("BridgeBusinessNotStarted", { code: Schema.Literal(refusals.BridgeBusinessNotStarted.code), ...{ state: Schema.Literals(["started", "approved", "rejected"]) } }, { httpApiStatus: refusals.BridgeBusinessNotStarted.status }) { static readonly code = refusals.BridgeBusinessNotStarted.code; }
export class BridgeIndividualNotStarted extends Schema.TaggedError<BridgeIndividualNotStarted>()("BridgeIndividualNotStarted", { code: Schema.Literal(refusals.BridgeIndividualNotStarted.code), ...{ state: Schema.Literals(["started", "approved", "rejected"]) } }, { httpApiStatus: refusals.BridgeIndividualNotStarted.status }) { static readonly code = refusals.BridgeIndividualNotStarted.code; }
export class CompanyNotActive extends Schema.TaggedError<CompanyNotActive>()("CompanyNotActive", { code: Schema.Literal(refusals.CompanyNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.CompanyNotActive.status }) { static readonly code = refusals.CompanyNotActive.code; }
export class DepartmentNotActive extends Schema.TaggedError<DepartmentNotActive>()("DepartmentNotActive", { code: Schema.Literal(refusals.DepartmentNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.DepartmentNotActive.status }) { static readonly code = refusals.DepartmentNotActive.code; }
export class DesignationNotActive extends Schema.TaggedError<DesignationNotActive>()("DesignationNotActive", { code: Schema.Literal(refusals.DesignationNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.DesignationNotActive.status }) { static readonly code = refusals.DesignationNotActive.code; }
export class EmployeeNotActive extends Schema.TaggedError<EmployeeNotActive>()("EmployeeNotActive", { code: Schema.Literal(refusals.EmployeeNotActive.code), ...{ state: Schema.Literals(["active", "left"]) } }, { httpApiStatus: refusals.EmployeeNotActive.status }) { static readonly code = refusals.EmployeeNotActive.code; }
export class EmployeeGradeNotActive extends Schema.TaggedError<EmployeeGradeNotActive>()("EmployeeGradeNotActive", { code: Schema.Literal(refusals.EmployeeGradeNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.EmployeeGradeNotActive.status }) { static readonly code = refusals.EmployeeGradeNotActive.code; }
export class EmploymentTypeNotActive extends Schema.TaggedError<EmploymentTypeNotActive>()("EmploymentTypeNotActive", { code: Schema.Literal(refusals.EmploymentTypeNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.EmploymentTypeNotActive.status }) { static readonly code = refusals.EmploymentTypeNotActive.code; }
export class ExpenseNotActive extends Schema.TaggedError<ExpenseNotActive>()("ExpenseNotActive", { code: Schema.Literal(refusals.ExpenseNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.ExpenseNotActive.status }) { static readonly code = refusals.ExpenseNotActive.code; }
export class ExpenseClaimNotDraft extends Schema.TaggedError<ExpenseClaimNotDraft>()("ExpenseClaimNotDraft", { code: Schema.Literal(refusals.ExpenseClaimNotDraft.code), ...{ state: Schema.Literals(["draft", "approved", "rejected"]) } }, { httpApiStatus: refusals.ExpenseClaimNotDraft.status }) { static readonly code = refusals.ExpenseClaimNotDraft.code; }
export class ExpenseClaimTypeNotActive extends Schema.TaggedError<ExpenseClaimTypeNotActive>()("ExpenseClaimTypeNotActive", { code: Schema.Literal(refusals.ExpenseClaimTypeNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.ExpenseClaimTypeNotActive.status }) { static readonly code = refusals.ExpenseClaimTypeNotActive.code; }
export class HolidayNotActive extends Schema.TaggedError<HolidayNotActive>()("HolidayNotActive", { code: Schema.Literal(refusals.HolidayNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.HolidayNotActive.status }) { static readonly code = refusals.HolidayNotActive.code; }
export class HolidayListNotActive extends Schema.TaggedError<HolidayListNotActive>()("HolidayListNotActive", { code: Schema.Literal(refusals.HolidayListNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.HolidayListNotActive.status }) { static readonly code = refusals.HolidayListNotActive.code; }
export class LeaveAllocationNotDraft extends Schema.TaggedError<LeaveAllocationNotDraft>()("LeaveAllocationNotDraft", { code: Schema.Literal(refusals.LeaveAllocationNotDraft.code), ...{ state: Schema.Literals(["draft", "submitted"]) } }, { httpApiStatus: refusals.LeaveAllocationNotDraft.status }) { static readonly code = refusals.LeaveAllocationNotDraft.code; }
export class LeaveApplicationNotOpen extends Schema.TaggedError<LeaveApplicationNotOpen>()("LeaveApplicationNotOpen", { code: Schema.Literal(refusals.LeaveApplicationNotOpen.code), ...{ state: Schema.Literals(["open", "approved", "rejected", "cancelled"]) } }, { httpApiStatus: refusals.LeaveApplicationNotOpen.status }) { static readonly code = refusals.LeaveApplicationNotOpen.code; }
export class LeaveTypeNotActive extends Schema.TaggedError<LeaveTypeNotActive>()("LeaveTypeNotActive", { code: Schema.Literal(refusals.LeaveTypeNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.LeaveTypeNotActive.status }) { static readonly code = refusals.LeaveTypeNotActive.code; }
export class ShiftTypeNotActive extends Schema.TaggedError<ShiftTypeNotActive>()("ShiftTypeNotActive", { code: Schema.Literal(refusals.ShiftTypeNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.ShiftTypeNotActive.status }) { static readonly code = refusals.ShiftTypeNotActive.code; }
export class BridgeBusinessNotFound extends Schema.TaggedError<BridgeBusinessNotFound>()("BridgeBusinessNotFound", { code: Schema.Literal(refusals.BridgeBusinessNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.BridgeBusinessNotFound.status }) { static readonly code = refusals.BridgeBusinessNotFound.code; }
export class BridgeIndividualNotFound extends Schema.TaggedError<BridgeIndividualNotFound>()("BridgeIndividualNotFound", { code: Schema.Literal(refusals.BridgeIndividualNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.BridgeIndividualNotFound.status }) { static readonly code = refusals.BridgeIndividualNotFound.code; }
export class CompanyNotFound extends Schema.TaggedError<CompanyNotFound>()("CompanyNotFound", { code: Schema.Literal(refusals.CompanyNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.CompanyNotFound.status }) { static readonly code = refusals.CompanyNotFound.code; }
export class DepartmentNotFound extends Schema.TaggedError<DepartmentNotFound>()("DepartmentNotFound", { code: Schema.Literal(refusals.DepartmentNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.DepartmentNotFound.status }) { static readonly code = refusals.DepartmentNotFound.code; }
export class DesignationNotFound extends Schema.TaggedError<DesignationNotFound>()("DesignationNotFound", { code: Schema.Literal(refusals.DesignationNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.DesignationNotFound.status }) { static readonly code = refusals.DesignationNotFound.code; }
export class EmployeeNotFound extends Schema.TaggedError<EmployeeNotFound>()("EmployeeNotFound", { code: Schema.Literal(refusals.EmployeeNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.EmployeeNotFound.status }) { static readonly code = refusals.EmployeeNotFound.code; }
export class ExpenseClaimTypeNotFound extends Schema.TaggedError<ExpenseClaimTypeNotFound>()("ExpenseClaimTypeNotFound", { code: Schema.Literal(refusals.ExpenseClaimTypeNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.ExpenseClaimTypeNotFound.status }) { static readonly code = refusals.ExpenseClaimTypeNotFound.code; }
export class LeaveTypeNotFound extends Schema.TaggedError<LeaveTypeNotFound>()("LeaveTypeNotFound", { code: Schema.Literal(refusals.LeaveTypeNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.LeaveTypeNotFound.status }) { static readonly code = refusals.LeaveTypeNotFound.code; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal(refusals.NotAllowed.code), ...{} }, { httpApiStatus: refusals.NotAllowed.status }) { static readonly code = refusals.NotAllowed.code; }
export class IdempotencyConflict extends Schema.TaggedError<IdempotencyConflict>()("IdempotencyConflict", { code: Schema.Literal(refusals.IdempotencyConflict.code), ...{} }, { httpApiStatus: refusals.IdempotencyConflict.status }) { static readonly code = refusals.IdempotencyConflict.code; }

/** Each refusal's exit code, for the CLI: read from `refusals`. */
export const exits = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.exit])) as { readonly [K in Refusal]: (typeof refusals)[K]["exit"] };

/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. Read from `refusals`. */
export const codes = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.code])) as { readonly [K in Refusal]: (typeof refusals)[K]["code"] };

/** The declared errors themselves, by name: their fields say who may see a value (the visibility rule cuts a refusal by them). */
export const declared = {
  AttendeeNotInCompany: Attendance.AttendeeNotInCompany,
  AttendeeHasLeft: Attendance.AttendeeHasLeft,
  AttendanceBeforeJoining: Attendance.AttendanceBeforeJoining,
  AttendanceAlreadyMarked: Attendance.AttendanceAlreadyMarked,
  AttendanceOnLeave: Attendance.AttendanceOnLeave,
  RequesterNotInCompany: AttendanceRequest.RequesterNotInCompany,
  RequesterHasLeft: AttendanceRequest.RequesterHasLeft,
  RequestEndsBeforeStart: AttendanceRequest.RequestEndsBeforeStart,
  RequestBeforeJoining: AttendanceRequest.RequestBeforeJoining,
  AttendanceRequestOverlaps: AttendanceRequest.AttendanceRequestOverlaps,
  KybNotApproved: BankAccount.KybNotApproved,
  BankAccountNameTaken: BankAccount.BankAccountNameTaken,
  BranchNameTaken: Branch.BranchNameTaken,
  KybAlreadyStarted: BridgeBusiness.KybAlreadyStarted,
  KycAlreadyStarted: BridgeIndividual.KycAlreadyStarted,
  CompanyNameTaken: Company.CompanyNameTaken,
  CompanyAbbrTaken: Company.CompanyAbbrTaken,
  DepartmentNameTaken: Department.DepartmentNameTaken,
  DesignationNameTaken: Designation.DesignationNameTaken,
  EmployeeAlreadyHired: Employee.EmployeeAlreadyHired,
  DepartmentNotInCompany: Employee.DepartmentNotInCompany,
  DesignationNotInCompany: Employee.DesignationNotInCompany,
  JoinedBeforeBorn: Employee.JoinedBeforeBorn,
  RelievedBeforeJoined: Employee.RelievedBeforeJoined,
  EmployeeGradeNameTaken: EmployeeGrade.EmployeeGradeNameTaken,
  EmploymentTypeNameTaken: EmploymentType.EmploymentTypeNameTaken,
  SanctionedOverClaimed: Expense.SanctionedOverClaimed,
  ExpenseTypeNotInCompany: Expense.ExpenseTypeNotInCompany,
  ClaimNotDraft: Expense.ClaimNotDraft,
  ClaimantNotActive: ExpenseClaim.ClaimantNotActive,
  EmployeeNotInCompany: ExpenseClaim.EmployeeNotInCompany,
  ClaimHasNoExpenses: ExpenseClaim.ClaimHasNoExpenses,
  ExpenseTypeTaken: ExpenseClaimType.ExpenseTypeTaken,
  HolidayDateTaken: Holiday.HolidayDateTaken,
  HolidayOutsideList: Holiday.HolidayOutsideList,
  HolidayListNameTaken: HolidayList.HolidayListNameTaken,
  HolidayListEndsBeforeStart: HolidayList.HolidayListEndsBeforeStart,
  AllocateeNotInCompany: LeaveAllocation.AllocateeNotInCompany,
  AllocateeHasLeft: LeaveAllocation.AllocateeHasLeft,
  AllocationTypeNotInCompany: LeaveAllocation.AllocationTypeNotInCompany,
  AllocationEndsBeforeStart: LeaveAllocation.AllocationEndsBeforeStart,
  AllocationOverlaps: LeaveAllocation.AllocationOverlaps,
  LeaveWithoutPayNotAllocated: LeaveAllocation.LeaveWithoutPayNotAllocated,
  NoLeavesAllocated: LeaveAllocation.NoLeavesAllocated,
  AllocationExceedsPeriod: LeaveAllocation.AllocationExceedsPeriod,
  ApplicantNotInCompany: LeaveApplication.ApplicantNotInCompany,
  ApplicantHasLeft: LeaveApplication.ApplicantHasLeft,
  ApplicationTypeNotInCompany: LeaveApplication.ApplicationTypeNotInCompany,
  LeaveEndsBeforeStart: LeaveApplication.LeaveEndsBeforeStart,
  LeaveBeforeJoining: LeaveApplication.LeaveBeforeJoining,
  NoAllocationCovers: LeaveApplication.NoAllocationCovers,
  LeaveAllHolidays: LeaveApplication.LeaveAllHolidays,
  InsufficientLeaveBalance: LeaveApplication.InsufficientLeaveBalance,
  LeaveOverlaps: LeaveApplication.LeaveOverlaps,
  LeaveTooLong: LeaveApplication.LeaveTooLong,
  LeaveDayAttended: LeaveApplication.LeaveDayAttended,
  LeaveTypeNameTaken: LeaveType.LeaveTypeNameTaken,
  ShiftTypeNameTaken: ShiftType.ShiftTypeNameTaken,
  ShiftStartsWhenItEnds: ShiftType.ShiftStartsWhenItEnds,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { AttendeeNotInCompany, AttendeeHasLeft, AttendanceBeforeJoining, AttendanceAlreadyMarked, AttendanceOnLeave, RequesterNotInCompany, RequesterHasLeft, RequestEndsBeforeStart, RequestBeforeJoining, AttendanceRequestOverlaps, KybNotApproved, BankAccountNameTaken, BranchNameTaken, KybAlreadyStarted, KycAlreadyStarted, CompanyNameTaken, CompanyAbbrTaken, DepartmentNameTaken, DesignationNameTaken, EmployeeAlreadyHired, DepartmentNotInCompany, DesignationNotInCompany, JoinedBeforeBorn, RelievedBeforeJoined, EmployeeGradeNameTaken, EmploymentTypeNameTaken, SanctionedOverClaimed, ExpenseTypeNotInCompany, ClaimNotDraft, ClaimantNotActive, EmployeeNotInCompany, ClaimHasNoExpenses, ExpenseTypeTaken, HolidayDateTaken, HolidayOutsideList, HolidayListNameTaken, HolidayListEndsBeforeStart, AllocateeNotInCompany, AllocateeHasLeft, AllocationTypeNotInCompany, AllocationEndsBeforeStart, AllocationOverlaps, LeaveWithoutPayNotAllocated, NoLeavesAllocated, AllocationExceedsPeriod, ApplicantNotInCompany, ApplicantHasLeft, ApplicationTypeNotInCompany, LeaveEndsBeforeStart, LeaveBeforeJoining, NoAllocationCovers, LeaveAllHolidays, InsufficientLeaveBalance, LeaveOverlaps, LeaveTooLong, LeaveDayAttended, LeaveTypeNameTaken, ShiftTypeNameTaken, ShiftStartsWhenItEnds, AttendanceNotMarked, AttendanceRequestNotDraft, BankAccountNotOpen, BranchNotActive, BridgeBusinessNotStarted, BridgeIndividualNotStarted, CompanyNotActive, DepartmentNotActive, DesignationNotActive, EmployeeNotActive, EmployeeGradeNotActive, EmploymentTypeNotActive, ExpenseNotActive, ExpenseClaimNotDraft, ExpenseClaimTypeNotActive, HolidayNotActive, HolidayListNotActive, LeaveAllocationNotDraft, LeaveApplicationNotOpen, LeaveTypeNotActive, ShiftTypeNotActive, BridgeBusinessNotFound, BridgeIndividualNotFound, CompanyNotFound, DepartmentNotFound, DesignationNotFound, EmployeeNotFound, ExpenseClaimTypeNotFound, LeaveTypeNotFound, NotAllowed, IdempotencyConflict };
