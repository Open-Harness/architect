// Generated from the blueprint. Do not edit.
import { HttpApi, HttpApiGroup } from "effect/http-api";
import * as companyCreate from "./company/create.ts";
import * as companyGet from "./company/get.ts";
import * as departmentCreate from "./department/create.ts";
import * as departmentGet from "./department/get.ts";
import * as designationCreate from "./designation/create.ts";
import * as designationGet from "./designation/get.ts";
import * as employeeGet from "./employee/get.ts";
import * as employeeHire from "./employee/hire.ts";
import * as employeeRelieve from "./employee/relieve.ts";

export class Company extends HttpApiGroup.make("company").add(companyCreate.endpoint).add(companyGet.endpoint) {}
export class Department extends HttpApiGroup.make("department").add(departmentCreate.endpoint).add(departmentGet.endpoint) {}
export class Designation extends HttpApiGroup.make("designation").add(designationCreate.endpoint).add(designationGet.endpoint) {}
export class Employee extends HttpApiGroup.make("employee").add(employeeGet.endpoint).add(employeeHire.endpoint).add(employeeRelieve.endpoint) {}
export class Api extends HttpApi.make("capxul").add(Company).add(Department).add(Designation).add(Employee) {}

export * as Errors from "./errors.ts";
export * as Events from "./events.ts";
export const operations = { "company.create": companyCreate, "company.get": companyGet, "department.create": departmentCreate, "department.get": departmentGet, "designation.create": designationCreate, "designation.get": designationGet, "employee.get": employeeGet, "employee.hire": employeeHire, "employee.relieve": employeeRelieve } as const;
