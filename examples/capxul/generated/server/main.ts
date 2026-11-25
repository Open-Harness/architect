// Generated from the blueprint. Do not edit.
// The Worker: each operation's route runs its handler through the runtime's wrapper; /_world/* goes to the world.
import { Context, Effect, Layer } from "effect";
import { ManagedRuntime, Tracer } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { HttpApi, HttpApiBuilder } from "effect/http-api";
import { SqlClient } from "effect/sql";
import type { Principal } from "orthograph";
import { AuthD1, Database, JournalD1, StoreD1, Telemetry, WorldEntry, toWorld } from "@orthograph/host-cloudflare";
import { Auth, Busy, CallTelemetry, DurableTimers, Environment, Handlers, Journal, Principals, Reads, Store, Timers, Wire, invariantsIn, thingIn } from "@orthograph/language-effect";
import { Mcp, type McpResult, type ShownOperation } from "@orthograph/language-effect";
import { Api, Errors } from "../api/src/index.ts";
import * as portal from "../portal/main.ts";
import { catalog } from "../mcp/src/index.ts";
import * as accountBalance from "../api/src/account/balance.ts";
import * as accountCreate from "../api/src/account/create.ts";
import * as accountGet from "../api/src/account/get.ts";
import * as accountMakeLedger from "../api/src/account/make-ledger.ts";
import * as attendanceGet from "../api/src/attendance/get.ts";
import * as attendanceList from "../api/src/attendance/list.ts";
import * as attendanceMark from "../api/src/attendance/mark.ts";
import * as attendanceRequestApprove from "../api/src/attendance-request/approve.ts";
import * as attendanceRequestCreate from "../api/src/attendance-request/create.ts";
import * as attendanceRequestGet from "../api/src/attendance-request/get.ts";
import * as attendanceRequestReject from "../api/src/attendance-request/reject.ts";
import * as bankAccountClose from "../api/src/bank-account/close.ts";
import * as bankAccountGet from "../api/src/bank-account/get.ts";
import * as bankAccountOpen from "../api/src/bank-account/open.ts";
import * as bankTransactionFail from "../api/src/bank-transaction/fail.ts";
import * as bankTransactionGet from "../api/src/bank-transaction/get.ts";
import * as bankTransactionLand from "../api/src/bank-transaction/land.ts";
import * as bankTransactionList from "../api/src/bank-transaction/list.ts";
import * as bankTransactionSend from "../api/src/bank-transaction/send.ts";
import * as bankTransactionSettle from "../api/src/bank-transaction/settle.ts";
import * as branchCreate from "../api/src/branch/create.ts";
import * as branchGet from "../api/src/branch/get.ts";
import * as bridgeBusinessApprove from "../api/src/bridge-business/approve.ts";
import * as bridgeBusinessGet from "../api/src/bridge-business/get.ts";
import * as bridgeBusinessReject from "../api/src/bridge-business/reject.ts";
import * as bridgeBusinessStart from "../api/src/bridge-business/start.ts";
import * as bridgeIndividualApprove from "../api/src/bridge-individual/approve.ts";
import * as bridgeIndividualGet from "../api/src/bridge-individual/get.ts";
import * as bridgeIndividualReject from "../api/src/bridge-individual/reject.ts";
import * as bridgeIndividualStart from "../api/src/bridge-individual/start.ts";
import * as companyCreate from "../api/src/company/create.ts";
import * as companyGet from "../api/src/company/get.ts";
import * as costCenterCreate from "../api/src/cost-center/create.ts";
import * as costCenterGet from "../api/src/cost-center/get.ts";
import * as departmentCreate from "../api/src/department/create.ts";
import * as departmentGet from "../api/src/department/get.ts";
import * as designationCreate from "../api/src/designation/create.ts";
import * as designationGet from "../api/src/designation/get.ts";
import * as employeeGet from "../api/src/employee/get.ts";
import * as employeeHire from "../api/src/employee/hire.ts";
import * as employeeRelieve from "../api/src/employee/relieve.ts";
import * as employeeGradeCreate from "../api/src/employee-grade/create.ts";
import * as employeeGradeGet from "../api/src/employee-grade/get.ts";
import * as employeePromotionCancel from "../api/src/employee-promotion/cancel.ts";
import * as employeePromotionCreate from "../api/src/employee-promotion/create.ts";
import * as employeePromotionGet from "../api/src/employee-promotion/get.ts";
import * as employeePromotionSubmit from "../api/src/employee-promotion/submit.ts";
import * as employeeSeparationBegin from "../api/src/employee-separation/begin.ts";
import * as employeeSeparationComplete from "../api/src/employee-separation/complete.ts";
import * as employeeSeparationCreate from "../api/src/employee-separation/create.ts";
import * as employeeSeparationGet from "../api/src/employee-separation/get.ts";
import * as employeeTransferCancel from "../api/src/employee-transfer/cancel.ts";
import * as employeeTransferCreate from "../api/src/employee-transfer/create.ts";
import * as employeeTransferGet from "../api/src/employee-transfer/get.ts";
import * as employeeTransferSubmit from "../api/src/employee-transfer/submit.ts";
import * as employmentTypeCreate from "../api/src/employment-type/create.ts";
import * as employmentTypeGet from "../api/src/employment-type/get.ts";
import * as expenseAdd from "../api/src/expense/add.ts";
import * as expenseGet from "../api/src/expense/get.ts";
import * as expenseClaimApprove from "../api/src/expense-claim/approve.ts";
import * as expenseClaimCreate from "../api/src/expense-claim/create.ts";
import * as expenseClaimGet from "../api/src/expense-claim/get.ts";
import * as expenseClaimReject from "../api/src/expense-claim/reject.ts";
import * as expenseClaimTypeCreate from "../api/src/expense-claim-type/create.ts";
import * as expenseClaimTypeGet from "../api/src/expense-claim-type/get.ts";
import * as fiscalYearCreate from "../api/src/fiscal-year/create.ts";
import * as fiscalYearGet from "../api/src/fiscal-year/get.ts";
import * as glEntryList from "../api/src/gl-entry/list.ts";
import * as holidayAdd from "../api/src/holiday/add.ts";
import * as holidayGet from "../api/src/holiday/get.ts";
import * as holidayListAddWeeklyOff from "../api/src/holiday-list/add-weekly-off.ts";
import * as holidayListCreate from "../api/src/holiday-list/create.ts";
import * as holidayListGet from "../api/src/holiday-list/get.ts";
import * as interviewClear from "../api/src/interview/clear.ts";
import * as interviewCreate from "../api/src/interview/create.ts";
import * as interviewGet from "../api/src/interview/get.ts";
import * as interviewReject from "../api/src/interview/reject.ts";
import * as interviewFeedbackGet from "../api/src/interview-feedback/get.ts";
import * as interviewFeedbackGive from "../api/src/interview-feedback/give.ts";
import * as interviewRoundCreate from "../api/src/interview-round/create.ts";
import * as interviewRoundGet from "../api/src/interview-round/get.ts";
import * as jobApplicantAccept from "../api/src/job-applicant/accept.ts";
import * as jobApplicantCreate from "../api/src/job-applicant/create.ts";
import * as jobApplicantGet from "../api/src/job-applicant/get.ts";
import * as jobApplicantHold from "../api/src/job-applicant/hold.ts";
import * as jobApplicantReject from "../api/src/job-applicant/reject.ts";
import * as jobOfferAccept from "../api/src/job-offer/accept.ts";
import * as jobOfferCreate from "../api/src/job-offer/create.ts";
import * as jobOfferGet from "../api/src/job-offer/get.ts";
import * as jobOfferReject from "../api/src/job-offer/reject.ts";
import * as jobOpeningClose from "../api/src/job-opening/close.ts";
import * as jobOpeningCreate from "../api/src/job-opening/create.ts";
import * as jobOpeningGet from "../api/src/job-opening/get.ts";
import * as journalEntryCancel from "../api/src/journal-entry/cancel.ts";
import * as journalEntryCreate from "../api/src/journal-entry/create.ts";
import * as journalEntryGet from "../api/src/journal-entry/get.ts";
import * as journalEntrySubmit from "../api/src/journal-entry/submit.ts";
import * as journalEntryAccountList from "../api/src/journal-entry-account/list.ts";
import * as leaveAllocationCreate from "../api/src/leave-allocation/create.ts";
import * as leaveAllocationGet from "../api/src/leave-allocation/get.ts";
import * as leaveAllocationSubmit from "../api/src/leave-allocation/submit.ts";
import * as leaveApplicationApprove from "../api/src/leave-application/approve.ts";
import * as leaveApplicationCancel from "../api/src/leave-application/cancel.ts";
import * as leaveApplicationCreate from "../api/src/leave-application/create.ts";
import * as leaveApplicationGet from "../api/src/leave-application/get.ts";
import * as leaveApplicationReject from "../api/src/leave-application/reject.ts";
import * as leaveTypeCreate from "../api/src/leave-type/create.ts";
import * as leaveTypeGet from "../api/src/leave-type/get.ts";
import * as shiftTypeCreate from "../api/src/shift-type/create.ts";
import * as shiftTypeGet from "../api/src/shift-type/get.ts";
import accountBalanceHandler from "../../src/account/balance.ts";
import accountCreateHandler from "../../src/account/create.ts";
import accountMakeLedgerHandler from "../../src/account/make-ledger.ts";
import attendanceMarkHandler from "../../src/attendance/mark.ts";
import attendanceRequestApproveHandler from "../../src/attendance-request/approve.ts";
import attendanceRequestCreateHandler from "../../src/attendance-request/create.ts";
import attendanceRequestRejectHandler from "../../src/attendance-request/reject.ts";
import bankAccountCloseHandler from "../../src/bank-account/close.ts";
import bankAccountOpenHandler from "../../src/bank-account/open.ts";
import bankTransactionFailHandler from "../../src/bank-transaction/fail.ts";
import bankTransactionLandHandler from "../../src/bank-transaction/land.ts";
import bankTransactionSendHandler from "../../src/bank-transaction/send.ts";
import bankTransactionSettleHandler from "../../src/bank-transaction/settle.ts";
import branchCreateHandler from "../../src/branch/create.ts";
import bridgeBusinessApproveHandler from "../../src/bridge-business/approve.ts";
import bridgeBusinessRejectHandler from "../../src/bridge-business/reject.ts";
import bridgeBusinessStartHandler from "../../src/bridge-business/start.ts";
import bridgeIndividualApproveHandler from "../../src/bridge-individual/approve.ts";
import bridgeIndividualRejectHandler from "../../src/bridge-individual/reject.ts";
import bridgeIndividualStartHandler from "../../src/bridge-individual/start.ts";
import companyCreateHandler from "../../src/company/create.ts";
import costCenterCreateHandler from "../../src/cost-center/create.ts";
import departmentCreateHandler from "../../src/department/create.ts";
import designationCreateHandler from "../../src/designation/create.ts";
import employeeHireHandler from "../../src/employee/hire.ts";
import employeeRelieveHandler from "../../src/employee/relieve.ts";
import employeeGradeCreateHandler from "../../src/employee-grade/create.ts";
import employeePromotionCancelHandler from "../../src/employee-promotion/cancel.ts";
import employeePromotionCreateHandler from "../../src/employee-promotion/create.ts";
import employeePromotionSubmitHandler from "../../src/employee-promotion/submit.ts";
import employeeSeparationBeginHandler from "../../src/employee-separation/begin.ts";
import employeeSeparationCompleteHandler from "../../src/employee-separation/complete.ts";
import employeeSeparationCreateHandler from "../../src/employee-separation/create.ts";
import employeeTransferCancelHandler from "../../src/employee-transfer/cancel.ts";
import employeeTransferCreateHandler from "../../src/employee-transfer/create.ts";
import employeeTransferSubmitHandler from "../../src/employee-transfer/submit.ts";
import employmentTypeCreateHandler from "../../src/employment-type/create.ts";
import expenseAddHandler from "../../src/expense/add.ts";
import expenseClaimApproveHandler from "../../src/expense-claim/approve.ts";
import expenseClaimCreateHandler from "../../src/expense-claim/create.ts";
import expenseClaimRejectHandler from "../../src/expense-claim/reject.ts";
import expenseClaimTypeCreateHandler from "../../src/expense-claim-type/create.ts";
import fiscalYearCreateHandler from "../../src/fiscal-year/create.ts";
import holidayAddHandler from "../../src/holiday/add.ts";
import holidayListAddWeeklyOffHandler from "../../src/holiday-list/add-weekly-off.ts";
import holidayListCreateHandler from "../../src/holiday-list/create.ts";
import interviewClearHandler from "../../src/interview/clear.ts";
import interviewCreateHandler from "../../src/interview/create.ts";
import interviewRejectHandler from "../../src/interview/reject.ts";
import interviewFeedbackGiveHandler from "../../src/interview-feedback/give.ts";
import interviewRoundCreateHandler from "../../src/interview-round/create.ts";
import jobApplicantAcceptHandler from "../../src/job-applicant/accept.ts";
import jobApplicantCreateHandler from "../../src/job-applicant/create.ts";
import jobApplicantHoldHandler from "../../src/job-applicant/hold.ts";
import jobApplicantRejectHandler from "../../src/job-applicant/reject.ts";
import jobOfferAcceptHandler from "../../src/job-offer/accept.ts";
import jobOfferCreateHandler from "../../src/job-offer/create.ts";
import jobOfferRejectHandler from "../../src/job-offer/reject.ts";
import jobOpeningCloseHandler from "../../src/job-opening/close.ts";
import jobOpeningCreateHandler from "../../src/job-opening/create.ts";
import journalEntryCancelHandler from "../../src/journal-entry/cancel.ts";
import journalEntryCreateHandler from "../../src/journal-entry/create.ts";
import journalEntrySubmitHandler from "../../src/journal-entry/submit.ts";
import leaveAllocationCreateHandler from "../../src/leave-allocation/create.ts";
import leaveAllocationSubmitHandler from "../../src/leave-allocation/submit.ts";
import leaveApplicationApproveHandler from "../../src/leave-application/approve.ts";
import leaveApplicationCancelHandler from "../../src/leave-application/cancel.ts";
import leaveApplicationCreateHandler from "../../src/leave-application/create.ts";
import leaveApplicationRejectHandler from "../../src/leave-application/reject.ts";
import leaveTypeCreateHandler from "../../src/leave-type/create.ts";
import shiftTypeCreateHandler from "../../src/shift-type/create.ts";
import * as accountThing from "../../blueprint/things/account/thing.ts";
import * as attendanceThing from "../../blueprint/things/attendance/thing.ts";
import * as attendanceRequestThing from "../../blueprint/things/attendance-request/thing.ts";
import * as bankAccountThing from "../../blueprint/things/bank-account/thing.ts";
import * as bankTransactionThing from "../../blueprint/things/bank-transaction/thing.ts";
import * as branchThing from "../../blueprint/things/branch/thing.ts";
import * as bridgeBusinessThing from "../../blueprint/things/bridge-business/thing.ts";
import * as bridgeIndividualThing from "../../blueprint/things/bridge-individual/thing.ts";
import * as companyThing from "../../blueprint/things/company/thing.ts";
import * as costCenterThing from "../../blueprint/things/cost-center/thing.ts";
import * as departmentThing from "../../blueprint/things/department/thing.ts";
import * as designationThing from "../../blueprint/things/designation/thing.ts";
import * as employeeThing from "../../blueprint/things/employee/thing.ts";
import * as employeeGradeThing from "../../blueprint/things/employee-grade/thing.ts";
import * as employeePromotionThing from "../../blueprint/things/employee-promotion/thing.ts";
import * as employeeSeparationThing from "../../blueprint/things/employee-separation/thing.ts";
import * as employeeTransferThing from "../../blueprint/things/employee-transfer/thing.ts";
import * as employmentTypeThing from "../../blueprint/things/employment-type/thing.ts";
import * as expenseThing from "../../blueprint/things/expense/thing.ts";
import * as expenseClaimThing from "../../blueprint/things/expense-claim/thing.ts";
import * as expenseClaimTypeThing from "../../blueprint/things/expense-claim-type/thing.ts";
import * as fiscalYearThing from "../../blueprint/things/fiscal-year/thing.ts";
import * as glEntryThing from "../../blueprint/things/gl-entry/thing.ts";
import * as holidayThing from "../../blueprint/things/holiday/thing.ts";
import * as holidayListThing from "../../blueprint/things/holiday-list/thing.ts";
import * as interviewThing from "../../blueprint/things/interview/thing.ts";
import * as interviewFeedbackThing from "../../blueprint/things/interview-feedback/thing.ts";
import * as interviewRoundThing from "../../blueprint/things/interview-round/thing.ts";
import * as jobApplicantThing from "../../blueprint/things/job-applicant/thing.ts";
import * as jobOfferThing from "../../blueprint/things/job-offer/thing.ts";
import * as jobOpeningThing from "../../blueprint/things/job-opening/thing.ts";
import * as journalEntryThing from "../../blueprint/things/journal-entry/thing.ts";
import * as journalEntryAccountThing from "../../blueprint/things/journal-entry-account/thing.ts";
import * as leaveAllocationThing from "../../blueprint/things/leave-allocation/thing.ts";
import * as leaveApplicationThing from "../../blueprint/things/leave-application/thing.ts";
import * as leaveTypeThing from "../../blueprint/things/leave-type/thing.ts";
import * as shiftTypeThing from "../../blueprint/things/shift-type/thing.ts";
import * as accountInvariants from "../../blueprint/things/account/invariants.ts";
import * as attendanceInvariants from "../../blueprint/things/attendance/invariants.ts";
import * as bankAccountInvariants from "../../blueprint/things/bank-account/invariants.ts";
import * as bankTransactionInvariants from "../../blueprint/things/bank-transaction/invariants.ts";
import * as branchInvariants from "../../blueprint/things/branch/invariants.ts";
import * as bridgeBusinessInvariants from "../../blueprint/things/bridge-business/invariants.ts";
import * as bridgeIndividualInvariants from "../../blueprint/things/bridge-individual/invariants.ts";
import * as companyInvariants from "../../blueprint/things/company/invariants.ts";
import * as costCenterInvariants from "../../blueprint/things/cost-center/invariants.ts";
import * as departmentInvariants from "../../blueprint/things/department/invariants.ts";
import * as designationInvariants from "../../blueprint/things/designation/invariants.ts";
import * as employeeInvariants from "../../blueprint/things/employee/invariants.ts";
import * as employeeGradeInvariants from "../../blueprint/things/employee-grade/invariants.ts";
import * as employeeSeparationInvariants from "../../blueprint/things/employee-separation/invariants.ts";
import * as employmentTypeInvariants from "../../blueprint/things/employment-type/invariants.ts";
import * as expenseClaimTypeInvariants from "../../blueprint/things/expense-claim-type/invariants.ts";
import * as fiscalYearInvariants from "../../blueprint/things/fiscal-year/invariants.ts";
import * as holidayInvariants from "../../blueprint/things/holiday/invariants.ts";
import * as holidayListInvariants from "../../blueprint/things/holiday-list/invariants.ts";
import * as interviewInvariants from "../../blueprint/things/interview/invariants.ts";
import * as interviewFeedbackInvariants from "../../blueprint/things/interview-feedback/invariants.ts";
import * as interviewRoundInvariants from "../../blueprint/things/interview-round/invariants.ts";
import * as jobOfferInvariants from "../../blueprint/things/job-offer/invariants.ts";
import * as leaveTypeInvariants from "../../blueprint/things/leave-type/invariants.ts";
import * as shiftTypeInvariants from "../../blueprint/things/shift-type/invariants.ts";

