#!/usr/bin/env node
// Generated from the blueprint. Do not edit.
// `capxul <thing> <verb> --<field> <value>`. Talks to CAPXUL_URL, signed in with CAPXUL_TOKEN when set.
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { CliOutput, Command } from "effect/cli";
import * as Sdk from "../../sdk/src/index.ts";
import { ExitCode } from "./output.ts";
import { get as attendanceGet } from "./attendance/get.ts";
import { list as attendanceList } from "./attendance/list.ts";
import { mark as attendanceMark } from "./attendance/mark.ts";
import { approve as attendanceRequestApprove } from "./attendance-request/approve.ts";
import { create as attendanceRequestCreate } from "./attendance-request/create.ts";
import { get as attendanceRequestGet } from "./attendance-request/get.ts";
import { reject as attendanceRequestReject } from "./attendance-request/reject.ts";
import { close as bankAccountClose } from "./bank-account/close.ts";
import { get as bankAccountGet } from "./bank-account/get.ts";
import { open as bankAccountOpen } from "./bank-account/open.ts";
import { create as branchCreate } from "./branch/create.ts";
import { get as branchGet } from "./branch/get.ts";
import { approve as bridgeBusinessApprove } from "./bridge-business/approve.ts";
import { get as bridgeBusinessGet } from "./bridge-business/get.ts";
import { reject as bridgeBusinessReject } from "./bridge-business/reject.ts";
import { start as bridgeBusinessStart } from "./bridge-business/start.ts";
import { approve as bridgeIndividualApprove } from "./bridge-individual/approve.ts";
import { get as bridgeIndividualGet } from "./bridge-individual/get.ts";
import { reject as bridgeIndividualReject } from "./bridge-individual/reject.ts";
import { start as bridgeIndividualStart } from "./bridge-individual/start.ts";
import { create as companyCreate } from "./company/create.ts";
import { get as companyGet } from "./company/get.ts";
import { create as departmentCreate } from "./department/create.ts";
import { get as departmentGet } from "./department/get.ts";
import { create as designationCreate } from "./designation/create.ts";
import { get as designationGet } from "./designation/get.ts";
import { get as employeeGet } from "./employee/get.ts";
import { hire as employeeHire } from "./employee/hire.ts";
import { relieve as employeeRelieve } from "./employee/relieve.ts";
import { create as employeeGradeCreate } from "./employee-grade/create.ts";
import { get as employeeGradeGet } from "./employee-grade/get.ts";
import { cancel as employeePromotionCancel } from "./employee-promotion/cancel.ts";
import { create as employeePromotionCreate } from "./employee-promotion/create.ts";
import { get as employeePromotionGet } from "./employee-promotion/get.ts";
import { submit as employeePromotionSubmit } from "./employee-promotion/submit.ts";
import { begin as employeeSeparationBegin } from "./employee-separation/begin.ts";
import { complete as employeeSeparationComplete } from "./employee-separation/complete.ts";
import { create as employeeSeparationCreate } from "./employee-separation/create.ts";
import { get as employeeSeparationGet } from "./employee-separation/get.ts";
import { cancel as employeeTransferCancel } from "./employee-transfer/cancel.ts";
import { create as employeeTransferCreate } from "./employee-transfer/create.ts";
import { get as employeeTransferGet } from "./employee-transfer/get.ts";
import { submit as employeeTransferSubmit } from "./employee-transfer/submit.ts";
import { create as employmentTypeCreate } from "./employment-type/create.ts";
import { get as employmentTypeGet } from "./employment-type/get.ts";
import { add as expenseAdd } from "./expense/add.ts";
import { get as expenseGet } from "./expense/get.ts";
import { approve as expenseClaimApprove } from "./expense-claim/approve.ts";
import { create as expenseClaimCreate } from "./expense-claim/create.ts";
import { get as expenseClaimGet } from "./expense-claim/get.ts";
import { reject as expenseClaimReject } from "./expense-claim/reject.ts";
import { create as expenseClaimTypeCreate } from "./expense-claim-type/create.ts";
import { get as expenseClaimTypeGet } from "./expense-claim-type/get.ts";
import { add as holidayAdd } from "./holiday/add.ts";
import { get as holidayGet } from "./holiday/get.ts";
import { addWeeklyOff as holidayListAddWeeklyOff } from "./holiday-list/add-weekly-off.ts";
import { create as holidayListCreate } from "./holiday-list/create.ts";
import { get as holidayListGet } from "./holiday-list/get.ts";
import { clear as interviewClear } from "./interview/clear.ts";
import { create as interviewCreate } from "./interview/create.ts";
import { get as interviewGet } from "./interview/get.ts";
import { reject as interviewReject } from "./interview/reject.ts";
import { get as interviewFeedbackGet } from "./interview-feedback/get.ts";
import { give as interviewFeedbackGive } from "./interview-feedback/give.ts";
import { create as interviewRoundCreate } from "./interview-round/create.ts";
import { get as interviewRoundGet } from "./interview-round/get.ts";
import { accept as jobApplicantAccept } from "./job-applicant/accept.ts";
import { create as jobApplicantCreate } from "./job-applicant/create.ts";
import { get as jobApplicantGet } from "./job-applicant/get.ts";
import { hold as jobApplicantHold } from "./job-applicant/hold.ts";
import { reject as jobApplicantReject } from "./job-applicant/reject.ts";
import { accept as jobOfferAccept } from "./job-offer/accept.ts";
import { create as jobOfferCreate } from "./job-offer/create.ts";
import { get as jobOfferGet } from "./job-offer/get.ts";
import { reject as jobOfferReject } from "./job-offer/reject.ts";
import { close as jobOpeningClose } from "./job-opening/close.ts";
import { create as jobOpeningCreate } from "./job-opening/create.ts";
import { get as jobOpeningGet } from "./job-opening/get.ts";
import { create as shiftTypeCreate } from "./shift-type/create.ts";
import { get as shiftTypeGet } from "./shift-type/get.ts";

