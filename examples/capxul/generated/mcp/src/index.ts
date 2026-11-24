// Generated from the blueprint. Do not edit.
import type { McpEntry } from "@orthograph/language-effect";
import { declaration as bankAccountClose } from "../../api/src/bank-account/close.ts";
import { declaration as bankAccountGet } from "../../api/src/bank-account/get.ts";
import { declaration as bankAccountOpen } from "../../api/src/bank-account/open.ts";
import { declaration as branchCreate } from "../../api/src/branch/create.ts";
import { declaration as branchGet } from "../../api/src/branch/get.ts";
import { declaration as bridgeBusinessApprove } from "../../api/src/bridge-business/approve.ts";
import { declaration as bridgeBusinessGet } from "../../api/src/bridge-business/get.ts";
import { declaration as bridgeBusinessReject } from "../../api/src/bridge-business/reject.ts";
import { declaration as bridgeBusinessStart } from "../../api/src/bridge-business/start.ts";
import { declaration as bridgeIndividualApprove } from "../../api/src/bridge-individual/approve.ts";
import { declaration as bridgeIndividualGet } from "../../api/src/bridge-individual/get.ts";
import { declaration as bridgeIndividualReject } from "../../api/src/bridge-individual/reject.ts";
import { declaration as bridgeIndividualStart } from "../../api/src/bridge-individual/start.ts";
import { declaration as companyCreate } from "../../api/src/company/create.ts";
import { declaration as companyGet } from "../../api/src/company/get.ts";
import { declaration as departmentCreate } from "../../api/src/department/create.ts";
import { declaration as departmentGet } from "../../api/src/department/get.ts";
import { declaration as designationCreate } from "../../api/src/designation/create.ts";
import { declaration as designationGet } from "../../api/src/designation/get.ts";
import { declaration as employeeGet } from "../../api/src/employee/get.ts";
import { declaration as employeeHire } from "../../api/src/employee/hire.ts";
import { declaration as employeeRelieve } from "../../api/src/employee/relieve.ts";
import { declaration as employeeGradeCreate } from "../../api/src/employee-grade/create.ts";
import { declaration as employeeGradeGet } from "../../api/src/employee-grade/get.ts";
import { declaration as holidayAdd } from "../../api/src/holiday/add.ts";
import { declaration as holidayGet } from "../../api/src/holiday/get.ts";
import { declaration as holidayListAddWeeklyOff } from "../../api/src/holiday-list/add-weekly-off.ts";
import { declaration as holidayListCreate } from "../../api/src/holiday-list/create.ts";
import { declaration as holidayListGet } from "../../api/src/holiday-list/get.ts";