import { World as WorldHost, type WorldWakes } from "@orthograph/host-cloudflare";

/** Which code wakes each kind of durable timer when it falls due: empty until a feature registers a kind (a workflow, an agent, the keeper). */
const wakes: WorldWakes = {};

/** The world, with its wake route: a due timer of a kind that is not here fails its step and stays pending. */
export class World extends WorldHost {
  protected override wakeKinds(): WorldWakes {
    return wakes;
  }
}

const accountBalanceServed = Handlers.serve({ name: "account.balance", operation: accountBalance.declaration, handler: accountBalanceHandler, codes: Errors.codes });
const accountCreateServed = Handlers.serve({ name: "account.create", operation: accountCreate.declaration, handler: accountCreateHandler, invariants: { AccountNameTaken: "account.oneNamePerCompany" }, codes: Errors.codes });
const accountGetServed = Reads.serve({ name: "account.get", read: accountGet.declaration });
const accountMakeLedgerServed = Handlers.serve({ name: "account.make-ledger", operation: accountMakeLedger.declaration, handler: accountMakeLedgerHandler, notFrom: "AccountNotGroup", invariants: { AccountNameTaken: "account.oneNamePerCompany" }, codes: Errors.codes });
const attendanceGetServed = Reads.serve({ name: "attendance.get", read: attendanceGet.declaration });
const attendanceListServed = Reads.serve({ name: "attendance.list", read: attendanceList.declaration });
const attendanceMarkServed = Handlers.serve({ name: "attendance.mark", operation: attendanceMark.declaration, handler: attendanceMarkHandler, notFound: { employee: "EmployeeNotFound" }, invariants: { AttendanceAlreadyMarked: "attendance.oneAttendancePerDay" }, codes: Errors.codes });
const attendanceRequestApproveServed = Handlers.serve({ name: "attendance-request.approve", operation: attendanceRequestApprove.declaration, handler: attendanceRequestApproveHandler, notFrom: "AttendanceRequestNotDraft", invariants: { AttendanceAlreadyMarked: "attendance.oneAttendancePerDay" }, codes: Errors.codes });
const attendanceRequestCreateServed = Handlers.serve({ name: "attendance-request.create", operation: attendanceRequestCreate.declaration, handler: attendanceRequestCreateHandler, notFound: { company: "CompanyNotFound", employee: "EmployeeNotFound" }, codes: Errors.codes });
const attendanceRequestGetServed = Reads.serve({ name: "attendance-request.get", read: attendanceRequestGet.declaration });
const attendanceRequestRejectServed = Handlers.serve({ name: "attendance-request.reject", operation: attendanceRequestReject.declaration, handler: attendanceRequestRejectHandler, notFrom: "AttendanceRequestNotDraft", codes: Errors.codes });
const bankAccountCloseServed = Handlers.serve({ name: "bank-account.close", operation: bankAccountClose.declaration, handler: bankAccountCloseHandler, notFrom: "BankAccountNotOpen", codes: Errors.codes });
const bankAccountGetServed = Reads.serve({ name: "bank-account.get", read: bankAccountGet.declaration });
const bankAccountOpenServed = Handlers.serve({ name: "bank-account.open", operation: bankAccountOpen.declaration, handler: bankAccountOpenHandler, invariants: { BankAccountNameTaken: "bank-account.oneNamePerCompany" }, codes: Errors.codes });
const bankTransactionFailServed = Handlers.serve({ name: "bank-transaction.fail", operation: bankTransactionFail.declaration, handler: bankTransactionFailHandler, notFrom: "BankTransactionNotPending", notFound: { transaction: "BankTransactionNotFound" }, invariants: { AlreadyRecorded: "bank-transaction.oneTransactionPerMovement" }, codes: Errors.codes });
const bankTransactionGetServed = Reads.serve({ name: "bank-transaction.get", read: bankTransactionGet.declaration });
const bankTransactionLandServed = Handlers.serve({ name: "bank-transaction.land", operation: bankTransactionLand.declaration, handler: bankTransactionLandHandler, notFound: { account: "BankAccountNotFound" }, invariants: { AlreadyRecorded: "bank-transaction.oneTransactionPerMovement" }, codes: Errors.codes });
const bankTransactionListServed = Reads.serve({ name: "bank-transaction.list", read: bankTransactionList.declaration });
const bankTransactionSendServed = Handlers.serve({ name: "bank-transaction.send", operation: bankTransactionSend.declaration, handler: bankTransactionSendHandler, invariants: { AlreadyRecorded: "bank-transaction.oneTransactionPerMovement" }, codes: Errors.codes });
const bankTransactionSettleServed = Handlers.serve({ name: "bank-transaction.settle", operation: bankTransactionSettle.declaration, handler: bankTransactionSettleHandler, notFrom: "BankTransactionNotPending", notFound: { transaction: "BankTransactionNotFound" }, invariants: { AlreadyRecorded: "bank-transaction.oneTransactionPerMovement" }, codes: Errors.codes });
const branchCreateServed = Handlers.serve({ name: "branch.create", operation: branchCreate.declaration, handler: branchCreateHandler, invariants: { BranchNameTaken: "branch.oneNamePerCompany" }, codes: Errors.codes });
const branchGetServed = Reads.serve({ name: "branch.get", read: branchGet.declaration });
const bridgeBusinessApproveServed = Handlers.serve({ name: "bridge-business.approve", operation: bridgeBusinessApprove.declaration, handler: bridgeBusinessApproveHandler, notFrom: "BridgeBusinessNotStarted", notFound: { business: "BridgeBusinessNotFound" }, invariants: { KybAlreadyStarted: "bridge-business.oneKybPerCompany" }, codes: Errors.codes });
const bridgeBusinessGetServed = Reads.serve({ name: "bridge-business.get", read: bridgeBusinessGet.declaration });
const bridgeBusinessRejectServed = Handlers.serve({ name: "bridge-business.reject", operation: bridgeBusinessReject.declaration, handler: bridgeBusinessRejectHandler, notFrom: "BridgeBusinessNotStarted", notFound: { business: "BridgeBusinessNotFound" }, invariants: { KybAlreadyStarted: "bridge-business.oneKybPerCompany" }, codes: Errors.codes });
const bridgeBusinessStartServed = Handlers.serve({ name: "bridge-business.start", operation: bridgeBusinessStart.declaration, handler: bridgeBusinessStartHandler, invariants: { KybAlreadyStarted: "bridge-business.oneKybPerCompany" }, codes: Errors.codes });
const bridgeIndividualApproveServed = Handlers.serve({ name: "bridge-individual.approve", operation: bridgeIndividualApprove.declaration, handler: bridgeIndividualApproveHandler, notFrom: "BridgeIndividualNotStarted", notFound: { individual: "BridgeIndividualNotFound" }, invariants: { KycAlreadyStarted: "bridge-individual.oneKycPerPerson" }, codes: Errors.codes });
const bridgeIndividualGetServed = Reads.serve({ name: "bridge-individual.get", read: bridgeIndividualGet.declaration });
const bridgeIndividualRejectServed = Handlers.serve({ name: "bridge-individual.reject", operation: bridgeIndividualReject.declaration, handler: bridgeIndividualRejectHandler, notFrom: "BridgeIndividualNotStarted", notFound: { individual: "BridgeIndividualNotFound" }, invariants: { KycAlreadyStarted: "bridge-individual.oneKycPerPerson" }, codes: Errors.codes });
const bridgeIndividualStartServed = Handlers.serve({ name: "bridge-individual.start", operation: bridgeIndividualStart.declaration, handler: bridgeIndividualStartHandler, invariants: { KycAlreadyStarted: "bridge-individual.oneKycPerPerson" }, codes: Errors.codes });
const companyCreateServed = Handlers.serve({ name: "company.create", operation: companyCreate.declaration, handler: companyCreateHandler, invariants: { CompanyAbbrTaken: "company.oneAbbrPerOwner", CompanyNameTaken: "company.oneNamePerOwner" }, codes: Errors.codes });
const companyGetServed = Reads.serve({ name: "company.get", read: companyGet.declaration });
const costCenterCreateServed = Handlers.serve({ name: "cost-center.create", operation: costCenterCreate.declaration, handler: costCenterCreateHandler, invariants: { CostCenterNameTaken: "cost-center.oneNamePerCompany" }, codes: Errors.codes });
const costCenterGetServed = Reads.serve({ name: "cost-center.get", read: costCenterGet.declaration });
const departmentCreateServed = Handlers.serve({ name: "department.create", operation: departmentCreate.declaration, handler: departmentCreateHandler, invariants: { DepartmentNameTaken: "department.oneNamePerCompany" }, codes: Errors.codes });
const departmentGetServed = Reads.serve({ name: "department.get", read: departmentGet.declaration });
const designationCreateServed = Handlers.serve({ name: "designation.create", operation: designationCreate.declaration, handler: designationCreateHandler, invariants: { DesignationNameTaken: "designation.oneNamePerCompany" }, codes: Errors.codes });
const designationGetServed = Reads.serve({ name: "designation.get", read: designationGet.declaration });
const employeeGetServed = Reads.serve({ name: "employee.get", read: employeeGet.declaration });
const employeeHireServed = Handlers.serve({ name: "employee.hire", operation: employeeHire.declaration, handler: employeeHireHandler, notFound: { department: "DepartmentNotFound", designation: "DesignationNotFound" }, invariants: { EmployeeAlreadyHired: "employee.onePlacePerPerson" }, codes: Errors.codes });
const employeeRelieveServed = Handlers.serve({ name: "employee.relieve", operation: employeeRelieve.declaration, handler: employeeRelieveHandler, notFrom: "EmployeeNotActive", codes: Errors.codes });
const employeeGradeCreateServed = Handlers.serve({ name: "employee-grade.create", operation: employeeGradeCreate.declaration, handler: employeeGradeCreateHandler, invariants: { EmployeeGradeNameTaken: "employee-grade.oneNamePerCompany" }, codes: Errors.codes });
const employeeGradeGetServed = Reads.serve({ name: "employee-grade.get", read: employeeGradeGet.declaration });
const employeePromotionCancelServed = Handlers.serve({ name: "employee-promotion.cancel", operation: employeePromotionCancel.declaration, handler: employeePromotionCancelHandler, notFrom: "EmployeePromotionNotDraft", invariants: { EmployeeAlreadyHired: "employee.onePlacePerPerson" }, codes: Errors.codes });
const employeePromotionCreateServed = Handlers.serve({ name: "employee-promotion.create", operation: employeePromotionCreate.declaration, handler: employeePromotionCreateHandler, notFound: { employee: "EmployeeNotFound", newDesignation: "DesignationNotFound" }, codes: Errors.codes });
const employeePromotionGetServed = Reads.serve({ name: "employee-promotion.get", read: employeePromotionGet.declaration });
const employeePromotionSubmitServed = Handlers.serve({ name: "employee-promotion.submit", operation: employeePromotionSubmit.declaration, handler: employeePromotionSubmitHandler, notFrom: "EmployeePromotionNotDraft", invariants: { EmployeeAlreadyHired: "employee.onePlacePerPerson" }, codes: Errors.codes });
const employeeSeparationBeginServed = Handlers.serve({ name: "employee-separation.begin", operation: employeeSeparationBegin.declaration, handler: employeeSeparationBeginHandler, notFrom: "EmployeeSeparationNotPending", invariants: { SeparationAlreadyOpen: "employee-separation.oneOpenSeparationPerEmployee" }, codes: Errors.codes });
const employeeSeparationCompleteServed = Handlers.serve({ name: "employee-separation.complete", operation: employeeSeparationComplete.declaration, handler: employeeSeparationCompleteHandler, notFrom: "EmployeeSeparationNotPending", codes: Errors.codes });
const employeeSeparationCreateServed = Handlers.serve({ name: "employee-separation.create", operation: employeeSeparationCreate.declaration, handler: employeeSeparationCreateHandler, notFound: { employee: "EmployeeNotFound" }, invariants: { SeparationAlreadyOpen: "employee-separation.oneOpenSeparationPerEmployee" }, codes: Errors.codes });
const employeeSeparationGetServed = Reads.serve({ name: "employee-separation.get", read: employeeSeparationGet.declaration });
const employeeTransferCancelServed = Handlers.serve({ name: "employee-transfer.cancel", operation: employeeTransferCancel.declaration, handler: employeeTransferCancelHandler, notFrom: "EmployeeTransferNotDraft", invariants: { EmployeeAlreadyHired: "employee.onePlacePerPerson" }, codes: Errors.codes });
const employeeTransferCreateServed = Handlers.serve({ name: "employee-transfer.create", operation: employeeTransferCreate.declaration, handler: employeeTransferCreateHandler, notFound: { employee: "EmployeeNotFound", newDepartment: "DepartmentNotFound" }, codes: Errors.codes });
const employeeTransferGetServed = Reads.serve({ name: "employee-transfer.get", read: employeeTransferGet.declaration });
const employeeTransferSubmitServed = Handlers.serve({ name: "employee-transfer.submit", operation: employeeTransferSubmit.declaration, handler: employeeTransferSubmitHandler, notFrom: "EmployeeTransferNotDraft", invariants: { EmployeeAlreadyHired: "employee.onePlacePerPerson" }, codes: Errors.codes });
const employmentTypeCreateServed = Handlers.serve({ name: "employment-type.create", operation: employmentTypeCreate.declaration, handler: employmentTypeCreateHandler, invariants: { EmploymentTypeNameTaken: "employment-type.oneNamePerCompany" }, codes: Errors.codes });
const employmentTypeGetServed = Reads.serve({ name: "employment-type.get", read: employmentTypeGet.declaration });
const expenseAddServed = Handlers.serve({ name: "expense.add", operation: expenseAdd.declaration, handler: expenseAddHandler, notFound: { expenseType: "ExpenseClaimTypeNotFound" }, codes: Errors.codes });
const expenseGetServed = Reads.serve({ name: "expense.get", read: expenseGet.declaration });
const expenseClaimApproveServed = Handlers.serve({ name: "expense-claim.approve", operation: expenseClaimApprove.declaration, handler: expenseClaimApproveHandler, notFrom: "ExpenseClaimNotDraft", codes: Errors.codes });
const expenseClaimCreateServed = Handlers.serve({ name: "expense-claim.create", operation: expenseClaimCreate.declaration, handler: expenseClaimCreateHandler, notFound: { company: "CompanyNotFound", employee: "EmployeeNotFound" }, codes: Errors.codes });
const expenseClaimGetServed = Reads.serve({ name: "expense-claim.get", read: expenseClaimGet.declaration });
const expenseClaimRejectServed = Handlers.serve({ name: "expense-claim.reject", operation: expenseClaimReject.declaration, handler: expenseClaimRejectHandler, notFrom: "ExpenseClaimNotDraft", codes: Errors.codes });
const expenseClaimTypeCreateServed = Handlers.serve({ name: "expense-claim-type.create", operation: expenseClaimTypeCreate.declaration, handler: expenseClaimTypeCreateHandler, invariants: { ExpenseTypeTaken: "expense-claim-type.oneNamePerCompany" }, codes: Errors.codes });
const expenseClaimTypeGetServed = Reads.serve({ name: "expense-claim-type.get", read: expenseClaimTypeGet.declaration });
const fiscalYearCreateServed = Handlers.serve({ name: "fiscal-year.create", operation: fiscalYearCreate.declaration, handler: fiscalYearCreateHandler, invariants: { FiscalYearNameTaken: "fiscal-year.oneNamePerCompany" }, codes: Errors.codes });
const fiscalYearGetServed = Reads.serve({ name: "fiscal-year.get", read: fiscalYearGet.declaration });
const glEntryListServed = Reads.serve({ name: "gl-entry.list", read: glEntryList.declaration });
const holidayAddServed = Handlers.serve({ name: "holiday.add", operation: holidayAdd.declaration, handler: holidayAddHandler, invariants: { HolidayDateTaken: "holiday.oneHolidayPerDay", HolidayListNameTaken: "holiday-list.oneNamePerCompany" }, codes: Errors.codes });
const holidayGetServed = Reads.serve({ name: "holiday.get", read: holidayGet.declaration });
const holidayListAddWeeklyOffServed = Handlers.serve({ name: "holiday-list.add-weekly-off", operation: holidayListAddWeeklyOff.declaration, handler: holidayListAddWeeklyOffHandler, notFrom: "HolidayListNotActive", invariants: { HolidayDateTaken: "holiday.oneHolidayPerDay", HolidayListNameTaken: "holiday-list.oneNamePerCompany" }, codes: Errors.codes });
const holidayListCreateServed = Handlers.serve({ name: "holiday-list.create", operation: holidayListCreate.declaration, handler: holidayListCreateHandler, invariants: { HolidayListNameTaken: "holiday-list.oneNamePerCompany" }, codes: Errors.codes });
const holidayListGetServed = Reads.serve({ name: "holiday-list.get", read: holidayListGet.declaration });
const interviewClearServed = Handlers.serve({ name: "interview.clear", operation: interviewClear.declaration, handler: interviewClearHandler, notFrom: "InterviewNotPending", invariants: { InterviewAlreadyScheduled: "interview.oneInterviewPerRound" }, codes: Errors.codes });
const interviewCreateServed = Handlers.serve({ name: "interview.create", operation: interviewCreate.declaration, handler: interviewCreateHandler, notFound: { interviewRound: "InterviewRoundNotFound" }, invariants: { InterviewAlreadyScheduled: "interview.oneInterviewPerRound" }, codes: Errors.codes });
const interviewGetServed = Reads.serve({ name: "interview.get", read: interviewGet.declaration });
const interviewRejectServed = Handlers.serve({ name: "interview.reject", operation: interviewReject.declaration, handler: interviewRejectHandler, notFrom: "InterviewNotPending", invariants: { InterviewAlreadyScheduled: "interview.oneInterviewPerRound" }, codes: Errors.codes });
const interviewFeedbackGetServed = Reads.serve({ name: "interview-feedback.get", read: interviewFeedbackGet.declaration });
const interviewFeedbackGiveServed = Handlers.serve({ name: "interview-feedback.give", operation: interviewFeedbackGive.declaration, handler: interviewFeedbackGiveHandler, notFound: { interview: "InterviewNotFound" }, invariants: { FeedbackAlreadyGiven: "interview-feedback.oneFeedbackPerInterviewer" }, codes: Errors.codes });
const interviewRoundCreateServed = Handlers.serve({ name: "interview-round.create", operation: interviewRoundCreate.declaration, handler: interviewRoundCreateHandler, invariants: { RoundNameTaken: "interview-round.oneNamePerCompany" }, codes: Errors.codes });
const interviewRoundGetServed = Reads.serve({ name: "interview-round.get", read: interviewRoundGet.declaration });
const jobApplicantAcceptServed = Handlers.serve({ name: "job-applicant.accept", operation: jobApplicantAccept.declaration, handler: jobApplicantAcceptHandler, notFrom: "JobApplicantNotOpen", codes: Errors.codes });
const jobApplicantCreateServed = Handlers.serve({ name: "job-applicant.create", operation: jobApplicantCreate.declaration, handler: jobApplicantCreateHandler, codes: Errors.codes });
const jobApplicantGetServed = Reads.serve({ name: "job-applicant.get", read: jobApplicantGet.declaration });
const jobApplicantHoldServed = Handlers.serve({ name: "job-applicant.hold", operation: jobApplicantHold.declaration, handler: jobApplicantHoldHandler, notFrom: "JobApplicantNotOpen", codes: Errors.codes });
const jobApplicantRejectServed = Handlers.serve({ name: "job-applicant.reject", operation: jobApplicantReject.declaration, handler: jobApplicantRejectHandler, notFrom: "JobApplicantNotOpen", codes: Errors.codes });
const jobOfferAcceptServed = Handlers.serve({ name: "job-offer.accept", operation: jobOfferAccept.declaration, handler: jobOfferAcceptHandler, notFrom: "JobOfferNotAwaiting", invariants: { OfferAlreadyMade: "job-offer.oneOfferPerApplicant" }, codes: Errors.codes });
const jobOfferCreateServed = Handlers.serve({ name: "job-offer.create", operation: jobOfferCreate.declaration, handler: jobOfferCreateHandler, notFound: { designation: "DesignationNotFound" }, invariants: { OfferAlreadyMade: "job-offer.oneOfferPerApplicant" }, codes: Errors.codes });
const jobOfferGetServed = Reads.serve({ name: "job-offer.get", read: jobOfferGet.declaration });
const jobOfferRejectServed = Handlers.serve({ name: "job-offer.reject", operation: jobOfferReject.declaration, handler: jobOfferRejectHandler, notFrom: "JobOfferNotAwaiting", invariants: { OfferAlreadyMade: "job-offer.oneOfferPerApplicant" }, codes: Errors.codes });
const jobOpeningCloseServed = Handlers.serve({ name: "job-opening.close", operation: jobOpeningClose.declaration, handler: jobOpeningCloseHandler, notFrom: "JobOpeningNotOpen", codes: Errors.codes });
const jobOpeningCreateServed = Handlers.serve({ name: "job-opening.create", operation: jobOpeningCreate.declaration, handler: jobOpeningCreateHandler, codes: Errors.codes });
const jobOpeningGetServed = Reads.serve({ name: "job-opening.get", read: jobOpeningGet.declaration });
const journalEntryCancelServed = Handlers.serve({ name: "journal-entry.cancel", operation: journalEntryCancel.declaration, handler: journalEntryCancelHandler, notFrom: "JournalEntryNotDraft", codes: Errors.codes });
const journalEntryCreateServed = Handlers.serve({ name: "journal-entry.create", operation: journalEntryCreate.declaration, handler: journalEntryCreateHandler, codes: Errors.codes });
const journalEntryGetServed = Reads.serve({ name: "journal-entry.get", read: journalEntryGet.declaration });
const journalEntrySubmitServed = Handlers.serve({ name: "journal-entry.submit", operation: journalEntrySubmit.declaration, handler: journalEntrySubmitHandler, notFrom: "JournalEntryNotDraft", codes: Errors.codes });
const journalEntryAccountListServed = Reads.serve({ name: "journal-entry-account.list", read: journalEntryAccountList.declaration });
const leaveAllocationCreateServed = Handlers.serve({ name: "leave-allocation.create", operation: leaveAllocationCreate.declaration, handler: leaveAllocationCreateHandler, notFound: { employee: "EmployeeNotFound", leaveType: "LeaveTypeNotFound" }, codes: Errors.codes });
const leaveAllocationGetServed = Reads.serve({ name: "leave-allocation.get", read: leaveAllocationGet.declaration });
const leaveAllocationSubmitServed = Handlers.serve({ name: "leave-allocation.submit", operation: leaveAllocationSubmit.declaration, handler: leaveAllocationSubmitHandler, notFrom: "LeaveAllocationNotDraft", codes: Errors.codes });
const leaveApplicationApproveServed = Handlers.serve({ name: "leave-application.approve", operation: leaveApplicationApprove.declaration, handler: leaveApplicationApproveHandler, notFrom: "LeaveApplicationNotOpen", invariants: { AttendanceAlreadyMarked: "attendance.oneAttendancePerDay" }, codes: Errors.codes });
const leaveApplicationCancelServed = Handlers.serve({ name: "leave-application.cancel", operation: leaveApplicationCancel.declaration, handler: leaveApplicationCancelHandler, notFrom: "LeaveApplicationNotOpen", codes: Errors.codes });
const leaveApplicationCreateServed = Handlers.serve({ name: "leave-application.create", operation: leaveApplicationCreate.declaration, handler: leaveApplicationCreateHandler, notFound: { company: "CompanyNotFound", employee: "EmployeeNotFound", leaveType: "LeaveTypeNotFound" }, codes: Errors.codes });
const leaveApplicationGetServed = Reads.serve({ name: "leave-application.get", read: leaveApplicationGet.declaration });
const leaveApplicationRejectServed = Handlers.serve({ name: "leave-application.reject", operation: leaveApplicationReject.declaration, handler: leaveApplicationRejectHandler, notFrom: "LeaveApplicationNotOpen", codes: Errors.codes });
const leaveTypeCreateServed = Handlers.serve({ name: "leave-type.create", operation: leaveTypeCreate.declaration, handler: leaveTypeCreateHandler, invariants: { LeaveTypeNameTaken: "leave-type.oneNamePerCompany" }, codes: Errors.codes });
const leaveTypeGetServed = Reads.serve({ name: "leave-type.get", read: leaveTypeGet.declaration });
const shiftTypeCreateServed = Handlers.serve({ name: "shift-type.create", operation: shiftTypeCreate.declaration, handler: shiftTypeCreateHandler, invariants: { ShiftTypeNameTaken: "shift-type.oneNamePerCompany" }, codes: Errors.codes });
const shiftTypeGetServed = Reads.serve({ name: "shift-type.get", read: shiftTypeGet.declaration });

