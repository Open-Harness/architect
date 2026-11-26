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
import * as appraisalCreate from "../api/src/appraisal/create.ts";
import * as appraisalGet from "../api/src/appraisal/get.ts";
import * as appraisalList from "../api/src/appraisal/list.ts";
import * as appraisalRate from "../api/src/appraisal/rate.ts";
import * as appraisalSelfRate from "../api/src/appraisal/self-rate.ts";
import * as appraisalSubmit from "../api/src/appraisal/submit.ts";
import * as appraisalCycleComplete from "../api/src/appraisal-cycle/complete.ts";
import * as appraisalCycleCreate from "../api/src/appraisal-cycle/create.ts";
import * as appraisalCycleGet from "../api/src/appraisal-cycle/get.ts";
import * as appraisalCycleReopen from "../api/src/appraisal-cycle/reopen.ts";
import * as appraisalCycleStart from "../api/src/appraisal-cycle/start.ts";
import * as appraisalTemplateCreate from "../api/src/appraisal-template/create.ts";
import * as appraisalTemplateGet from "../api/src/appraisal-template/get.ts";
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
import * as employeeFeedbackCriteriaCreate from "../api/src/employee-feedback-criteria/create.ts";
import * as employeeFeedbackCriteriaGet from "../api/src/employee-feedback-criteria/get.ts";
import * as employeeGradeCreate from "../api/src/employee-grade/create.ts";
import * as employeeGradeGet from "../api/src/employee-grade/get.ts";
import * as employeePerformanceFeedbackCreate from "../api/src/employee-performance-feedback/create.ts";
import * as employeePerformanceFeedbackGet from "../api/src/employee-performance-feedback/get.ts";
import * as employeePerformanceFeedbackSubmit from "../api/src/employee-performance-feedback/submit.ts";
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
import * as goalArchive from "../api/src/goal/archive.ts";
import * as goalClose from "../api/src/goal/close.ts";
import * as goalComplete from "../api/src/goal/complete.ts";
import * as goalCreate from "../api/src/goal/create.ts";
import * as goalGet from "../api/src/goal/get.ts";
import * as goalList from "../api/src/goal/list.ts";
import * as goalReopen from "../api/src/goal/reopen.ts";
import * as goalRollUp from "../api/src/goal/roll-up.ts";
import * as goalUnarchive from "../api/src/goal/unarchive.ts";
import * as goalUpdateProgress from "../api/src/goal/update-progress.ts";
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
import * as kraCreate from "../api/src/kra/create.ts";
import * as kraGet from "../api/src/kra/get.ts";
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
import * as payrollEmployeeDetailList from "../api/src/payroll-employee-detail/list.ts";
import * as payrollEntryCreate from "../api/src/payroll-entry/create.ts";
import * as payrollEntryGet from "../api/src/payroll-entry/get.ts";
import * as payrollEntryList from "../api/src/payroll-entry/list.ts";
import * as payrollEntrySubmit from "../api/src/payroll-entry/submit.ts";
import * as payrollEntrySubmitSlips from "../api/src/payroll-entry/submit-slips.ts";
import * as payrollPeriodCreate from "../api/src/payroll-period/create.ts";
import * as payrollPeriodGet from "../api/src/payroll-period/get.ts";
import * as personalSafeClaim from "../api/src/personal-safe/claim.ts";
import * as personalSafeGet from "../api/src/personal-safe/get.ts";
import * as personalSafeOpen from "../api/src/personal-safe/open.ts";
import * as salaryComponentCreate from "../api/src/salary-component/create.ts";
import * as salaryComponentGet from "../api/src/salary-component/get.ts";
import * as salaryDetailList from "../api/src/salary-detail/list.ts";
import * as salarySlipGet from "../api/src/salary-slip/get.ts";
import * as salarySlipList from "../api/src/salary-slip/list.ts";
import * as salarySlipDetailList from "../api/src/salary-slip-detail/list.ts";
import * as salaryStructureCancel from "../api/src/salary-structure/cancel.ts";
import * as salaryStructureCreate from "../api/src/salary-structure/create.ts";
import * as salaryStructureGet from "../api/src/salary-structure/get.ts";
import * as salaryStructureSubmit from "../api/src/salary-structure/submit.ts";
import * as salaryStructureAssignmentCancel from "../api/src/salary-structure-assignment/cancel.ts";
import * as salaryStructureAssignmentCreate from "../api/src/salary-structure-assignment/create.ts";
import * as salaryStructureAssignmentGet from "../api/src/salary-structure-assignment/get.ts";
import * as salaryStructureAssignmentList from "../api/src/salary-structure-assignment/list.ts";
import * as salaryStructureAssignmentSubmit from "../api/src/salary-structure-assignment/submit.ts";
import * as shiftTypeCreate from "../api/src/shift-type/create.ts";
import * as shiftTypeGet from "../api/src/shift-type/get.ts";
import accountBalanceHandler from "../../src/account/balance.ts";
import accountCreateHandler from "../../src/account/create.ts";
import accountMakeLedgerHandler from "../../src/account/make-ledger.ts";
import appraisalCreateHandler from "../../src/appraisal/create.ts";
import appraisalRateHandler from "../../src/appraisal/rate.ts";
import appraisalSelfRateHandler from "../../src/appraisal/self-rate.ts";
import appraisalSubmitHandler from "../../src/appraisal/submit.ts";
import appraisalCycleCompleteHandler from "../../src/appraisal-cycle/complete.ts";
import appraisalCycleCreateHandler from "../../src/appraisal-cycle/create.ts";
import appraisalCycleReopenHandler from "../../src/appraisal-cycle/reopen.ts";
import appraisalCycleStartHandler from "../../src/appraisal-cycle/start.ts";
import appraisalTemplateCreateHandler from "../../src/appraisal-template/create.ts";
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
import employeeFeedbackCriteriaCreateHandler from "../../src/employee-feedback-criteria/create.ts";
import employeeGradeCreateHandler from "../../src/employee-grade/create.ts";
import employeePerformanceFeedbackCreateHandler from "../../src/employee-performance-feedback/create.ts";
import employeePerformanceFeedbackSubmitHandler from "../../src/employee-performance-feedback/submit.ts";
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
import goalArchiveHandler from "../../src/goal/archive.ts";
import goalCloseHandler from "../../src/goal/close.ts";
import goalCompleteHandler from "../../src/goal/complete.ts";
import goalCreateHandler from "../../src/goal/create.ts";
import goalReopenHandler from "../../src/goal/reopen.ts";
import goalRollUpHandler from "../../src/goal/roll-up.ts";
import goalUnarchiveHandler from "../../src/goal/unarchive.ts";
import goalUpdateProgressHandler from "../../src/goal/update-progress.ts";
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
import kraCreateHandler from "../../src/kra/create.ts";
import leaveAllocationCreateHandler from "../../src/leave-allocation/create.ts";
import leaveAllocationSubmitHandler from "../../src/leave-allocation/submit.ts";
import leaveApplicationApproveHandler from "../../src/leave-application/approve.ts";
import leaveApplicationCancelHandler from "../../src/leave-application/cancel.ts";
import leaveApplicationCreateHandler from "../../src/leave-application/create.ts";
import leaveApplicationRejectHandler from "../../src/leave-application/reject.ts";
import leaveTypeCreateHandler from "../../src/leave-type/create.ts";
import payrollEntryCreateHandler from "../../src/payroll-entry/create.ts";
import payrollEntrySubmitHandler from "../../src/payroll-entry/submit.ts";
import payrollEntrySubmitSlipsHandler from "../../src/payroll-entry/submit-slips.ts";
import payrollPeriodCreateHandler from "../../src/payroll-period/create.ts";
import personalSafeClaimHandler from "../../src/personal-safe/claim.ts";
import personalSafeOpenHandler from "../../src/personal-safe/open.ts";
import salaryComponentCreateHandler from "../../src/salary-component/create.ts";
import salaryStructureCancelHandler from "../../src/salary-structure/cancel.ts";
import salaryStructureCreateHandler from "../../src/salary-structure/create.ts";
import salaryStructureSubmitHandler from "../../src/salary-structure/submit.ts";
import salaryStructureAssignmentCancelHandler from "../../src/salary-structure-assignment/cancel.ts";
import salaryStructureAssignmentCreateHandler from "../../src/salary-structure-assignment/create.ts";
import salaryStructureAssignmentSubmitHandler from "../../src/salary-structure-assignment/submit.ts";
import shiftTypeCreateHandler from "../../src/shift-type/create.ts";
import * as accountThing from "../../blueprint/things/account/thing.ts";
import * as appraisalThing from "../../blueprint/things/appraisal/thing.ts";
import * as appraisalCycleThing from "../../blueprint/things/appraisal-cycle/thing.ts";
import * as appraisalTemplateThing from "../../blueprint/things/appraisal-template/thing.ts";
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
import * as employeeFeedbackCriteriaThing from "../../blueprint/things/employee-feedback-criteria/thing.ts";
import * as employeeGradeThing from "../../blueprint/things/employee-grade/thing.ts";
import * as employeePerformanceFeedbackThing from "../../blueprint/things/employee-performance-feedback/thing.ts";
import * as employeePromotionThing from "../../blueprint/things/employee-promotion/thing.ts";
import * as employeeSeparationThing from "../../blueprint/things/employee-separation/thing.ts";
import * as employeeTransferThing from "../../blueprint/things/employee-transfer/thing.ts";
import * as employmentTypeThing from "../../blueprint/things/employment-type/thing.ts";
import * as expenseThing from "../../blueprint/things/expense/thing.ts";
import * as expenseClaimThing from "../../blueprint/things/expense-claim/thing.ts";
import * as expenseClaimTypeThing from "../../blueprint/things/expense-claim-type/thing.ts";
import * as fiscalYearThing from "../../blueprint/things/fiscal-year/thing.ts";
import * as glEntryThing from "../../blueprint/things/gl-entry/thing.ts";
import * as goalThing from "../../blueprint/things/goal/thing.ts";
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
import * as kraThing from "../../blueprint/things/kra/thing.ts";
import * as leaveAllocationThing from "../../blueprint/things/leave-allocation/thing.ts";
import * as leaveApplicationThing from "../../blueprint/things/leave-application/thing.ts";
import * as leaveTypeThing from "../../blueprint/things/leave-type/thing.ts";
import * as payrollEmployeeDetailThing from "../../blueprint/things/payroll-employee-detail/thing.ts";
import * as payrollEntryThing from "../../blueprint/things/payroll-entry/thing.ts";
import * as payrollPeriodThing from "../../blueprint/things/payroll-period/thing.ts";
import * as personalSafeThing from "../../blueprint/things/personal-safe/thing.ts";
import * as salaryComponentThing from "../../blueprint/things/salary-component/thing.ts";
import * as salaryDetailThing from "../../blueprint/things/salary-detail/thing.ts";
import * as salarySlipThing from "../../blueprint/things/salary-slip/thing.ts";
import * as salarySlipDetailThing from "../../blueprint/things/salary-slip-detail/thing.ts";
import * as salaryStructureThing from "../../blueprint/things/salary-structure/thing.ts";
import * as salaryStructureAssignmentThing from "../../blueprint/things/salary-structure-assignment/thing.ts";
import * as shiftTypeThing from "../../blueprint/things/shift-type/thing.ts";
import * as accountInvariants from "../../blueprint/things/account/invariants.ts";
import * as appraisalInvariants from "../../blueprint/things/appraisal/invariants.ts";
import * as appraisalCycleInvariants from "../../blueprint/things/appraisal-cycle/invariants.ts";
import * as appraisalTemplateInvariants from "../../blueprint/things/appraisal-template/invariants.ts";
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
import * as employeeFeedbackCriteriaInvariants from "../../blueprint/things/employee-feedback-criteria/invariants.ts";
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
import * as kraInvariants from "../../blueprint/things/kra/invariants.ts";
import * as leaveTypeInvariants from "../../blueprint/things/leave-type/invariants.ts";
import * as payrollPeriodInvariants from "../../blueprint/things/payroll-period/invariants.ts";
import * as personalSafeInvariants from "../../blueprint/things/personal-safe/invariants.ts";
import * as salaryComponentInvariants from "../../blueprint/things/salary-component/invariants.ts";
import * as salaryStructureInvariants from "../../blueprint/things/salary-structure/invariants.ts";
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
const appraisalCreateServed = Handlers.serve({ name: "appraisal.create", operation: appraisalCreate.declaration, handler: appraisalCreateHandler, notFound: { employee: "EmployeeNotFound", appraisalTemplate: "AppraisalTemplateNotFound" }, invariants: { AppraisalAlreadyExists: "appraisal.oneAppraisalPerCycle" }, codes: Errors.codes });
const appraisalGetServed = Reads.serve({ name: "appraisal.get", read: appraisalGet.declaration });
const appraisalListServed = Reads.serve({ name: "appraisal.list", read: appraisalList.declaration });
const appraisalRateServed = Handlers.serve({ name: "appraisal.rate", operation: appraisalRate.declaration, handler: appraisalRateHandler, notFrom: "AppraisalNotDraft", invariants: { AppraisalAlreadyExists: "appraisal.oneAppraisalPerCycle" }, codes: Errors.codes });
const appraisalSelfRateServed = Handlers.serve({ name: "appraisal.self-rate", operation: appraisalSelfRate.declaration, handler: appraisalSelfRateHandler, notFrom: "AppraisalNotDraft", invariants: { AppraisalAlreadyExists: "appraisal.oneAppraisalPerCycle" }, codes: Errors.codes });
const appraisalSubmitServed = Handlers.serve({ name: "appraisal.submit", operation: appraisalSubmit.declaration, handler: appraisalSubmitHandler, notFrom: "AppraisalNotDraft", invariants: { AppraisalAlreadyExists: "appraisal.oneAppraisalPerCycle" }, codes: Errors.codes });
const appraisalCycleCompleteServed = Handlers.serve({ name: "appraisal-cycle.complete", operation: appraisalCycleComplete.declaration, handler: appraisalCycleCompleteHandler, notFrom: "AppraisalCycleNotNotStarted", invariants: { CycleNameTaken: "appraisal-cycle.oneNamePerCompany" }, codes: Errors.codes });
const appraisalCycleCreateServed = Handlers.serve({ name: "appraisal-cycle.create", operation: appraisalCycleCreate.declaration, handler: appraisalCycleCreateHandler, invariants: { CycleNameTaken: "appraisal-cycle.oneNamePerCompany" }, codes: Errors.codes });
const appraisalCycleGetServed = Reads.serve({ name: "appraisal-cycle.get", read: appraisalCycleGet.declaration });
const appraisalCycleReopenServed = Handlers.serve({ name: "appraisal-cycle.reopen", operation: appraisalCycleReopen.declaration, handler: appraisalCycleReopenHandler, notFrom: "AppraisalCycleNotNotStarted", invariants: { CycleNameTaken: "appraisal-cycle.oneNamePerCompany" }, codes: Errors.codes });
const appraisalCycleStartServed = Handlers.serve({ name: "appraisal-cycle.start", operation: appraisalCycleStart.declaration, handler: appraisalCycleStartHandler, notFrom: "AppraisalCycleNotNotStarted", invariants: { AppraisalAlreadyExists: "appraisal.oneAppraisalPerCycle", CycleNameTaken: "appraisal-cycle.oneNamePerCompany" }, codes: Errors.codes });
const appraisalTemplateCreateServed = Handlers.serve({ name: "appraisal-template.create", operation: appraisalTemplateCreate.declaration, handler: appraisalTemplateCreateHandler, invariants: { TemplateTitleTaken: "appraisal-template.oneTitlePerCompany" }, codes: Errors.codes });
const appraisalTemplateGetServed = Reads.serve({ name: "appraisal-template.get", read: appraisalTemplateGet.declaration });
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
const employeeFeedbackCriteriaCreateServed = Handlers.serve({ name: "employee-feedback-criteria.create", operation: employeeFeedbackCriteriaCreate.declaration, handler: employeeFeedbackCriteriaCreateHandler, invariants: { CriteriaNameTaken: "employee-feedback-criteria.oneNamePerCompany" }, codes: Errors.codes });
const employeeFeedbackCriteriaGetServed = Reads.serve({ name: "employee-feedback-criteria.get", read: employeeFeedbackCriteriaGet.declaration });
const employeeGradeCreateServed = Handlers.serve({ name: "employee-grade.create", operation: employeeGradeCreate.declaration, handler: employeeGradeCreateHandler, invariants: { EmployeeGradeNameTaken: "employee-grade.oneNamePerCompany" }, codes: Errors.codes });
const employeeGradeGetServed = Reads.serve({ name: "employee-grade.get", read: employeeGradeGet.declaration });
const employeePerformanceFeedbackCreateServed = Handlers.serve({ name: "employee-performance-feedback.create", operation: employeePerformanceFeedbackCreate.declaration, handler: employeePerformanceFeedbackCreateHandler, notFound: { appraisal: "AppraisalNotFound" }, codes: Errors.codes });
const employeePerformanceFeedbackGetServed = Reads.serve({ name: "employee-performance-feedback.get", read: employeePerformanceFeedbackGet.declaration });
const employeePerformanceFeedbackSubmitServed = Handlers.serve({ name: "employee-performance-feedback.submit", operation: employeePerformanceFeedbackSubmit.declaration, handler: employeePerformanceFeedbackSubmitHandler, notFrom: "EmployeePerformanceFeedbackNotDraft", invariants: { AppraisalAlreadyExists: "appraisal.oneAppraisalPerCycle" }, codes: Errors.codes });
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
const goalArchiveServed = Handlers.serve({ name: "goal.archive", operation: goalArchive.declaration, handler: goalArchiveHandler, notFrom: "GoalNotPending", invariants: { AppraisalAlreadyExists: "appraisal.oneAppraisalPerCycle" }, codes: Errors.codes });
const goalCloseServed = Handlers.serve({ name: "goal.close", operation: goalClose.declaration, handler: goalCloseHandler, notFrom: "GoalNotPending", invariants: { AppraisalAlreadyExists: "appraisal.oneAppraisalPerCycle" }, codes: Errors.codes });
const goalCompleteServed = Handlers.serve({ name: "goal.complete", operation: goalComplete.declaration, handler: goalCompleteHandler, notFrom: "GoalNotPending", invariants: { AppraisalAlreadyExists: "appraisal.oneAppraisalPerCycle" }, codes: Errors.codes });
const goalCreateServed = Handlers.serve({ name: "goal.create", operation: goalCreate.declaration, handler: goalCreateHandler, notFound: { employee: "EmployeeNotFound", appraisalCycle: "AppraisalCycleNotFound", kra: "KraNotFound" }, invariants: { AppraisalAlreadyExists: "appraisal.oneAppraisalPerCycle" }, codes: Errors.codes });
const goalGetServed = Reads.serve({ name: "goal.get", read: goalGet.declaration });
const goalListServed = Reads.serve({ name: "goal.list", read: goalList.declaration });
const goalReopenServed = Handlers.serve({ name: "goal.reopen", operation: goalReopen.declaration, handler: goalReopenHandler, notFrom: "GoalNotPending", invariants: { AppraisalAlreadyExists: "appraisal.oneAppraisalPerCycle" }, codes: Errors.codes });
const goalRollUpServed = Handlers.serve({ name: "goal.roll-up", operation: goalRollUp.declaration, handler: goalRollUpHandler, notFrom: "GoalNotPending", codes: Errors.codes });
const goalUnarchiveServed = Handlers.serve({ name: "goal.unarchive", operation: goalUnarchive.declaration, handler: goalUnarchiveHandler, notFrom: "GoalNotPending", invariants: { AppraisalAlreadyExists: "appraisal.oneAppraisalPerCycle" }, codes: Errors.codes });
const goalUpdateProgressServed = Handlers.serve({ name: "goal.update-progress", operation: goalUpdateProgress.declaration, handler: goalUpdateProgressHandler, notFrom: "GoalNotPending", invariants: { AppraisalAlreadyExists: "appraisal.oneAppraisalPerCycle" }, codes: Errors.codes });
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
const kraCreateServed = Handlers.serve({ name: "kra.create", operation: kraCreate.declaration, handler: kraCreateHandler, invariants: { KraTitleTaken: "kra.oneTitlePerCompany" }, codes: Errors.codes });
const kraGetServed = Reads.serve({ name: "kra.get", read: kraGet.declaration });
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
const payrollEmployeeDetailListServed = Reads.serve({ name: "payroll-employee-detail.list", read: payrollEmployeeDetailList.declaration });
const payrollEntryCreateServed = Handlers.serve({ name: "payroll-entry.create", operation: payrollEntryCreate.declaration, handler: payrollEntryCreateHandler, notFound: { costCenter: "CostCenterNotFound", payrollPayableAccount: "AccountNotFound" }, codes: Errors.codes });
const payrollEntryGetServed = Reads.serve({ name: "payroll-entry.get", read: payrollEntryGet.declaration });
const payrollEntryListServed = Reads.serve({ name: "payroll-entry.list", read: payrollEntryList.declaration });
const payrollEntrySubmitServed = Handlers.serve({ name: "payroll-entry.submit", operation: payrollEntrySubmit.declaration, handler: payrollEntrySubmitHandler, notFrom: "PayrollEntryNotDraft", codes: Errors.codes });
const payrollEntrySubmitSlipsServed = Handlers.serve({ name: "payroll-entry.submit-slips", operation: payrollEntrySubmitSlips.declaration, handler: payrollEntrySubmitSlipsHandler, notFrom: "PayrollEntryNotDraft", codes: Errors.codes });
const payrollPeriodCreateServed = Handlers.serve({ name: "payroll-period.create", operation: payrollPeriodCreate.declaration, handler: payrollPeriodCreateHandler, invariants: { PayrollPeriodNameTaken: "payroll-period.oneNamePerCompany" }, codes: Errors.codes });
const payrollPeriodGetServed = Reads.serve({ name: "payroll-period.get", read: payrollPeriodGet.declaration });
const personalSafeClaimServed = Handlers.serve({ name: "personal-safe.claim", operation: personalSafeClaim.declaration, handler: personalSafeClaimHandler, notFrom: "PersonalSafeNotUnclaimed", invariants: { SafeAlreadyOpen: "personal-safe.oneSafePerPerson" }, codes: Errors.codes });
const personalSafeGetServed = Reads.serve({ name: "personal-safe.get", read: personalSafeGet.declaration });
const personalSafeOpenServed = Handlers.serve({ name: "personal-safe.open", operation: personalSafeOpen.declaration, handler: personalSafeOpenHandler, invariants: { SafeAlreadyOpen: "personal-safe.oneSafePerPerson" }, codes: Errors.codes });
const salaryComponentCreateServed = Handlers.serve({ name: "salary-component.create", operation: salaryComponentCreate.declaration, handler: salaryComponentCreateHandler, notFound: { account: "AccountNotFound" }, invariants: { SalaryComponentTaken: "salary-component.oneNamePerCompany" }, codes: Errors.codes });
const salaryComponentGetServed = Reads.serve({ name: "salary-component.get", read: salaryComponentGet.declaration });
const salaryDetailListServed = Reads.serve({ name: "salary-detail.list", read: salaryDetailList.declaration });
const salarySlipGetServed = Reads.serve({ name: "salary-slip.get", read: salarySlipGet.declaration });
const salarySlipListServed = Reads.serve({ name: "salary-slip.list", read: salarySlipList.declaration });
const salarySlipDetailListServed = Reads.serve({ name: "salary-slip-detail.list", read: salarySlipDetailList.declaration });
const salaryStructureCancelServed = Handlers.serve({ name: "salary-structure.cancel", operation: salaryStructureCancel.declaration, handler: salaryStructureCancelHandler, notFrom: "SalaryStructureNotDraft", invariants: { SalaryStructureNameTaken: "salary-structure.oneNamePerCompany" }, codes: Errors.codes });
const salaryStructureCreateServed = Handlers.serve({ name: "salary-structure.create", operation: salaryStructureCreate.declaration, handler: salaryStructureCreateHandler, invariants: { SalaryStructureNameTaken: "salary-structure.oneNamePerCompany" }, codes: Errors.codes });
const salaryStructureGetServed = Reads.serve({ name: "salary-structure.get", read: salaryStructureGet.declaration });
const salaryStructureSubmitServed = Handlers.serve({ name: "salary-structure.submit", operation: salaryStructureSubmit.declaration, handler: salaryStructureSubmitHandler, notFrom: "SalaryStructureNotDraft", invariants: { SalaryStructureNameTaken: "salary-structure.oneNamePerCompany" }, codes: Errors.codes });
const salaryStructureAssignmentCancelServed = Handlers.serve({ name: "salary-structure-assignment.cancel", operation: salaryStructureAssignmentCancel.declaration, handler: salaryStructureAssignmentCancelHandler, notFrom: "SalaryStructureAssignmentNotDraft", codes: Errors.codes });
const salaryStructureAssignmentCreateServed = Handlers.serve({ name: "salary-structure-assignment.create", operation: salaryStructureAssignmentCreate.declaration, handler: salaryStructureAssignmentCreateHandler, notFound: { employee: "EmployeeNotFound", salaryStructure: "SalaryStructureNotFound" }, codes: Errors.codes });
const salaryStructureAssignmentGetServed = Reads.serve({ name: "salary-structure-assignment.get", read: salaryStructureAssignmentGet.declaration });
const salaryStructureAssignmentListServed = Reads.serve({ name: "salary-structure-assignment.list", read: salaryStructureAssignmentList.declaration });
const salaryStructureAssignmentSubmitServed = Handlers.serve({ name: "salary-structure-assignment.submit", operation: salaryStructureAssignmentSubmit.declaration, handler: salaryStructureAssignmentSubmitHandler, notFrom: "SalaryStructureAssignmentNotDraft", codes: Errors.codes });
const shiftTypeCreateServed = Handlers.serve({ name: "shift-type.create", operation: shiftTypeCreate.declaration, handler: shiftTypeCreateHandler, invariants: { ShiftTypeNameTaken: "shift-type.oneNamePerCompany" }, codes: Errors.codes });
const shiftTypeGetServed = Reads.serve({ name: "shift-type.get", read: shiftTypeGet.declaration });