/** One tool per operation and read, named as the operation is. */
export const catalog = {
  "bank-account.close": { description: "Close a company's bank account; it takes no more deposits.", operation: bankAccountClose, states: ["open","closed"], move: {"key":"close","from":["open"],"to":["closed"],"emits":"BankAccountClosed"} },
  "bank-account.get": { description: "Read one bank-account by its id: company, business, accountName, currency, bankName, accountNumber, routingNumber, state.", operation: bankAccountGet, states: ["open","closed"] },
  "bank-account.open": { description: "Open a bank account for a company whose KYB Bridge approved: answers where to send deposits. Refuses BankAccountNameTaken when another open bank account holds this company and account name.", operation: bankAccountOpen, states: ["open","closed"], move: {"key":"open","from":[],"to":["open"],"emits":"BankAccountOpened"} },
  "branch.create": { description: "Add a branch to a company. Refuses BranchNameTaken when another branch holds this company and branch name.", operation: branchCreate, states: ["active"], move: {"key":"create","from":[],"to":["active"],"emits":"BranchCreated"} },
  "branch.get": { description: "Read one branch by its id: company, branchName, state.", operation: branchGet, states: ["active"] },
  "bridge-business.approve": { description: "Record that Bridge approved a company's KYB. Refuses KybAlreadyStarted when another bridge business holds this company.", operation: bridgeBusinessApprove, states: ["started","approved","rejected"], move: {"key":"approve","from":["started"],"to":["approved"],"emits":"KybApproved"} },
  "bridge-business.get": { description: "Read one bridge-business by its id: company, legalName, email, kybLink, tosLink, state.", operation: bridgeBusinessGet, states: ["started","approved","rejected"] },
  "bridge-business.reject": { description: "Record that Bridge turned down a company's KYB, and why. Refuses KybAlreadyStarted when another bridge business holds this company.", operation: bridgeBusinessReject, states: ["started","approved","rejected"], move: {"key":"reject","from":["started"],"to":["rejected"],"emits":"KybRejected"} },
  "bridge-business.start": { description: "Start a company's KYB with Bridge: answers the form the business fills in, and Bridge's terms. Refuses KybAlreadyStarted when another bridge business holds this company.", operation: bridgeBusinessStart, states: ["started","approved","rejected"], move: {"key":"start","from":[],"to":["started"],"emits":"KybStarted"} },
  "bridge-individual.approve": { description: "Record that Bridge approved a person's KYC. Refuses KycAlreadyStarted when another bridge individual holds this person.", operation: bridgeIndividualApprove, states: ["started","approved","rejected"], move: {"key":"approve","from":["started"],"to":["approved"],"emits":"KycApproved"} },
  "bridge-individual.get": { description: "Read one bridge-individual by its id: person, fullName, email, kycLink, tosLink, state.", operation: bridgeIndividualGet, states: ["started","approved","rejected"] },
  "bridge-individual.reject": { description: "Record that Bridge turned down a person's KYC, and why. Refuses KycAlreadyStarted when another bridge individual holds this person.", operation: bridgeIndividualReject, states: ["started","approved","rejected"], move: {"key":"reject","from":["started"],"to":["rejected"],"emits":"KycRejected"} },
  "bridge-individual.start": { description: "Start your own KYC with Bridge: answers the form you fill in, and Bridge's terms. Refuses KycAlreadyStarted when another bridge individual holds this person.", operation: bridgeIndividualStart, states: ["started","approved","rejected"], move: {"key":"start","from":[],"to":["started"],"emits":"KycStarted"} },
  "company.create": { description: "Set up a company; the person who sets it up runs it. Refuses CompanyAbbrTaken when another company holds this owner and abbr. Refuses CompanyNameTaken when another company holds this owner and company name.", operation: companyCreate, states: ["active"], move: {"key":"create","from":[],"to":["active"],"emits":"CompanyCreated"} },
  "company.get": { description: "Read one company by its id: companyName, abbr, country, defaultCurrency, owner, state.", operation: companyGet, states: ["active"] },
  "department.create": { description: "Add a department to a company. Refuses DepartmentNameTaken when another department holds this company and department name.", operation: departmentCreate, states: ["active"], move: {"key":"create","from":[],"to":["active"],"emits":"DepartmentCreated"} },
  "department.get": { description: "Read one department by its id: company, departmentName, state.", operation: departmentGet, states: ["active"] },
  "designation.create": { description: "Add a job title to a company. Refuses DesignationNameTaken when another designation holds this company and designation name.", operation: designationCreate, states: ["active"], move: {"key":"create","from":[],"to":["active"],"emits":"DesignationCreated"} },
  "designation.get": { description: "Read one designation by its id: company, designationName, state.", operation: designationGet, states: ["active"] },
  "employee.get": { description: "Read one employee by its id: company, person, firstName, gender, dateOfBirth, dateOfJoining, department, designation, state.", operation: employeeGet, states: ["active","left"] },
  "employee.hire": { description: "Hire a person into a company, placed in one of its departments under one of its job titles. Refuses EmployeeAlreadyHired when another active employee holds this company and person.", operation: employeeHire, states: ["active","left"], move: {"key":"hire","from":[],"to":["active"],"emits":"EmployeeHired"} },
  "employee.relieve": { description: "Record that an employee has left the company, on the day they were relieved.", operation: employeeRelieve, states: ["active","left"], move: {"key":"relieve","from":["active"],"to":["left"],"emits":"EmployeeRelieved"} },
  "employee-grade.create": { description: "Add a grade to a company. Refuses EmployeeGradeNameTaken when another employee grade holds this company and grade name.", operation: employeeGradeCreate, states: ["active"], move: {"key":"create","from":[],"to":["active"],"emits":"EmployeeGradeCreated"} },
  "employee-grade.get": { description: "Read one employee-grade by its id: company, gradeName, state.", operation: employeeGradeGet, states: ["active"] },
  "holiday.add": { description: "Add one day off to a holiday list. Refuses HolidayDateTaken when another holiday holds this holiday list and holiday date. Refuses HolidayListNameTaken when another holiday list holds this company and holiday list name.", operation: holidayAdd, states: ["active"], move: {"key":"add","from":[],"to":["active"],"emits":"HolidayAdded"} },
  "holiday.get": { description: "Read one holiday by its id: holidayList, holidayDate, description, state.", operation: holidayGet, states: ["active"] },
  "holiday-list.add-weekly-off": { description: "Make every given weekday in a holiday list a day off. Refuses HolidayDateTaken when another holiday holds this holiday list and holiday date. Refuses HolidayListNameTaken when another holiday list holds this company and holiday list name.", operation: holidayListAddWeeklyOff, states: ["active"], move: {"key":"addWeeklyOff","from":["active"],"to":["active"],"emits":"WeeklyOffAdded"} },
  "holiday-list.create": { description: "Start a company's list of days off, between two days. Refuses HolidayListNameTaken when another holiday list holds this company and holiday list name.", operation: holidayListCreate, states: ["active"], move: {"key":"create","from":[],"to":["active"],"emits":"HolidayListCreated"} },
  "holiday-list.get": { description: "Read one holiday-list by its id: company, holidayListName, fromDate, toDate, totalHolidays, state.", operation: holidayListGet, states: ["active"] },
} as const satisfies { readonly [name: string]: McpEntry };