/** Each thing and its table: a D1 table, or the name its actors go by. */
const tables = [[thingIn(accountThing), "account"], [thingIn(attendanceThing), "attendance"], [thingIn(attendanceRequestThing), "attendance-request"], [thingIn(bankAccountThing), "bank-account"], [thingIn(bankTransactionThing), "bank-transaction"], [thingIn(branchThing), "branch"], [thingIn(bridgeBusinessThing), "bridge-business"], [thingIn(bridgeIndividualThing), "bridge-individual"], [thingIn(companyThing), "company"], [thingIn(costCenterThing), "cost-center"], [thingIn(departmentThing), "department"], [thingIn(designationThing), "designation"], [thingIn(employeeThing), "employee"], [thingIn(employeeGradeThing), "employee-grade"], [thingIn(employeePromotionThing), "employee-promotion"], [thingIn(employeeSeparationThing), "employee-separation"], [thingIn(employeeTransferThing), "employee-transfer"], [thingIn(employmentTypeThing), "employment-type"], [thingIn(expenseThing), "expense"], [thingIn(expenseClaimThing), "expense-claim"], [thingIn(expenseClaimTypeThing), "expense-claim-type"], [thingIn(fiscalYearThing), "fiscal-year"], [thingIn(glEntryThing), "gl-entry"], [thingIn(holidayThing), "holiday"], [thingIn(holidayListThing), "holiday-list"], [thingIn(interviewThing), "interview"], [thingIn(interviewFeedbackThing), "interview-feedback"], [thingIn(interviewRoundThing), "interview-round"], [thingIn(jobApplicantThing), "job-applicant"], [thingIn(jobOfferThing), "job-offer"], [thingIn(jobOpeningThing), "job-opening"], [thingIn(journalEntryThing), "journal-entry"], [thingIn(journalEntryAccountThing), "journal-entry-account"], [thingIn(leaveAllocationThing), "leave-allocation"], [thingIn(leaveApplicationThing), "leave-application"], [thingIn(leaveTypeThing), "leave-type"], [thingIn(shiftTypeThing), "shift-type"]] as const;

