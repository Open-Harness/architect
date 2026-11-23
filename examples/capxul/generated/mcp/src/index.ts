// Generated from the blueprint. Do not edit.
import type { McpEntry } from "@orthograph/language-effect";
import { declaration as companyCreate } from "../../api/src/company/create.ts";
import { declaration as companyGet } from "../../api/src/company/get.ts";
import { declaration as departmentCreate } from "../../api/src/department/create.ts";
import { declaration as departmentGet } from "../../api/src/department/get.ts";
import { declaration as designationCreate } from "../../api/src/designation/create.ts";
import { declaration as designationGet } from "../../api/src/designation/get.ts";
import { declaration as employeeGet } from "../../api/src/employee/get.ts";
import { declaration as employeeHire } from "../../api/src/employee/hire.ts";
import { declaration as employeeRelieve } from "../../api/src/employee/relieve.ts";

/** One tool per operation and read, named as the operation is. */
export const catalog = {
  "company.create": { description: "Set up a company; the person who sets it up runs it.", operation: companyCreate, states: ["active"], move: {"key":"create","from":[],"to":["active"],"emits":"CompanyCreated"} },
  "company.get": { description: "Read one company by its id: companyName, abbr, country, defaultCurrency, owner, state.", operation: companyGet, states: ["active"] },
  "department.create": { description: "Add a department to a company. Refuses DepartmentNameTaken when another department holds this company and department name.", operation: departmentCreate, states: ["active"], move: {"key":"create","from":[],"to":["active"],"emits":"DepartmentCreated"} },
  "department.get": { description: "Read one department by its id: company, departmentName, state.", operation: departmentGet, states: ["active"] },
  "designation.create": { description: "Add a job title to a company. Refuses DesignationNameTaken when another designation holds this company and designation name.", operation: designationCreate, states: ["active"], move: {"key":"create","from":[],"to":["active"],"emits":"DesignationCreated"} },
  "designation.get": { description: "Read one designation by its id: company, designationName, state.", operation: designationGet, states: ["active"] },
  "employee.get": { description: "Read one employee by its id: company, person, firstName, gender, dateOfBirth, dateOfJoining, department, designation, state.", operation: employeeGet, states: ["active","left"] },
  "employee.hire": { description: "Hire a person into a company, placed in one of its departments under one of its job titles. Refuses EmployeeAlreadyHired when another active employee holds this company and person.", operation: employeeHire, states: ["active","left"], move: {"key":"hire","from":[],"to":["active"],"emits":"EmployeeHired"} },
  "employee.relieve": { description: "Record that an employee has left the company, on the day they were relieved.", operation: employeeRelieve, states: ["active","left"], move: {"key":"relieve","from":["active"],"to":["left"],"emits":"EmployeeRelieved"} },
} as const satisfies { readonly [name: string]: McpEntry };