/** Each thing and its table: a D1 table, or the name its actors go by. */
const tables = [[thingIn(accountThing), "account"], [thingIn(appraisalThing), "appraisal"], [thingIn(appraisalCycleThing), "appraisal-cycle"], [thingIn(appraisalTemplateThing), "appraisal-template"], [thingIn(attendanceThing), "attendance"], [thingIn(attendanceRequestThing), "attendance-request"], [thingIn(bankAccountThing), "bank-account"], [thingIn(bankTransactionThing), "bank-transaction"], [thingIn(branchThing), "branch"], [thingIn(bridgeBusinessThing), "bridge-business"], [thingIn(bridgeIndividualThing), "bridge-individual"], [thingIn(companyThing), "company"], [thingIn(costCenterThing), "cost-center"], [thingIn(departmentThing), "department"], [thingIn(designationThing), "designation"], [thingIn(employeeThing), "employee"], [thingIn(employeeFeedbackCriteriaThing), "employee-feedback-criteria"], [thingIn(employeeGradeThing), "employee-grade"], [thingIn(employeePerformanceFeedbackThing), "employee-performance-feedback"], [thingIn(employeePromotionThing), "employee-promotion"], [thingIn(employeeSeparationThing), "employee-separation"], [thingIn(employeeTransferThing), "employee-transfer"], [thingIn(employmentTypeThing), "employment-type"], [thingIn(expenseThing), "expense"], [thingIn(expenseClaimThing), "expense-claim"], [thingIn(expenseClaimTypeThing), "expense-claim-type"], [thingIn(fiscalYearThing), "fiscal-year"], [thingIn(glEntryThing), "gl-entry"], [thingIn(goalThing), "goal"], [thingIn(holidayThing), "holiday"], [thingIn(holidayListThing), "holiday-list"], [thingIn(interviewThing), "interview"], [thingIn(interviewFeedbackThing), "interview-feedback"], [thingIn(interviewRoundThing), "interview-round"], [thingIn(jobApplicantThing), "job-applicant"], [thingIn(jobOfferThing), "job-offer"], [thingIn(jobOpeningThing), "job-opening"], [thingIn(journalEntryThing), "journal-entry"], [thingIn(journalEntryAccountThing), "journal-entry-account"], [thingIn(kraThing), "kra"], [thingIn(leaveAllocationThing), "leave-allocation"], [thingIn(leaveApplicationThing), "leave-application"], [thingIn(leaveTypeThing), "leave-type"], [thingIn(payrollEmployeeDetailThing), "payroll-employee-detail"], [thingIn(payrollEntryThing), "payroll-entry"], [thingIn(payrollPeriodThing), "payroll-period"], [thingIn(personalSafeThing), "personal-safe"], [thingIn(salaryComponentThing), "salary-component"], [thingIn(salaryDetailThing), "salary-detail"], [thingIn(salarySlipThing), "salary-slip"], [thingIn(salarySlipDetailThing), "salary-slip-detail"], [thingIn(salaryStructureThing), "salary-structure"], [thingIn(salaryStructureAssignmentThing), "salary-structure-assignment"], [thingIn(shiftTypeThing), "shift-type"]] as const;

