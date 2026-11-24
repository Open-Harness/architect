// Generated from the blueprint. Do not edit.
import { HttpApi, HttpApiGroup } from "effect/http-api";
import * as bankAccountClose from "./bank-account/close.ts";
import * as bankAccountGet from "./bank-account/get.ts";
import * as bankAccountOpen from "./bank-account/open.ts";
import * as branchCreate from "./branch/create.ts";
import * as branchGet from "./branch/get.ts";
import * as bridgeBusinessApprove from "./bridge-business/approve.ts";
import * as bridgeBusinessGet from "./bridge-business/get.ts";
import * as bridgeBusinessReject from "./bridge-business/reject.ts";
import * as bridgeBusinessStart from "./bridge-business/start.ts";
import * as bridgeIndividualApprove from "./bridge-individual/approve.ts";
import * as bridgeIndividualGet from "./bridge-individual/get.ts";
import * as bridgeIndividualReject from "./bridge-individual/reject.ts";
import * as bridgeIndividualStart from "./bridge-individual/start.ts";
import * as companyCreate from "./company/create.ts";
import * as companyGet from "./company/get.ts";
import * as departmentCreate from "./department/create.ts";
import * as departmentGet from "./department/get.ts";
import * as designationCreate from "./designation/create.ts";
import * as designationGet from "./designation/get.ts";
import * as employeeGet from "./employee/get.ts";
import * as employeeHire from "./employee/hire.ts";
import * as employeeRelieve from "./employee/relieve.ts";
import * as employeeGradeCreate from "./employee-grade/create.ts";
import * as employeeGradeGet from "./employee-grade/get.ts";

export class BankAccount extends HttpApiGroup.make("bank-account").add(bankAccountClose.endpoint).add(bankAccountGet.endpoint).add(bankAccountOpen.endpoint) {}
export class Branch extends HttpApiGroup.make("branch").add(branchCreate.endpoint).add(branchGet.endpoint) {}
export class BridgeBusiness extends HttpApiGroup.make("bridge-business").add(bridgeBusinessApprove.endpoint).add(bridgeBusinessGet.endpoint).add(bridgeBusinessReject.endpoint).add(bridgeBusinessStart.endpoint) {}
export class BridgeIndividual extends HttpApiGroup.make("bridge-individual").add(bridgeIndividualApprove.endpoint).add(bridgeIndividualGet.endpoint).add(bridgeIndividualReject.endpoint).add(bridgeIndividualStart.endpoint) {}
export class Company extends HttpApiGroup.make("company").add(companyCreate.endpoint).add(companyGet.endpoint) {}
export class Department extends HttpApiGroup.make("department").add(departmentCreate.endpoint).add(departmentGet.endpoint) {}
export class Designation extends HttpApiGroup.make("designation").add(designationCreate.endpoint).add(designationGet.endpoint) {}
export class Employee extends HttpApiGroup.make("employee").add(employeeGet.endpoint).add(employeeHire.endpoint).add(employeeRelieve.endpoint) {}
export class EmployeeGrade extends HttpApiGroup.make("employee-grade").add(employeeGradeCreate.endpoint).add(employeeGradeGet.endpoint) {}
export class Api extends HttpApi.make("capxul").add(BankAccount).add(Branch).add(BridgeBusiness).add(BridgeIndividual).add(Company).add(Department).add(Designation).add(Employee).add(EmployeeGrade) {}

export * as Errors from "./errors.ts";
export * as Events from "./events.ts";
export const operations = { "bank-account.close": bankAccountClose, "bank-account.get": bankAccountGet, "bank-account.open": bankAccountOpen, "branch.create": branchCreate, "branch.get": branchGet, "bridge-business.approve": bridgeBusinessApprove, "bridge-business.get": bridgeBusinessGet, "bridge-business.reject": bridgeBusinessReject, "bridge-business.start": bridgeBusinessStart, "bridge-individual.approve": bridgeIndividualApprove, "bridge-individual.get": bridgeIndividualGet, "bridge-individual.reject": bridgeIndividualReject, "bridge-individual.start": bridgeIndividualStart, "company.create": companyCreate, "company.get": companyGet, "department.create": departmentCreate, "department.get": departmentGet, "designation.create": designationCreate, "designation.get": designationGet, "employee.get": employeeGet, "employee.hire": employeeHire, "employee.relieve": employeeRelieve, "employee-grade.create": employeeGradeCreate, "employee-grade.get": employeeGradeGet } as const;
