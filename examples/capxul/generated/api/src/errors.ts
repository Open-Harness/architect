// Generated from the blueprint. Do not edit.
import { Schema } from "effect";
import { ErrorNames, wireStruct } from "orthograph/server";
import * as BankAccount from "../../../blueprint/things/bank-account/errors.ts";
import * as BridgeBusiness from "../../../blueprint/things/bridge-business/errors.ts";
import * as BridgeIndividual from "../../../blueprint/things/bridge-individual/errors.ts";
import * as Company from "../../../blueprint/things/company/errors.ts";
import * as Department from "../../../blueprint/things/department/errors.ts";
import * as Designation from "../../../blueprint/things/designation/errors.ts";
import * as Employee from "../../../blueprint/things/employee/errors.ts";
import * as Holiday from "../../../blueprint/things/holiday/errors.ts";
import * as HolidayList from "../../../blueprint/things/holiday-list/errors.ts";

/** Every refusal's code, its exit for the CLI and its HTTP status: one row each, read by the CLI, HTTP and MCP. */
export const refusals = {
  KybNotApproved: { code: "BA-001", exit: 41, status: 422 },
  BankAccountNameTaken: { code: "BA-002", exit: 42, status: 422 },
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
  HolidayDateTaken: { code: "HD-001", exit: 41, status: 422 },
  HolidayOutsideList: { code: "HD-002", exit: 42, status: 422 },
  HolidayListNameTaken: { code: "HL-001", exit: 43, status: 422 },
  HolidayListEndsBeforeStart: { code: "HL-002", exit: 44, status: 422 },
  BankAccountNotOpen: { code: "BA-900", exit: 40, status: 409 },
  BridgeBusinessNotStarted: { code: "KB-900", exit: 40, status: 409 },
  BridgeIndividualNotStarted: { code: "KC-900", exit: 40, status: 409 },
  CompanyNotActive: { code: "CO-900", exit: 40, status: 409 },
  DepartmentNotActive: { code: "DE-900", exit: 40, status: 409 },
  DesignationNotActive: { code: "DS-900", exit: 40, status: 409 },
  EmployeeNotActive: { code: "EM-900", exit: 40, status: 409 },
  HolidayNotActive: { code: "HD-900", exit: 40, status: 409 },
  HolidayListNotActive: { code: "HL-900", exit: 40, status: 409 },
  BridgeBusinessNotFound: { code: "KB-901", exit: 4, status: 404 },
  BridgeIndividualNotFound: { code: "KC-901", exit: 4, status: 404 },
  DepartmentNotFound: { code: "DE-901", exit: 4, status: 404 },
  DesignationNotFound: { code: "DS-901", exit: 4, status: 404 },
  NotAllowed: { code: "AR-001", exit: 3, status: 403 },
  IdempotencyConflict: { code: "AR-002", exit: 120, status: 409 },
} as const;
type Refusal = keyof typeof refusals;