/** Each rule (G5) under its full name, `<thing>.<rule>`: the store's index refuses a second holder at commit, and the runtime refuses before it. */
const rules = [...invariantsIn("account", accountInvariants), ...invariantsIn("appraisal", appraisalInvariants), ...invariantsIn("appraisal-cycle", appraisalCycleInvariants), ...invariantsIn("appraisal-template", appraisalTemplateInvariants), ...invariantsIn("attendance", attendanceInvariants), ...invariantsIn("bank-account", bankAccountInvariants), ...invariantsIn("bank-transaction", bankTransactionInvariants), ...invariantsIn("branch", branchInvariants), ...invariantsIn("bridge-business", bridgeBusinessInvariants), ...invariantsIn("bridge-individual", bridgeIndividualInvariants), ...invariantsIn("company", companyInvariants), ...invariantsIn("cost-center", costCenterInvariants), ...invariantsIn("department", departmentInvariants), ...invariantsIn("designation", designationInvariants), ...invariantsIn("employee", employeeInvariants), ...invariantsIn("employee-feedback-criteria", employeeFeedbackCriteriaInvariants), ...invariantsIn("employee-grade", employeeGradeInvariants), ...invariantsIn("employee-separation", employeeSeparationInvariants), ...invariantsIn("employment-type", employmentTypeInvariants), ...invariantsIn("expense-claim-type", expenseClaimTypeInvariants), ...invariantsIn("fiscal-year", fiscalYearInvariants), ...invariantsIn("holiday", holidayInvariants), ...invariantsIn("holiday-list", holidayListInvariants), ...invariantsIn("interview", interviewInvariants), ...invariantsIn("interview-feedback", interviewFeedbackInvariants), ...invariantsIn("interview-round", interviewRoundInvariants), ...invariantsIn("job-offer", jobOfferInvariants), ...invariantsIn("kra", kraInvariants), ...invariantsIn("leave-type", leaveTypeInvariants), ...invariantsIn("payroll-period", payrollPeriodInvariants), ...invariantsIn("personal-safe", personalSafeInvariants), ...invariantsIn("salary-component", salaryComponentInvariants), ...invariantsIn("salary-structure", salaryStructureInvariants), ...invariantsIn("shift-type", shiftTypeInvariants)] as const;

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
const AppraisalLive = HttpApiBuilder.group(CallApi, "appraisal", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(appraisalCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(appraisalGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("list", ({ payload, request }) => call(appraisalListServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("rate", ({ payload, request }) => call(appraisalRateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("self-rate", ({ payload, request }) => call(appraisalSelfRateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("submit", ({ payload, request }) => call(appraisalSubmitServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const AppraisalCycleLive = HttpApiBuilder.group(CallApi, "appraisal-cycle", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("complete", ({ payload, request }) => call(appraisalCycleCompleteServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(appraisalCycleCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(appraisalCycleGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("reopen", ({ payload, request }) => call(appraisalCycleReopenServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("start", ({ payload, request }) => call(appraisalCycleStartServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const AppraisalTemplateLive = HttpApiBuilder.group(CallApi, "appraisal-template", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(appraisalTemplateCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(appraisalTemplateGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
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
const EmployeeFeedbackCriteriaLive = HttpApiBuilder.group(CallApi, "employee-feedback-criteria", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(employeeFeedbackCriteriaCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(employeeFeedbackCriteriaGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const EmployeeGradeLive = HttpApiBuilder.group(CallApi, "employee-grade", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(employeeGradeCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(employeeGradeGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const EmployeePerformanceFeedbackLive = HttpApiBuilder.group(CallApi, "employee-performance-feedback", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(employeePerformanceFeedbackCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(employeePerformanceFeedbackGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("submit", ({ payload, request }) => call(employeePerformanceFeedbackSubmitServed, payload, request.headers).pipe(Effect.provideContext(services)));
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
const GoalLive = HttpApiBuilder.group(CallApi, "goal", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("archive", ({ payload, request }) => call(goalArchiveServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("close", ({ payload, request }) => call(goalCloseServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("complete", ({ payload, request }) => call(goalCompleteServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(goalCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(goalGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("list", ({ payload, request }) => call(goalListServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("reopen", ({ payload, request }) => call(goalReopenServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("roll-up", ({ payload, request }) => call(goalRollUpServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("unarchive", ({ payload, request }) => call(goalUnarchiveServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("update-progress", ({ payload, request }) => call(goalUpdateProgressServed, payload, request.headers).pipe(Effect.provideContext(services)));
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
const KraLive = HttpApiBuilder.group(CallApi, "kra", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(kraCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(kraGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
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
const PayrollEmployeeDetailLive = HttpApiBuilder.group(CallApi, "payroll-employee-detail", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("list", ({ payload, request }) => call(payrollEmployeeDetailListServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const PayrollEntryLive = HttpApiBuilder.group(CallApi, "payroll-entry", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(payrollEntryCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(payrollEntryGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("list", ({ payload, request }) => call(payrollEntryListServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("submit", ({ payload, request }) => call(payrollEntrySubmitServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("submit-slips", ({ payload, request }) => call(payrollEntrySubmitSlipsServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const PayrollPeriodLive = HttpApiBuilder.group(CallApi, "payroll-period", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(payrollPeriodCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(payrollPeriodGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const PersonalSafeLive = HttpApiBuilder.group(CallApi, "personal-safe", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("claim", ({ payload, request }) => call(personalSafeClaimServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(personalSafeGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("open", ({ payload, request }) => call(personalSafeOpenServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const SalaryComponentLive = HttpApiBuilder.group(CallApi, "salary-component", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("create", ({ payload, request }) => call(salaryComponentCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(salaryComponentGetServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const SalaryDetailLive = HttpApiBuilder.group(CallApi, "salary-detail", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("list", ({ payload, request }) => call(salaryDetailListServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const SalarySlipLive = HttpApiBuilder.group(CallApi, "salary-slip", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("get", ({ payload, request }) => call(salarySlipGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("list", ({ payload, request }) => call(salarySlipListServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const SalarySlipDetailLive = HttpApiBuilder.group(CallApi, "salary-slip-detail", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("list", ({ payload, request }) => call(salarySlipDetailListServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const SalaryStructureLive = HttpApiBuilder.group(CallApi, "salary-structure", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("cancel", ({ payload, request }) => call(salaryStructureCancelServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(salaryStructureCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(salaryStructureGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("submit", ({ payload, request }) => call(salaryStructureSubmitServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const SalaryStructureAssignmentLive = HttpApiBuilder.group(CallApi, "salary-structure-assignment", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth, Timers, DurableTimers)(yield* Effect.context<Services>());
  return handlers
      .handle("cancel", ({ payload, request }) => call(salaryStructureAssignmentCancelServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(salaryStructureAssignmentCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("get", ({ payload, request }) => call(salaryStructureAssignmentGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("list", ({ payload, request }) => call(salaryStructureAssignmentListServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("submit", ({ payload, request }) => call(salaryStructureAssignmentSubmitServed, payload, request.headers).pipe(Effect.provideContext(services)));
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
  "appraisal.create": ["appraisal.create.load", "appraisal.create.insert"],
  "appraisal.rate": ["appraisal.rate.load", "appraisal.rate.update"],
  "appraisal.self-rate": ["appraisal.self-rate.load", "appraisal.self-rate.update"],
  "appraisal.submit": ["appraisal.submit.load", "appraisal.submit.update"],
  "appraisal-cycle.complete": ["appraisal-cycle.complete.load", "appraisal-cycle.complete.update"],
  "appraisal-cycle.create": ["appraisal-cycle.create.load", "appraisal-cycle.create.insert"],
  "appraisal-cycle.reopen": ["appraisal-cycle.reopen.update"],
  "appraisal-cycle.start": ["appraisal-cycle.start.load", "appraisal-cycle.start.create"],
  "appraisal-template.create": ["appraisal-template.create.load", "appraisal-template.create.insert"],
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
  "employee-feedback-criteria.create": ["employee-feedback-criteria.create.insert"],
  "employee-grade.create": ["employee-grade.create.insert"],
  "employee-performance-feedback.create": ["employee-performance-feedback.create.load", "employee-performance-feedback.create.insert"],
  "employee-performance-feedback.submit": ["employee-performance-feedback.submit.load", "employee-performance-feedback.submit.update"],
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
  "goal.archive": ["goal.archive.load", "goal.archive.update"],
  "goal.close": ["goal.close.load", "goal.close.update"],
  "goal.complete": ["goal.complete.load", "goal.complete.update"],
  "goal.create": ["goal.create.load", "goal.create.insert"],
  "goal.reopen": ["goal.reopen.load", "goal.reopen.update"],
  "goal.roll-up": ["goal.roll-up.load", "goal.roll-up.update"],
  "goal.unarchive": ["goal.unarchive.load", "goal.unarchive.update"],
  "goal.update-progress": ["goal.update-progress.load", "goal.update-progress.update"],
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
  "kra.create": ["kra.create.insert"],
  "leave-allocation.create": ["leave-allocation.create.load", "leave-allocation.create.insert"],
  "leave-allocation.submit": ["leave-allocation.submit.load", "leave-allocation.submit.update"],
  "leave-application.approve": ["leave-application.approve.load", "leave-application.approve.mark"],
  "leave-application.cancel": ["leave-application.cancel.update"],
  "leave-application.create": ["leave-application.create.load", "leave-application.create.insert"],
  "leave-application.reject": ["leave-application.reject.update"],
  "leave-type.create": ["leave-type.create.insert"],
  "payroll-entry.create": ["payroll-entry.create.load", "payroll-entry.create.insert"],
  "payroll-entry.submit": ["payroll-entry.submit.load", "payroll-entry.submit.slips"],
  "payroll-entry.submit-slips": ["payroll-entry.submit-slips.load", "payroll-entry.submit-slips.accrue"],
  "payroll-period.create": ["payroll-period.create.load", "payroll-period.create.insert"],
  "personal-safe.claim": ["personal-safe.claim.update"],
  "personal-safe.open": ["personal-safe.open.insert"],
  "salary-component.create": ["salary-component.create.load", "salary-component.create.insert"],
  "salary-structure.cancel": ["salary-structure.cancel.load", "salary-structure.cancel.update"],
  "salary-structure.create": ["salary-structure.create.load", "salary-structure.create.insert"],
  "salary-structure.submit": ["salary-structure.submit.update"],
  "salary-structure-assignment.cancel": ["salary-structure-assignment.cancel.update"],
  "salary-structure-assignment.create": ["salary-structure-assignment.create.load", "salary-structure-assignment.create.insert"],
  "salary-structure-assignment.submit": ["salary-structure-assignment.submit.load", "salary-structure-assignment.submit.update"],
  "shift-type.create": ["shift-type.create.insert"],
} as const;

// Better Auth's own routes at /api/auth/*: the device sign-in of this project's CLI. Same database and secret as the
// layer's instance, so a session either one issues is a person to both.
let routes: ReturnType<typeof AuthD1.make> | undefined;
const routesOf = (env: Env) => (routes ??= AuthD1.make({ db: WorldEntry.fenced(env, env.DB), secret: env.AUTH_SECRET, cli: "capxul-cli", worlds: hostsWorlds(env) }));

const build = (env: Env) =>
  HttpRouter.toWebHandler(
    HttpApiBuilder.layer(CallApi).pipe(
      Layer.provide([AccountLive, AppraisalLive, AppraisalCycleLive, AppraisalTemplateLive, AttendanceLive, AttendanceRequestLive, BankAccountLive, BankTransactionLive, BranchLive, BridgeBusinessLive, BridgeIndividualLive, CompanyLive, CostCenterLive, DepartmentLive, DesignationLive, EmployeeLive, EmployeeFeedbackCriteriaLive, EmployeeGradeLive, EmployeePerformanceFeedbackLive, EmployeePromotionLive, EmployeeSeparationLive, EmployeeTransferLive, EmploymentTypeLive, ExpenseLive, ExpenseClaimLive, ExpenseClaimTypeLive, FiscalYearLive, GlEntryLive, GoalLive, HolidayLive, HolidayListLive, InterviewLive, InterviewFeedbackLive, InterviewRoundLive, JobApplicantLive, JobOfferLive, JobOpeningLive, JournalEntryLive, JournalEntryAccountLive, KraLive, LeaveAllocationLive, LeaveApplicationLive, LeaveTypeLive, PayrollEmployeeDetailLive, PayrollEntryLive, PayrollPeriodLive, PersonalSafeLive, SalaryComponentLive, SalaryDetailLive, SalarySlipLive, SalarySlipDetailLive, SalaryStructureLive, SalaryStructureAssignmentLive, ShiftTypeLive]),
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
  served: { "account.balance": accountBalanceServed, "account.create": accountCreateServed, "account.get": accountGetServed, "account.make-ledger": accountMakeLedgerServed, "appraisal.create": appraisalCreateServed, "appraisal.get": appraisalGetServed, "appraisal.list": appraisalListServed, "appraisal.rate": appraisalRateServed, "appraisal.self-rate": appraisalSelfRateServed, "appraisal.submit": appraisalSubmitServed, "appraisal-cycle.complete": appraisalCycleCompleteServed, "appraisal-cycle.create": appraisalCycleCreateServed, "appraisal-cycle.get": appraisalCycleGetServed, "appraisal-cycle.reopen": appraisalCycleReopenServed, "appraisal-cycle.start": appraisalCycleStartServed, "appraisal-template.create": appraisalTemplateCreateServed, "appraisal-template.get": appraisalTemplateGetServed, "attendance.get": attendanceGetServed, "attendance.list": attendanceListServed, "attendance.mark": attendanceMarkServed, "attendance-request.approve": attendanceRequestApproveServed, "attendance-request.create": attendanceRequestCreateServed, "attendance-request.get": attendanceRequestGetServed, "attendance-request.reject": attendanceRequestRejectServed, "bank-account.close": bankAccountCloseServed, "bank-account.get": bankAccountGetServed, "bank-account.open": bankAccountOpenServed, "bank-transaction.fail": bankTransactionFailServed, "bank-transaction.get": bankTransactionGetServed, "bank-transaction.land": bankTransactionLandServed, "bank-transaction.list": bankTransactionListServed, "bank-transaction.send": bankTransactionSendServed, "bank-transaction.settle": bankTransactionSettleServed, "branch.create": branchCreateServed, "branch.get": branchGetServed, "bridge-business.approve": bridgeBusinessApproveServed, "bridge-business.get": bridgeBusinessGetServed, "bridge-business.reject": bridgeBusinessRejectServed, "bridge-business.start": bridgeBusinessStartServed, "bridge-individual.approve": bridgeIndividualApproveServed, "bridge-individual.get": bridgeIndividualGetServed, "bridge-individual.reject": bridgeIndividualRejectServed, "bridge-individual.start": bridgeIndividualStartServed, "company.create": companyCreateServed, "company.get": companyGetServed, "cost-center.create": costCenterCreateServed, "cost-center.get": costCenterGetServed, "department.create": departmentCreateServed, "department.get": departmentGetServed, "designation.create": designationCreateServed, "designation.get": designationGetServed, "employee.get": employeeGetServed, "employee.hire": employeeHireServed, "employee.relieve": employeeRelieveServed, "employee-feedback-criteria.create": employeeFeedbackCriteriaCreateServed, "employee-feedback-criteria.get": employeeFeedbackCriteriaGetServed, "employee-grade.create": employeeGradeCreateServed, "employee-grade.get": employeeGradeGetServed, "employee-performance-feedback.create": employeePerformanceFeedbackCreateServed, "employee-performance-feedback.get": employeePerformanceFeedbackGetServed, "employee-performance-feedback.submit": employeePerformanceFeedbackSubmitServed, "employee-promotion.cancel": employeePromotionCancelServed, "employee-promotion.create": employeePromotionCreateServed, "employee-promotion.get": employeePromotionGetServed, "employee-promotion.submit": employeePromotionSubmitServed, "employee-separation.begin": employeeSeparationBeginServed, "employee-separation.complete": employeeSeparationCompleteServed, "employee-separation.create": employeeSeparationCreateServed, "employee-separation.get": employeeSeparationGetServed, "employee-transfer.cancel": employeeTransferCancelServed, "employee-transfer.create": employeeTransferCreateServed, "employee-transfer.get": employeeTransferGetServed, "employee-transfer.submit": employeeTransferSubmitServed, "employment-type.create": employmentTypeCreateServed, "employment-type.get": employmentTypeGetServed, "expense.add": expenseAddServed, "expense.get": expenseGetServed, "expense-claim.approve": expenseClaimApproveServed, "expense-claim.create": expenseClaimCreateServed, "expense-claim.get": expenseClaimGetServed, "expense-claim.reject": expenseClaimRejectServed, "expense-claim-type.create": expenseClaimTypeCreateServed, "expense-claim-type.get": expenseClaimTypeGetServed, "fiscal-year.create": fiscalYearCreateServed, "fiscal-year.get": fiscalYearGetServed, "gl-entry.list": glEntryListServed, "goal.archive": goalArchiveServed, "goal.close": goalCloseServed, "goal.complete": goalCompleteServed, "goal.create": goalCreateServed, "goal.get": goalGetServed, "goal.list": goalListServed, "goal.reopen": goalReopenServed, "goal.roll-up": goalRollUpServed, "goal.unarchive": goalUnarchiveServed, "goal.update-progress": goalUpdateProgressServed, "holiday.add": holidayAddServed, "holiday.get": holidayGetServed, "holiday-list.add-weekly-off": holidayListAddWeeklyOffServed, "holiday-list.create": holidayListCreateServed, "holiday-list.get": holidayListGetServed, "interview.clear": interviewClearServed, "interview.create": interviewCreateServed, "interview.get": interviewGetServed, "interview.reject": interviewRejectServed, "interview-feedback.get": interviewFeedbackGetServed, "interview-feedback.give": interviewFeedbackGiveServed, "interview-round.create": interviewRoundCreateServed, "interview-round.get": interviewRoundGetServed, "job-applicant.accept": jobApplicantAcceptServed, "job-applicant.create": jobApplicantCreateServed, "job-applicant.get": jobApplicantGetServed, "job-applicant.hold": jobApplicantHoldServed, "job-applicant.reject": jobApplicantRejectServed, "job-offer.accept": jobOfferAcceptServed, "job-offer.create": jobOfferCreateServed, "job-offer.get": jobOfferGetServed, "job-offer.reject": jobOfferRejectServed, "job-opening.close": jobOpeningCloseServed, "job-opening.create": jobOpeningCreateServed, "job-opening.get": jobOpeningGetServed, "journal-entry.cancel": journalEntryCancelServed, "journal-entry.create": journalEntryCreateServed, "journal-entry.get": journalEntryGetServed, "journal-entry.submit": journalEntrySubmitServed, "journal-entry-account.list": journalEntryAccountListServed, "kra.create": kraCreateServed, "kra.get": kraGetServed, "leave-allocation.create": leaveAllocationCreateServed, "leave-allocation.get": leaveAllocationGetServed, "leave-allocation.submit": leaveAllocationSubmitServed, "leave-application.approve": leaveApplicationApproveServed, "leave-application.cancel": leaveApplicationCancelServed, "leave-application.create": leaveApplicationCreateServed, "leave-application.get": leaveApplicationGetServed, "leave-application.reject": leaveApplicationRejectServed, "leave-type.create": leaveTypeCreateServed, "leave-type.get": leaveTypeGetServed, "payroll-employee-detail.list": payrollEmployeeDetailListServed, "payroll-entry.create": payrollEntryCreateServed, "payroll-entry.get": payrollEntryGetServed, "payroll-entry.list": payrollEntryListServed, "payroll-entry.submit": payrollEntrySubmitServed, "payroll-entry.submit-slips": payrollEntrySubmitSlipsServed, "payroll-period.create": payrollPeriodCreateServed, "payroll-period.get": payrollPeriodGetServed, "personal-safe.claim": personalSafeClaimServed, "personal-safe.get": personalSafeGetServed, "personal-safe.open": personalSafeOpenServed, "salary-component.create": salaryComponentCreateServed, "salary-component.get": salaryComponentGetServed, "salary-detail.list": salaryDetailListServed, "salary-slip.get": salarySlipGetServed, "salary-slip.list": salarySlipListServed, "salary-slip-detail.list": salarySlipDetailListServed, "salary-structure.cancel": salaryStructureCancelServed, "salary-structure.create": salaryStructureCreateServed, "salary-structure.get": salaryStructureGetServed, "salary-structure.submit": salaryStructureSubmitServed, "salary-structure-assignment.cancel": salaryStructureAssignmentCancelServed, "salary-structure-assignment.create": salaryStructureAssignmentCreateServed, "salary-structure-assignment.get": salaryStructureAssignmentGetServed, "salary-structure-assignment.list": salaryStructureAssignmentListServed, "salary-structure-assignment.submit": salaryStructureAssignmentSubmitServed, "shift-type.create": shiftTypeCreateServed, "shift-type.get": shiftTypeGetServed },
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