/** Each rule (G5) under its full name, `<thing>.<rule>`: the store's index refuses a second holder at commit, and the runtime refuses before it. */
const rules = [...invariantsIn("account", accountInvariants), ...invariantsIn("attendance", attendanceInvariants), ...invariantsIn("bank-account", bankAccountInvariants), ...invariantsIn("bank-transaction", bankTransactionInvariants), ...invariantsIn("branch", branchInvariants), ...invariantsIn("bridge-business", bridgeBusinessInvariants), ...invariantsIn("bridge-individual", bridgeIndividualInvariants), ...invariantsIn("company", companyInvariants), ...invariantsIn("cost-center", costCenterInvariants), ...invariantsIn("department", departmentInvariants), ...invariantsIn("designation", designationInvariants), ...invariantsIn("employee", employeeInvariants), ...invariantsIn("employee-grade", employeeGradeInvariants), ...invariantsIn("employee-separation", employeeSeparationInvariants), ...invariantsIn("employment-type", employmentTypeInvariants), ...invariantsIn("expense-claim-type", expenseClaimTypeInvariants), ...invariantsIn("fiscal-year", fiscalYearInvariants), ...invariantsIn("holiday", holidayInvariants), ...invariantsIn("holiday-list", holidayListInvariants), ...invariantsIn("interview", interviewInvariants), ...invariantsIn("interview-feedback", interviewFeedbackInvariants), ...invariantsIn("interview-round", interviewRoundInvariants), ...invariantsIn("job-offer", jobOfferInvariants), ...invariantsIn("leave-type", leaveTypeInvariants), ...invariantsIn("shift-type", shiftTypeInvariants)] as const;

