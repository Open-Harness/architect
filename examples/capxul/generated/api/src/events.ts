// Generated from the blueprint. Do not edit.
import { EventNames } from "orthograph/server";
import * as Company from "../../../blueprint/things/company/events.ts";
import * as Department from "../../../blueprint/things/department/events.ts";
import * as Designation from "../../../blueprint/things/designation/events.ts";
import * as Employee from "../../../blueprint/things/employee/events.ts";

EventNames.name(Company.CompanyCreated, "CompanyCreated");
EventNames.name(Department.DepartmentCreated, "DepartmentCreated");
EventNames.name(Designation.DesignationCreated, "DesignationCreated");
EventNames.name(Employee.EmployeeHired, "EmployeeHired");
EventNames.name(Employee.EmployeeRelieved, "EmployeeRelieved");

export const names = ["CompanyCreated", "DepartmentCreated", "DesignationCreated", "EmployeeHired", "EmployeeRelieved"] as const;
