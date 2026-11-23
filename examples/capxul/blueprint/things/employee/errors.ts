import { Blueprint } from "orthograph";
import { Employee } from "./thing.ts";
import { Day } from "../../values/employee.ts";

// Refusals that depend on data. The machine's own refusal, EmployeeNotActive, is generated and never written here.
export class EmployeeAlreadyHired extends Blueprint.error({ person: Employee.fields.person }, { exit: 41 }) {}
/** The department named belongs to another company. */
export class DepartmentNotInCompany extends Blueprint.error({}, { exit: 42 }) {}
/** The designation named belongs to another company. */
export class DesignationNotInCompany extends Blueprint.error({}, { exit: 43 }) {}
/** A joining day before the birthday. ERPNext v15 (`employee.py`, `validate_from_to_dates("date_of_birth", "date_of_joining")`) allows the same day. */
export class JoinedBeforeBorn extends Blueprint.error({ dateOfBirth: Day }, { exit: 44 }) {}
/** A relieving day before the joining day; the same day is allowed (`validate_from_to_dates("date_of_joining", "relieving_date")`). */
export class RelievedBeforeJoined extends Blueprint.error({ dateOfJoining: Day }, { exit: 45 }) {}