const refusals = Wire.refusals(Errors.wire);
// A refused payload names every field it was refused for, not only the first (#988).
const CallApi = Api.middleware(CallTelemetry).annotate(HttpApi.PayloadParseOptions, { errors: "all" });
type Services = SqlClient.SqlClient | Store | Busy | Principals | Journal | Auth | Timers | DurableTimers;

/** Who is calling, then the operation or read, its refusals sent as their wire classes. */
type Run = (payload: never, principal: Principal, request?: string) => Effect.Effect<unknown, unknown, unknown>;
/** Every answer and every refusal is cut by the visibility rule for this caller before it is sent. */
const shown = Wire.shown(Errors.declared);
const call = <P extends object>(served: { readonly run: Run; readonly operation: ShownOperation }, payload: P, headers: Readonly<Record<string, string | undefined>>) =>
  Effect.flatMap(Principals, (principals) => principals.of(headers["authorization"])).pipe(
    Effect.withTracerEnabled(false),
    // The caller's idempotency key: for an operation declared `idempotent: "request"`, the same key is one call.
    Effect.flatMap((principal: Principal) => served.run(payload as never, principal, headers["idempotency-key"]).pipe(shown(served, payload, principal))),
    refusals,
  ) as Effect.Effect<never, never, Services>;

const AccountLive = HttpApiBuilder.group(CallApi, "account", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("balance", ({ payload, request }) => call(accountBalanceServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(accountCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(accountGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("make-ledger", ({ payload, request }) => call(accountMakeLedgerServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const AttendanceLive = HttpApiBuilder.group(CallApi, "attendance", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("get", ({ payload, request }) => call(attendanceGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("list", ({ payload, request }) => call(attendanceListServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("mark", ({ payload, request }) => call(attendanceMarkServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const AttendanceRequestLive = HttpApiBuilder.group(CallApi, "attendance-request", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("approve", ({ payload, request }) => call(attendanceRequestApproveServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(attendanceRequestCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(attendanceRequestGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("reject", ({ payload, request }) => call(attendanceRequestRejectServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const BankAccountLive = HttpApiBuilder.group(CallApi, "bank-account", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("close", ({ payload, request }) => call(bankAccountCloseServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(bankAccountGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("open", ({ payload, request }) => call(bankAccountOpenServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const BankTransactionLive = HttpApiBuilder.group(CallApi, "bank-transaction", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("fail", ({ payload, request }) => call(bankTransactionFailServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(bankTransactionGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("land", ({ payload, request }) => call(bankTransactionLandServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("list", ({ payload, request }) => call(bankTransactionListServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("send", ({ payload, request }) => call(bankTransactionSendServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("settle", ({ payload, request }) => call(bankTransactionSettleServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const BranchLive = HttpApiBuilder.group(CallApi, "branch", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(branchCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(branchGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const BridgeBusinessLive = HttpApiBuilder.group(CallApi, "bridge-business", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("approve", ({ payload, request }) => call(bridgeBusinessApproveServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(bridgeBusinessGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("reject", ({ payload, request }) => call(bridgeBusinessRejectServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("start", ({ payload, request }) => call(bridgeBusinessStartServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const BridgeIndividualLive = HttpApiBuilder.group(CallApi, "bridge-individual", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("approve", ({ payload, request }) => call(bridgeIndividualApproveServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(bridgeIndividualGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("reject", ({ payload, request }) => call(bridgeIndividualRejectServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("start", ({ payload, request }) => call(bridgeIndividualStartServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const CompanyLive = HttpApiBuilder.group(CallApi, "company", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(companyCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(companyGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const CostCenterLive = HttpApiBuilder.group(CallApi, "cost-center", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(costCenterCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(costCenterGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const DepartmentLive = HttpApiBuilder.group(CallApi, "department", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(departmentCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(departmentGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const DesignationLive = HttpApiBuilder.group(CallApi, "designation", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(designationCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(designationGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const EmployeeLive = HttpApiBuilder.group(CallApi, "employee", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("get", ({ payload, request }) => call(employeeGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("hire", ({ payload, request }) => call(employeeHireServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("relieve", ({ payload, request }) => call(employeeRelieveServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const EmployeeGradeLive = HttpApiBuilder.group(CallApi, "employee-grade", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(employeeGradeCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(employeeGradeGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const EmployeePromotionLive = HttpApiBuilder.group(CallApi, "employee-promotion", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("cancel", ({ payload, request }) => call(employeePromotionCancelServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(employeePromotionCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(employeePromotionGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("submit", ({ payload, request }) => call(employeePromotionSubmitServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const EmployeeSeparationLive = HttpApiBuilder.group(CallApi, "employee-separation", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("begin", ({ payload, request }) => call(employeeSeparationBeginServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("complete", ({ payload, request }) => call(employeeSeparationCompleteServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(employeeSeparationCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(employeeSeparationGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const EmployeeTransferLive = HttpApiBuilder.group(CallApi, "employee-transfer", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("cancel", ({ payload, request }) => call(employeeTransferCancelServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(employeeTransferCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(employeeTransferGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("submit", ({ payload, request }) => call(employeeTransferSubmitServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const EmploymentTypeLive = HttpApiBuilder.group(CallApi, "employment-type", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(employmentTypeCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(employmentTypeGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const ExpenseLive = HttpApiBuilder.group(CallApi, "expense", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("add", ({ payload, request }) => call(expenseAddServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(expenseGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const ExpenseClaimLive = HttpApiBuilder.group(CallApi, "expense-claim", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("approve", ({ payload, request }) => call(expenseClaimApproveServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(expenseClaimCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(expenseClaimGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("reject", ({ payload, request }) => call(expenseClaimRejectServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const ExpenseClaimTypeLive = HttpApiBuilder.group(CallApi, "expense-claim-type", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(expenseClaimTypeCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(expenseClaimTypeGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const FiscalYearLive = HttpApiBuilder.group(CallApi, "fiscal-year", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(fiscalYearCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(fiscalYearGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const GlEntryLive = HttpApiBuilder.group(CallApi, "gl-entry", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("list", ({ payload, request }) => call(glEntryListServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const HolidayLive = HttpApiBuilder.group(CallApi, "holiday", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("add", ({ payload, request }) => call(holidayAddServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(holidayGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const HolidayListLive = HttpApiBuilder.group(CallApi, "holiday-list", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("add-weekly-off", ({ payload, request }) => call(holidayListAddWeeklyOffServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(holidayListCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(holidayListGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const InterviewLive = HttpApiBuilder.group(CallApi, "interview", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("clear", ({ payload, request }) => call(interviewClearServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(interviewCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(interviewGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("reject", ({ payload, request }) => call(interviewRejectServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const InterviewFeedbackLive = HttpApiBuilder.group(CallApi, "interview-feedback", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("get", ({ payload, request }) => call(interviewFeedbackGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("give", ({ payload, request }) => call(interviewFeedbackGiveServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const InterviewRoundLive = HttpApiBuilder.group(CallApi, "interview-round", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(interviewRoundCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(interviewRoundGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const JobApplicantLive = HttpApiBuilder.group(CallApi, "job-applicant", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("accept", ({ payload, request }) => call(jobApplicantAcceptServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(jobApplicantCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(jobApplicantGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("hold", ({ payload, request }) => call(jobApplicantHoldServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("reject", ({ payload, request }) => call(jobApplicantRejectServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const JobOfferLive = HttpApiBuilder.group(CallApi, "job-offer", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("accept", ({ payload, request }) => call(jobOfferAcceptServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(jobOfferCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(jobOfferGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("reject", ({ payload, request }) => call(jobOfferRejectServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const JobOpeningLive = HttpApiBuilder.group(CallApi, "job-opening", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("close", ({ payload, request }) => call(jobOpeningCloseServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(jobOpeningCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(jobOpeningGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const JournalEntryLive = HttpApiBuilder.group(CallApi, "journal-entry", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("cancel", ({ payload, request }) => call(journalEntryCancelServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(journalEntryCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(journalEntryGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("submit", ({ payload, request }) => call(journalEntrySubmitServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const JournalEntryAccountLive = HttpApiBuilder.group(CallApi, "journal-entry-account", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("list", ({ payload, request }) => call(journalEntryAccountListServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const LeaveAllocationLive = HttpApiBuilder.group(CallApi, "leave-allocation", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(leaveAllocationCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(leaveAllocationGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("submit", ({ payload, request }) => call(leaveAllocationSubmitServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const LeaveApplicationLive = HttpApiBuilder.group(CallApi, "leave-application", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("approve", ({ payload, request }) => call(leaveApplicationApproveServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("cancel", ({ payload, request }) => call(leaveApplicationCancelServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(leaveApplicationCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(leaveApplicationGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("reject", ({ payload, request }) => call(leaveApplicationRejectServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const LeaveTypeLive = HttpApiBuilder.group(CallApi, "leave-type", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(leaveTypeCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(leaveTypeGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const ShiftTypeLive = HttpApiBuilder.group(CallApi, "shift-type", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(shiftTypeCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(shiftTypeGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));

export interface Env {
  readonly DB: D1Database;
  readonly WORLD: DurableObjectNamespace;
  /** Better Auth's secret, at least 32 characters: fresh per local world, a named secret per environment. */
  readonly AUTH_SECRET: string;
  readonly OTLP_URL?: string;
  /** The environment's telemetry sinks beside the collector, as JSON: each one's OTLP endpoints and headers. A secret. */
  readonly OTLP_SINKS?: string;
  /** The environment's name, written on every span as `deployment.environment`: `local` for a world of dev or prove. */
  readonly ORTHO_ENVIRONMENT?: string;
  /** Which build this environment runs, set by `ortho env up`; unset for a world made by `ortho dev` or prove. */
  readonly ORTHO_REVISION?: string;
  readonly ORTHO_BUNDLE_SHA256?: string;
  /** The portal's: where the logbook is, which environment this is. Read by `portal.serve`; neither is sent to a browser. */
  readonly ORTHO_LOGBOOK_URL?: string;
  /** `1` in an environment that hosts worlds with lifetimes (a test environment), set by `ortho env up`. */
  readonly ORTHO_WORLDS?: string;
}

/** Which steps each operation runs, by the operation's name: the server's own record, never in the API package (the caller's contract names no step, K14). */
export const steps = {
  "account.balance": ["account.balance.sum"],
  "account.create": ["account.create.load", "account.create.insert"],
  "account.make-ledger": ["account.make-ledger.load", "account.make-ledger.update"],
  "attendance.mark": ["attendance.mark.load", "attendance.mark.insert"],
  "attendance-request.approve": ["attendance-request.approve.load", "attendance-request.approve.mark"],
  "attendance-request.create": ["attendance-request.create.load", "attendance-request.create.insert"],
  "attendance-request.reject": ["attendance-request.reject.update"],
  "bank-account.close": ["bank-account.close.update"],
  "bank-account.open": ["bank-account.open.load", "bank-account.open.insert"],
  "bank-transaction.fail": ["bank-transaction.fail.update"],
  "bank-transaction.land": ["bank-transaction.land.load", "bank-transaction.land.insert"],
  "bank-transaction.send": ["bank-transaction.send.load", "bank-transaction.send.insert"],
  "bank-transaction.settle": ["bank-transaction.settle.update"],
  "branch.create": ["branch.create.insert"],
  "bridge-business.approve": ["bridge-business.approve.update"],
  "bridge-business.reject": ["bridge-business.reject.update"],
  "bridge-business.start": ["bridge-business.start.insert"],
  "bridge-individual.approve": ["bridge-individual.approve.update"],
  "bridge-individual.reject": ["bridge-individual.reject.update"],
  "bridge-individual.start": ["bridge-individual.start.insert"],
  "company.create": ["company.create.insert"],
  "cost-center.create": ["cost-center.create.load", "cost-center.create.insert"],
  "department.create": ["department.create.insert"],
  "designation.create": ["designation.create.insert"],
  "employee.hire": ["employee.hire.load", "employee.hire.insert"],
  "employee.relieve": ["employee.relieve.load", "employee.relieve.update"],
  "employee-grade.create": ["employee-grade.create.insert"],
  "employee-promotion.cancel": ["employee-promotion.cancel.update"],
  "employee-promotion.create": ["employee-promotion.create.load", "employee-promotion.create.insert"],
  "employee-promotion.submit": ["employee-promotion.submit.update"],
  "employee-separation.begin": ["employee-separation.begin.update"],
  "employee-separation.complete": ["employee-separation.complete.update"],
  "employee-separation.create": ["employee-separation.create.load", "employee-separation.create.insert"],
  "employee-transfer.cancel": ["employee-transfer.cancel.update"],
  "employee-transfer.create": ["employee-transfer.create.load", "employee-transfer.create.insert"],
  "employee-transfer.submit": ["employee-transfer.submit.update"],
  "employment-type.create": ["employment-type.create.insert"],
  "expense.add": ["expense.add.load", "expense.add.insert"],
  "expense-claim.approve": ["expense-claim.approve.load", "expense-claim.approve.update"],
  "expense-claim.create": ["expense-claim.create.load", "expense-claim.create.insert"],
  "expense-claim.reject": ["expense-claim.reject.update"],
  "expense-claim-type.create": ["expense-claim-type.create.insert"],
  "fiscal-year.create": ["fiscal-year.create.load", "fiscal-year.create.insert"],
  "holiday.add": ["holiday.add.load", "holiday.add.insert"],
  "holiday-list.add-weekly-off": ["holiday-list.add-weekly-off.load", "holiday-list.add-weekly-off.record"],
  "holiday-list.create": ["holiday-list.create.insert"],
  "interview.clear": ["interview.clear.update"],
  "interview.create": ["interview.create.load", "interview.create.insert"],
  "interview.reject": ["interview.reject.update"],
  "interview-feedback.give": ["interview-feedback.give.load", "interview-feedback.give.insert"],
  "interview-round.create": ["interview-round.create.load", "interview-round.create.insert"],
  "job-applicant.accept": ["job-applicant.accept.load", "job-applicant.accept.update"],
  "job-applicant.create": ["job-applicant.create.load", "job-applicant.create.insert"],
  "job-applicant.hold": ["job-applicant.hold.update"],
  "job-applicant.reject": ["job-applicant.reject.update"],
  "job-offer.accept": ["job-offer.accept.update"],
  "job-offer.create": ["job-offer.create.load", "job-offer.create.insert"],
  "job-offer.reject": ["job-offer.reject.update"],
  "job-opening.close": ["job-opening.close.update"],
  "job-opening.create": ["job-opening.create.load", "job-opening.create.insert"],
  "journal-entry.cancel": ["journal-entry.cancel.load", "journal-entry.cancel.reverse"],
  "journal-entry.create": ["journal-entry.create.load", "journal-entry.create.insert"],
  "journal-entry.submit": ["journal-entry.submit.load", "journal-entry.submit.post"],
  "leave-allocation.create": ["leave-allocation.create.load", "leave-allocation.create.insert"],
  "leave-allocation.submit": ["leave-allocation.submit.load", "leave-allocation.submit.update"],
  "leave-application.approve": ["leave-application.approve.load", "leave-application.approve.mark"],
  "leave-application.cancel": ["leave-application.cancel.update"],
  "leave-application.create": ["leave-application.create.load", "leave-application.create.insert"],
  "leave-application.reject": ["leave-application.reject.update"],
  "leave-type.create": ["leave-type.create.insert"],
  "shift-type.create": ["shift-type.create.insert"],
} as const;

// Better Auth's own routes at /api/auth/*: the device sign-in of this project's CLI. Same database and secret as the
// layer's instance, so a session either one issues is a person to both.
let routes: ReturnType<typeof AuthD1.make> | undefined;
const routesOf = (env: Env) => (routes ??= AuthD1.make({ db: WorldEntry.fenced(env, env.DB), secret: env.AUTH_SECRET, cli: "capxul-cli", worlds: hostsWorlds(env) }));

const build = (env: Env) =>
  HttpRouter.toWebHandler(
    HttpApiBuilder.layer(CallApi).pipe(
      Layer.provide([AccountLive, AttendanceLive, AttendanceRequestLive, BankAccountLive, BankTransactionLive, BranchLive, BridgeBusinessLive, BridgeIndividualLive, CompanyLive, CostCenterLive, DepartmentLive, DesignationLive, EmployeeLive, EmployeeGradeLive, EmployeePromotionLive, EmployeeSeparationLive, EmployeeTransferLive, EmploymentTypeLive, ExpenseLive, ExpenseClaimLive, ExpenseClaimTypeLive, FiscalYearLive, GlEntryLive, HolidayLive, HolidayListLive, InterviewLive, InterviewFeedbackLive, InterviewRoundLive, JobApplicantLive, JobOfferLive, JobOpeningLive, JournalEntryLive, JournalEntryAccountLive, LeaveAllocationLive, LeaveApplicationLive, LeaveTypeLive, ShiftTypeLive]),
      Layer.provideMerge(CallTelemetry.layer),
      Layer.provide([StoreD1.layer({ tables, rules }), JournalD1.layer, WorldEntry.work(env, wakes), Layer.succeed(Environment, env.ORTHO_ENVIRONMENT || "local"), AuthD1.layer(AuthD1.make({ db: WorldEntry.fenced(env, env.DB), secret: env.AUTH_SECRET, worlds: hostsWorlds(env) }))]),
      Layer.provideMerge(Database.d1(WorldEntry.fenced(env, env.DB))),
      Layer.provide(HttpServer.layerServices),
    ),
  );

// Built once per isolate, from the first request's bindings.
let built: ReturnType<typeof build> | undefined;

/** The environments of the blueprint that host worlds: those that declare a `lifetime` (D3 #126). */
const WORLD_ENVIRONMENTS: ReadonlyArray<string> = [];

/**
 * `/_world/*` (the cast that signs people up with known passwords, the facts, the registry of worlds) answers only where
 * worlds live: a world made by `ortho dev` or prove (`local`, or no environment), and an environment that declares a lifetime and
 * was started to host worlds. Anywhere else, staging and production included, it is a 404 before any handler runs.
 */
const hostsWorlds = (env: Env) =>
  !env.ORTHO_ENVIRONMENT || env.ORTHO_ENVIRONMENT === "local" || (env.ORTHO_WORLDS === "1" && WORLD_ENVIRONMENTS.includes(env.ORTHO_ENVIRONMENT));

/** One tool per operation and read: the same served operations as the API, called as the person the access token names. */
const tools = Mcp.tools<Services>({
  catalog,
  served: { "account.balance": accountBalanceServed, "account.create": accountCreateServed, "account.get": accountGetServed, "account.make-ledger": accountMakeLedgerServed, "attendance.get": attendanceGetServed, "attendance.list": attendanceListServed, "attendance.mark": attendanceMarkServed, "attendance-request.approve": attendanceRequestApproveServed, "attendance-request.create": attendanceRequestCreateServed, "attendance-request.get": attendanceRequestGetServed, "attendance-request.reject": attendanceRequestRejectServed, "bank-account.close": bankAccountCloseServed, "bank-account.get": bankAccountGetServed, "bank-account.open": bankAccountOpenServed, "bank-transaction.fail": bankTransactionFailServed, "bank-transaction.get": bankTransactionGetServed, "bank-transaction.land": bankTransactionLandServed, "bank-transaction.list": bankTransactionListServed, "bank-transaction.send": bankTransactionSendServed, "bank-transaction.settle": bankTransactionSettleServed, "branch.create": branchCreateServed, "branch.get": branchGetServed, "bridge-business.approve": bridgeBusinessApproveServed, "bridge-business.get": bridgeBusinessGetServed, "bridge-business.reject": bridgeBusinessRejectServed, "bridge-business.start": bridgeBusinessStartServed, "bridge-individual.approve": bridgeIndividualApproveServed, "bridge-individual.get": bridgeIndividualGetServed, "bridge-individual.reject": bridgeIndividualRejectServed, "bridge-individual.start": bridgeIndividualStartServed, "company.create": companyCreateServed, "company.get": companyGetServed, "cost-center.create": costCenterCreateServed, "cost-center.get": costCenterGetServed, "department.create": departmentCreateServed, "department.get": departmentGetServed, "designation.create": designationCreateServed, "designation.get": designationGetServed, "employee.get": employeeGetServed, "employee.hire": employeeHireServed, "employee.relieve": employeeRelieveServed, "employee-grade.create": employeeGradeCreateServed, "employee-grade.get": employeeGradeGetServed, "employee-promotion.cancel": employeePromotionCancelServed, "employee-promotion.create": employeePromotionCreateServed, "employee-promotion.get": employeePromotionGetServed, "employee-promotion.submit": employeePromotionSubmitServed, "employee-separation.begin": employeeSeparationBeginServed, "employee-separation.complete": employeeSeparationCompleteServed, "employee-separation.create": employeeSeparationCreateServed, "employee-separation.get": employeeSeparationGetServed, "employee-transfer.cancel": employeeTransferCancelServed, "employee-transfer.create": employeeTransferCreateServed, "employee-transfer.get": employeeTransferGetServed, "employee-transfer.submit": employeeTransferSubmitServed, "employment-type.create": employmentTypeCreateServed, "employment-type.get": employmentTypeGetServed, "expense.add": expenseAddServed, "expense.get": expenseGetServed, "expense-claim.approve": expenseClaimApproveServed, "expense-claim.create": expenseClaimCreateServed, "expense-claim.get": expenseClaimGetServed, "expense-claim.reject": expenseClaimRejectServed, "expense-claim-type.create": expenseClaimTypeCreateServed, "expense-claim-type.get": expenseClaimTypeGetServed, "fiscal-year.create": fiscalYearCreateServed, "fiscal-year.get": fiscalYearGetServed, "gl-entry.list": glEntryListServed, "holiday.add": holidayAddServed, "holiday.get": holidayGetServed, "holiday-list.add-weekly-off": holidayListAddWeeklyOffServed, "holiday-list.create": holidayListCreateServed, "holiday-list.get": holidayListGetServed, "interview.clear": interviewClearServed, "interview.create": interviewCreateServed, "interview.get": interviewGetServed, "interview.reject": interviewRejectServed, "interview-feedback.get": interviewFeedbackGetServed, "interview-feedback.give": interviewFeedbackGiveServed, "interview-round.create": interviewRoundCreateServed, "interview-round.get": interviewRoundGetServed, "job-applicant.accept": jobApplicantAcceptServed, "job-applicant.create": jobApplicantCreateServed, "job-applicant.get": jobApplicantGetServed, "job-applicant.hold": jobApplicantHoldServed, "job-applicant.reject": jobApplicantRejectServed, "job-offer.accept": jobOfferAcceptServed, "job-offer.create": jobOfferCreateServed, "job-offer.get": jobOfferGetServed, "job-offer.reject": jobOfferRejectServed, "job-opening.close": jobOpeningCloseServed, "job-opening.create": jobOpeningCreateServed, "job-opening.get": jobOpeningGetServed, "journal-entry.cancel": journalEntryCancelServed, "journal-entry.create": journalEntryCreateServed, "journal-entry.get": journalEntryGetServed, "journal-entry.submit": journalEntrySubmitServed, "journal-entry-account.list": journalEntryAccountListServed, "leave-allocation.create": leaveAllocationCreateServed, "leave-allocation.get": leaveAllocationGetServed, "leave-allocation.submit": leaveAllocationSubmitServed, "leave-application.approve": leaveApplicationApproveServed, "leave-application.cancel": leaveApplicationCancelServed, "leave-application.create": leaveApplicationCreateServed, "leave-application.get": leaveApplicationGetServed, "leave-application.reject": leaveApplicationRejectServed, "leave-type.create": leaveTypeCreateServed, "leave-type.get": leaveTypeGetServed, "shift-type.create": shiftTypeCreateServed, "shift-type.get": shiftTypeGetServed },
  refusals: { codes: Errors.codes, declared: Errors.declared, table: Errors.refusals },
});

// The MCP server's own runtime, built once per isolate: the same store, journal, busy count and auth as the API's.
let mcpRuntime: ManagedRuntime.ManagedRuntime<Services, never> | undefined;
const runtimeOf = (env: Env) =>
  (mcpRuntime ??= ManagedRuntime.make(
    Layer.mergeAll(StoreD1.layer({ tables, rules }), JournalD1.layer, WorldEntry.work(env, wakes), Layer.succeed(Environment, env.ORTHO_ENVIRONMENT || "local"), AuthD1.layer(AuthD1.make({ db: WorldEntry.fenced(env, env.DB), secret: env.AUTH_SECRET, worlds: hostsWorlds(env) }))).pipe(Layer.provideMerge(Database.d1(WorldEntry.fenced(env, env.DB)))),
  ));

const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;

/** Who is asking at `/mcp`: any credential the identity knows, or an OAuth access token. This door is the agent's, so each is an agent for its person (M2-auth, fork 2). */
const asker = (env: Env, request: Request) =>
  runtimeOf(env).runPromise(Effect.flatMap(Principals, (principals) => principals.of(request.headers.get("authorization") ?? undefined, "mcp"))).then((principal) =>
    principal.kind !== "anonymous"
      ? { kind: "asked" as const, principal }
      : Effect.runPromise(AuthD1.oauth.bearer(routesOf(env), request)).then((who) => (who.kind === "person" ? { kind: "asked" as const, principal: who.principal } : who)));

/** `/mcp`: an agent's credential, or a 401 that says where to get one; then the tool call. */
const mcp = (env: Env, request: Request, context: Context.Context<never> | undefined): Promise<Response> =>
  asker(env, request).then((who) => {
    if (who.kind !== "asked") {
      const invalid = who.kind === "invalid";
      return Response.json({ error: invalid ? "invalid_token" : "unauthorized" }, { status: 401, headers: { "www-authenticate": AuthD1.oauth.challenge(request, invalid ? "invalid_token" : undefined) } });
    }
    // The caller's span, when it sent one, is the parent of every span of the call.
    const sent = request.headers.get("traceparent")?.match(TRACEPARENT);
    const parent = sent ? Tracer.externalSpan({ traceId: sent[1]!, spanId: sent[2]!, sampled: true }) : undefined;
    const run = (effect: Effect.Effect<McpResult, never, Services>) => {
      const traced = parent ? Effect.withParentSpan(effect, parent) : effect;
      return runtimeOf(env).runPromise(context ? Effect.provideContext(traced, context) : traced);
    };
    return Mcp.handle({ name: "capxul", version: env.ORTHO_REVISION ?? "0.0.0", tools, principal: who.principal, run }, request);
  });

/** Each request runs in its world's time: `Date` and Effect's `Clock` read the instant its world keeps (stepped and scaled worlds only). */
export default WorldEntry.entry<Env>({
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Closed before anything reads it: outside worlds there is no door to cast, to read facts, or to register a world.
    if (new URL(request.url).pathname.startsWith("/_world/") && !hostsWorlds(env)) return Promise.resolve(Response.json({ error: "not found" }, { status: 404 }));
    if (new URL(request.url).pathname.startsWith("/_world/")) {
      return toWorld({ worlds: env.WORLD, db: env.DB, tables: tables.map(([, table]) => table), leases: env.ORTHO_WORLDS === "1" }, request);
    }
    if (new URL(request.url).pathname === "/_ortho/bundle") {
      return env.ORTHO_REVISION && env.ORTHO_BUNDLE_SHA256
        ? Promise.resolve(Response.json({ revision: env.ORTHO_REVISION, sha256: env.ORTHO_BUNDLE_SHA256 }))
        : Promise.resolve(Response.json({ _tag: "NotAnEnvironment" }, { status: 404 }));
    }
    if (portal.owns(new URL(request.url).pathname)) return portal.serve(request, env);
    if (new URL(request.url).pathname.startsWith("/api/auth/")) return WorldEntry.section(env, () => Effect.runPromise(AuthD1.handle(routesOf(env), request)));
    if (new URL(request.url).pathname.startsWith("/.well-known/")) {
      return Effect.runPromise(AuthD1.oauth.discovery(routesOf(env), request)).then((found) => found ?? Response.json({ error: "not found" }, { status: 404 }));
    }
    if (new URL(request.url).pathname === "/mcp") {
      return Telemetry.serve({ url: env.OTLP_URL || undefined, sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT, service: "capxul", handler: (req, context) => mcp(env, req, context), waitUntil: (p) => ctx.waitUntil(p) }, request);
    }
    const app = (built ??= build(env));
    Telemetry.configure({ sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT });
    return Telemetry.serve({ url: env.OTLP_URL || undefined, service: "capxul", handler: app.handler, waitUntil: (p) => ctx.waitUntil(p) }, request);
  },
});