// The release version is stamped in when the CLI is published (`ortho publish`); run from source, it says 0.0.0.
declare const ORTHO_VERSION: string | undefined;

const attendance = Command.make("attendance").pipe(Command.withSubcommands([attendanceGet, attendanceList, attendanceMark]));
const attendanceRequest = Command.make("attendance-request").pipe(Command.withSubcommands([attendanceRequestApprove, attendanceRequestCreate, attendanceRequestGet, attendanceRequestReject]));
const bankAccount = Command.make("bank-account").pipe(Command.withSubcommands([bankAccountClose, bankAccountGet, bankAccountOpen]));
const branch = Command.make("branch").pipe(Command.withSubcommands([branchCreate, branchGet]));
const bridgeBusiness = Command.make("bridge-business").pipe(Command.withSubcommands([bridgeBusinessApprove, bridgeBusinessGet, bridgeBusinessReject, bridgeBusinessStart]));
const bridgeIndividual = Command.make("bridge-individual").pipe(Command.withSubcommands([bridgeIndividualApprove, bridgeIndividualGet, bridgeIndividualReject, bridgeIndividualStart]));
const company = Command.make("company").pipe(Command.withSubcommands([companyCreate, companyGet]));
const department = Command.make("department").pipe(Command.withSubcommands([departmentCreate, departmentGet]));
const designation = Command.make("designation").pipe(Command.withSubcommands([designationCreate, designationGet]));
const employee = Command.make("employee").pipe(Command.withSubcommands([employeeGet, employeeHire, employeeRelieve]));
const employeeGrade = Command.make("employee-grade").pipe(Command.withSubcommands([employeeGradeCreate, employeeGradeGet]));
const employeePromotion = Command.make("employee-promotion").pipe(Command.withSubcommands([employeePromotionCancel, employeePromotionCreate, employeePromotionGet, employeePromotionSubmit]));
const employeeSeparation = Command.make("employee-separation").pipe(Command.withSubcommands([employeeSeparationBegin, employeeSeparationComplete, employeeSeparationCreate, employeeSeparationGet]));
const employeeTransfer = Command.make("employee-transfer").pipe(Command.withSubcommands([employeeTransferCancel, employeeTransferCreate, employeeTransferGet, employeeTransferSubmit]));
const employmentType = Command.make("employment-type").pipe(Command.withSubcommands([employmentTypeCreate, employmentTypeGet]));
const expense = Command.make("expense").pipe(Command.withSubcommands([expenseAdd, expenseGet]));
const expenseClaim = Command.make("expense-claim").pipe(Command.withSubcommands([expenseClaimApprove, expenseClaimCreate, expenseClaimGet, expenseClaimReject]));
const expenseClaimType = Command.make("expense-claim-type").pipe(Command.withSubcommands([expenseClaimTypeCreate, expenseClaimTypeGet]));
const holiday = Command.make("holiday").pipe(Command.withSubcommands([holidayAdd, holidayGet]));
const holidayList = Command.make("holiday-list").pipe(Command.withSubcommands([holidayListAddWeeklyOff, holidayListCreate, holidayListGet]));
const interview = Command.make("interview").pipe(Command.withSubcommands([interviewClear, interviewCreate, interviewGet, interviewReject]));
const interviewFeedback = Command.make("interview-feedback").pipe(Command.withSubcommands([interviewFeedbackGet, interviewFeedbackGive]));
const interviewRound = Command.make("interview-round").pipe(Command.withSubcommands([interviewRoundCreate, interviewRoundGet]));
const jobApplicant = Command.make("job-applicant").pipe(Command.withSubcommands([jobApplicantAccept, jobApplicantCreate, jobApplicantGet, jobApplicantHold, jobApplicantReject]));
const jobOffer = Command.make("job-offer").pipe(Command.withSubcommands([jobOfferAccept, jobOfferCreate, jobOfferGet, jobOfferReject]));
const jobOpening = Command.make("job-opening").pipe(Command.withSubcommands([jobOpeningClose, jobOpeningCreate, jobOpeningGet]));
const shiftType = Command.make("shift-type").pipe(Command.withSubcommands([shiftTypeCreate, shiftTypeGet]));

Command.make("capxul").pipe(
  Command.withSubcommands([attendance, attendanceRequest, bankAccount, branch, bridgeBusiness, bridgeIndividual, company, department, designation, employee, employeeGrade, employeePromotion, employeeSeparation, employeeTransfer, employmentType, expense, expenseClaim, expenseClaimType, holiday, holidayList, interview, interviewFeedback, interviewRound, jobApplicant, jobOffer, jobOpening, shiftType]),
  Command.run({ version: typeof ORTHO_VERSION === "string" ? ORTHO_VERSION : "0.0.0" }),
  Effect.provide(CliOutput.layer({ ...CliOutput.defaultFormatter(), formatVersion: (name, version) => `${name} ${version}` })),
  Effect.provide(Sdk.layer(process.env["CAPXUL_URL"] ?? "http://127.0.0.1:8787", process.env["CAPXUL_TOKEN"])),
  Effect.provide(Layer.succeed(ExitCode, ExitCode.of({ set: (code) => Effect.sync(() => void (process.exitCode = code)) }))),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain,
);
