// Generated from the blueprint. Do not edit.
import { EventNames } from "orthograph/server";
import * as BankAccount from "../../../blueprint/things/bank-account/events.ts";
import * as Branch from "../../../blueprint/things/branch/events.ts";
import * as BridgeBusiness from "../../../blueprint/things/bridge-business/events.ts";
import * as BridgeIndividual from "../../../blueprint/things/bridge-individual/events.ts";
import * as Company from "../../../blueprint/things/company/events.ts";
import * as Department from "../../../blueprint/things/department/events.ts";
import * as Designation from "../../../blueprint/things/designation/events.ts";
import * as Employee from "../../../blueprint/things/employee/events.ts";
import * as EmployeeGrade from "../../../blueprint/things/employee-grade/events.ts";
import * as Holiday from "../../../blueprint/things/holiday/events.ts";
import * as HolidayList from "../../../blueprint/things/holiday-list/events.ts";

EventNames.name(BankAccount.BankAccountClosed, "BankAccountClosed");
EventNames.name(BankAccount.BankAccountOpened, "BankAccountOpened");
EventNames.name(Branch.BranchCreated, "BranchCreated");
EventNames.name(BridgeBusiness.KybApproved, "KybApproved");
EventNames.name(BridgeBusiness.KybRejected, "KybRejected");
EventNames.name(BridgeBusiness.KybStarted, "KybStarted");
EventNames.name(BridgeIndividual.KycApproved, "KycApproved");
EventNames.name(BridgeIndividual.KycRejected, "KycRejected");
EventNames.name(BridgeIndividual.KycStarted, "KycStarted");
EventNames.name(Company.CompanyCreated, "CompanyCreated");
EventNames.name(Department.DepartmentCreated, "DepartmentCreated");
EventNames.name(Designation.DesignationCreated, "DesignationCreated");
EventNames.name(Employee.EmployeeHired, "EmployeeHired");
EventNames.name(Employee.EmployeeRelieved, "EmployeeRelieved");
EventNames.name(EmployeeGrade.EmployeeGradeCreated, "EmployeeGradeCreated");
EventNames.name(Holiday.HolidayAdded, "HolidayAdded");
EventNames.name(HolidayList.HolidayListCreated, "HolidayListCreated");
EventNames.name(HolidayList.WeeklyOffAdded, "WeeklyOffAdded");

export const names = ["BankAccountClosed", "BankAccountOpened", "BranchCreated", "KybApproved", "KybRejected", "KybStarted", "KycApproved", "KycRejected", "KycStarted", "CompanyCreated", "DepartmentCreated", "DesignationCreated", "EmployeeHired", "EmployeeRelieved", "EmployeeGradeCreated", "HolidayAdded", "HolidayListCreated", "WeeklyOffAdded"] as const;
