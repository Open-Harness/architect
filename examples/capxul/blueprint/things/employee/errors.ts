import { Blueprint } from "orthograph";
import { Employee } from "./thing.ts";
import { Day } from "../../values/employee.ts";

// Refusals that depend on data. The machine's own refusal, EmployeeNotActive, is generated and never written here.
export class EmployeeAlreadyHired extends Blueprint.error({ person: Employee.fields.person }, { exit: 41 }) {}
/** The department named belongs to another company. */
export class DepartmentNotInCompany extends Blueprint.error({}, { exit: 42 }) {}
/** The designation named belongs to another company. */
export class DesignationNotInCompany extends Blueprint.error({}, { exit: 43 }) {}
/** ERPNext: "Date of Joining must be greater than Date of Birth". */
export class JoinedBeforeBorn extends Blueprint.error({ dateOfBirth: Day }, { exit: 44 }) {}
/** ERPNext: "Relieving Date must be greater than or equal to Date of Joining". */
export class RelievedBeforeJoined extends Blueprint.error({ dateOfJoining: Day }, { exit: 45 }) {}