ErrorNames.name(BankAccount.KybNotApproved, "KybNotApproved");
export class KybNotApproved extends Schema.TaggedError<KybNotApproved>()("KybNotApproved", { code: Schema.Literal(refusals.KybNotApproved.code), ...wireStruct(BankAccount.KybNotApproved.fields).fields }, { httpApiStatus: refusals.KybNotApproved.status }) { static readonly code = refusals.KybNotApproved.code; }
ErrorNames.name(BankAccount.BankAccountNameTaken, "BankAccountNameTaken");
export class BankAccountNameTaken extends Schema.TaggedError<BankAccountNameTaken>()("BankAccountNameTaken", { code: Schema.Literal(refusals.BankAccountNameTaken.code), ...wireStruct(BankAccount.BankAccountNameTaken.fields).fields }, { httpApiStatus: refusals.BankAccountNameTaken.status }) { static readonly code = refusals.BankAccountNameTaken.code; }
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
ErrorNames.name(Holiday.HolidayDateTaken, "HolidayDateTaken");
export class HolidayDateTaken extends Schema.TaggedError<HolidayDateTaken>()("HolidayDateTaken", { code: Schema.Literal(refusals.HolidayDateTaken.code), ...wireStruct(Holiday.HolidayDateTaken.fields).fields }, { httpApiStatus: refusals.HolidayDateTaken.status }) { static readonly code = refusals.HolidayDateTaken.code; }
ErrorNames.name(Holiday.HolidayOutsideList, "HolidayOutsideList");
export class HolidayOutsideList extends Schema.TaggedError<HolidayOutsideList>()("HolidayOutsideList", { code: Schema.Literal(refusals.HolidayOutsideList.code), ...wireStruct(Holiday.HolidayOutsideList.fields).fields }, { httpApiStatus: refusals.HolidayOutsideList.status }) { static readonly code = refusals.HolidayOutsideList.code; }
ErrorNames.name(HolidayList.HolidayListNameTaken, "HolidayListNameTaken");
export class HolidayListNameTaken extends Schema.TaggedError<HolidayListNameTaken>()("HolidayListNameTaken", { code: Schema.Literal(refusals.HolidayListNameTaken.code), ...wireStruct(HolidayList.HolidayListNameTaken.fields).fields }, { httpApiStatus: refusals.HolidayListNameTaken.status }) { static readonly code = refusals.HolidayListNameTaken.code; }
ErrorNames.name(HolidayList.HolidayListEndsBeforeStart, "HolidayListEndsBeforeStart");
export class HolidayListEndsBeforeStart extends Schema.TaggedError<HolidayListEndsBeforeStart>()("HolidayListEndsBeforeStart", { code: Schema.Literal(refusals.HolidayListEndsBeforeStart.code), ...wireStruct(HolidayList.HolidayListEndsBeforeStart.fields).fields }, { httpApiStatus: refusals.HolidayListEndsBeforeStart.status }) { static readonly code = refusals.HolidayListEndsBeforeStart.code; }
export class BankAccountNotOpen extends Schema.TaggedError<BankAccountNotOpen>()("BankAccountNotOpen", { code: Schema.Literal(refusals.BankAccountNotOpen.code), ...{ state: Schema.Literals(["open", "closed"]) } }, { httpApiStatus: refusals.BankAccountNotOpen.status }) { static readonly code = refusals.BankAccountNotOpen.code; }
export class BridgeBusinessNotStarted extends Schema.TaggedError<BridgeBusinessNotStarted>()("BridgeBusinessNotStarted", { code: Schema.Literal(refusals.BridgeBusinessNotStarted.code), ...{ state: Schema.Literals(["started", "approved", "rejected"]) } }, { httpApiStatus: refusals.BridgeBusinessNotStarted.status }) { static readonly code = refusals.BridgeBusinessNotStarted.code; }
export class BridgeIndividualNotStarted extends Schema.TaggedError<BridgeIndividualNotStarted>()("BridgeIndividualNotStarted", { code: Schema.Literal(refusals.BridgeIndividualNotStarted.code), ...{ state: Schema.Literals(["started", "approved", "rejected"]) } }, { httpApiStatus: refusals.BridgeIndividualNotStarted.status }) { static readonly code = refusals.BridgeIndividualNotStarted.code; }
export class CompanyNotActive extends Schema.TaggedError<CompanyNotActive>()("CompanyNotActive", { code: Schema.Literal(refusals.CompanyNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.CompanyNotActive.status }) { static readonly code = refusals.CompanyNotActive.code; }
export class DepartmentNotActive extends Schema.TaggedError<DepartmentNotActive>()("DepartmentNotActive", { code: Schema.Literal(refusals.DepartmentNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.DepartmentNotActive.status }) { static readonly code = refusals.DepartmentNotActive.code; }
export class DesignationNotActive extends Schema.TaggedError<DesignationNotActive>()("DesignationNotActive", { code: Schema.Literal(refusals.DesignationNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.DesignationNotActive.status }) { static readonly code = refusals.DesignationNotActive.code; }
export class EmployeeNotActive extends Schema.TaggedError<EmployeeNotActive>()("EmployeeNotActive", { code: Schema.Literal(refusals.EmployeeNotActive.code), ...{ state: Schema.Literals(["active", "left"]) } }, { httpApiStatus: refusals.EmployeeNotActive.status }) { static readonly code = refusals.EmployeeNotActive.code; }
export class HolidayNotActive extends Schema.TaggedError<HolidayNotActive>()("HolidayNotActive", { code: Schema.Literal(refusals.HolidayNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.HolidayNotActive.status }) { static readonly code = refusals.HolidayNotActive.code; }
export class HolidayListNotActive extends Schema.TaggedError<HolidayListNotActive>()("HolidayListNotActive", { code: Schema.Literal(refusals.HolidayListNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.HolidayListNotActive.status }) { static readonly code = refusals.HolidayListNotActive.code; }
export class BridgeBusinessNotFound extends Schema.TaggedError<BridgeBusinessNotFound>()("BridgeBusinessNotFound", { code: Schema.Literal(refusals.BridgeBusinessNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.BridgeBusinessNotFound.status }) { static readonly code = refusals.BridgeBusinessNotFound.code; }
export class BridgeIndividualNotFound extends Schema.TaggedError<BridgeIndividualNotFound>()("BridgeIndividualNotFound", { code: Schema.Literal(refusals.BridgeIndividualNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.BridgeIndividualNotFound.status }) { static readonly code = refusals.BridgeIndividualNotFound.code; }
export class DepartmentNotFound extends Schema.TaggedError<DepartmentNotFound>()("DepartmentNotFound", { code: Schema.Literal(refusals.DepartmentNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.DepartmentNotFound.status }) { static readonly code = refusals.DepartmentNotFound.code; }
export class DesignationNotFound extends Schema.TaggedError<DesignationNotFound>()("DesignationNotFound", { code: Schema.Literal(refusals.DesignationNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.DesignationNotFound.status }) { static readonly code = refusals.DesignationNotFound.code; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal(refusals.NotAllowed.code), ...{} }, { httpApiStatus: refusals.NotAllowed.status }) { static readonly code = refusals.NotAllowed.code; }
export class IdempotencyConflict extends Schema.TaggedError<IdempotencyConflict>()("IdempotencyConflict", { code: Schema.Literal(refusals.IdempotencyConflict.code), ...{} }, { httpApiStatus: refusals.IdempotencyConflict.status }) { static readonly code = refusals.IdempotencyConflict.code; }

/** Each refusal's exit code, for the CLI: read from `refusals`. */
export const exits = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.exit])) as { readonly [K in Refusal]: (typeof refusals)[K]["exit"] };

/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. Read from `refusals`. */
export const codes = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.code])) as { readonly [K in Refusal]: (typeof refusals)[K]["code"] };

/** The declared errors themselves, by name: their fields say who may see a value (the visibility rule cuts a refusal by them). */
export const declared = {
  KybNotApproved: BankAccount.KybNotApproved,
  BankAccountNameTaken: BankAccount.BankAccountNameTaken,
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
  HolidayDateTaken: Holiday.HolidayDateTaken,
  HolidayOutsideList: Holiday.HolidayOutsideList,
  HolidayListNameTaken: HolidayList.HolidayListNameTaken,
  HolidayListEndsBeforeStart: HolidayList.HolidayListEndsBeforeStart,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { KybNotApproved, BankAccountNameTaken, KybAlreadyStarted, KycAlreadyStarted, CompanyNameTaken, CompanyAbbrTaken, DepartmentNameTaken, DesignationNameTaken, EmployeeAlreadyHired, DepartmentNotInCompany, DesignationNotInCompany, JoinedBeforeBorn, RelievedBeforeJoined, HolidayDateTaken, HolidayOutsideList, HolidayListNameTaken, HolidayListEndsBeforeStart, BankAccountNotOpen, BridgeBusinessNotStarted, BridgeIndividualNotStarted, CompanyNotActive, DepartmentNotActive, DesignationNotActive, EmployeeNotActive, HolidayNotActive, HolidayListNotActive, BridgeBusinessNotFound, BridgeIndividualNotFound, DepartmentNotFound, DesignationNotFound, NotAllowed, IdempotencyConflict };
