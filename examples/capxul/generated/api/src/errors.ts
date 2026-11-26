// Generated from the blueprint. Do not edit.
import { Schema } from "effect";
import { ErrorNames, wireStruct } from "orthograph/server";
import * as Account from "../../../blueprint/things/account/errors.ts";
import * as Appraisal from "../../../blueprint/things/appraisal/errors.ts";
import * as AppraisalCycle from "../../../blueprint/things/appraisal-cycle/errors.ts";
import * as AppraisalTemplate from "../../../blueprint/things/appraisal-template/errors.ts";
import * as Attendance from "../../../blueprint/things/attendance/errors.ts";
import * as AttendanceRequest from "../../../blueprint/things/attendance-request/errors.ts";
import * as BankAccount from "../../../blueprint/things/bank-account/errors.ts";
import * as BankTransaction from "../../../blueprint/things/bank-transaction/errors.ts";
import * as Branch from "../../../blueprint/things/branch/errors.ts";
import * as BridgeBusiness from "../../../blueprint/things/bridge-business/errors.ts";
import * as BridgeIndividual from "../../../blueprint/things/bridge-individual/errors.ts";
import * as Company from "../../../blueprint/things/company/errors.ts";
import * as CostCenter from "../../../blueprint/things/cost-center/errors.ts";
import * as Department from "../../../blueprint/things/department/errors.ts";
import * as Designation from "../../../blueprint/things/designation/errors.ts";
import * as Employee from "../../../blueprint/things/employee/errors.ts";
import * as EmployeeFeedbackCriteria from "../../../blueprint/things/employee-feedback-criteria/errors.ts";
import * as EmployeeGrade from "../../../blueprint/things/employee-grade/errors.ts";
import * as EmployeePerformanceFeedback from "../../../blueprint/things/employee-performance-feedback/errors.ts";
import * as EmployeePromotion from "../../../blueprint/things/employee-promotion/errors.ts";
import * as EmployeeSeparation from "../../../blueprint/things/employee-separation/errors.ts";
import * as EmployeeTransfer from "../../../blueprint/things/employee-transfer/errors.ts";
import * as EmploymentType from "../../../blueprint/things/employment-type/errors.ts";
import * as Expense from "../../../blueprint/things/expense/errors.ts";
import * as ExpenseClaim from "../../../blueprint/things/expense-claim/errors.ts";
import * as ExpenseClaimType from "../../../blueprint/things/expense-claim-type/errors.ts";
import * as FiscalYear from "../../../blueprint/things/fiscal-year/errors.ts";
import * as Goal from "../../../blueprint/things/goal/errors.ts";
import * as Holiday from "../../../blueprint/things/holiday/errors.ts";
import * as HolidayList from "../../../blueprint/things/holiday-list/errors.ts";
import * as Interview from "../../../blueprint/things/interview/errors.ts";
import * as InterviewFeedback from "../../../blueprint/things/interview-feedback/errors.ts";
import * as InterviewRound from "../../../blueprint/things/interview-round/errors.ts";
import * as JobApplicant from "../../../blueprint/things/job-applicant/errors.ts";
import * as JobOffer from "../../../blueprint/things/job-offer/errors.ts";
import * as JobOpening from "../../../blueprint/things/job-opening/errors.ts";
import * as JournalEntry from "../../../blueprint/things/journal-entry/errors.ts";
import * as Kra from "../../../blueprint/things/kra/errors.ts";
import * as LeaveAllocation from "../../../blueprint/things/leave-allocation/errors.ts";
import * as LeaveApplication from "../../../blueprint/things/leave-application/errors.ts";
import * as LeaveType from "../../../blueprint/things/leave-type/errors.ts";
import * as PayrollEntry from "../../../blueprint/things/payroll-entry/errors.ts";
import * as PayrollPeriod from "../../../blueprint/things/payroll-period/errors.ts";
import * as Safe from "../../../blueprint/things/safe/errors.ts";
import * as SalaryComponent from "../../../blueprint/things/salary-component/errors.ts";
import * as SalaryStructure from "../../../blueprint/things/salary-structure/errors.ts";
import * as SalaryStructureAssignment from "../../../blueprint/things/salary-structure-assignment/errors.ts";
import * as ShiftType from "../../../blueprint/things/shift-type/errors.ts";

/** Every refusal's code, its exit for the CLI and its HTTP status: one row each, read by the CLI, HTTP and MCP. */
export const refusals = {
  ParentAccountNotInCompany: { code: "AC-001", exit: 41, status: 422 },
  ParentAccountIsLedger: { code: "AC-002", exit: 42, status: 422 },
  RootAccountIsLedger: { code: "AC-003", exit: 43, status: 422 },
  RootTypeMissing: { code: "AC-004", exit: 44, status: 422 },
  RootTypeNotParents: { code: "AC-005", exit: 45, status: 422 },
  AccountHasChildren: { code: "AC-006", exit: 46, status: 422 },
  AccountNameTaken: { code: "AC-007", exit: 47, status: 422 },
  AppraisedEmployeeNotInCompany: { code: "AP-001", exit: 41, status: 422 },
  AppraisedEmployeeHasLeft: { code: "AP-002", exit: 42, status: 422 },
  AppraisalCycleCompleted: { code: "AP-003", exit: 43, status: 422 },
  AppraisalTemplateNotInCompany: { code: "AP-004", exit: 44, status: 422 },
  AppraisalAlreadyExists: { code: "AP-005", exit: 51, status: 422 },
  NotRatedManually: { code: "AP-006", exit: 46, status: 422 },
  ScoresDontMatchKras: { code: "AP-007", exit: 47, status: 422 },
  KraScoreOutOfRange: { code: "AP-008", exit: 48, status: 422 },
  SelfRatingsDontMatchCriteria: { code: "AP-009", exit: 49, status: 422 },
  SelfRatingOutOfRange: { code: "AP-010", exit: 50, status: 422 },
  CycleEndsBeforeStart: { code: "CY-001", exit: 41, status: 422 },
  AppraiseeNotInCompany: { code: "CY-002", exit: 42, status: 422 },
  AppraiseeHasLeft: { code: "CY-003", exit: 43, status: 422 },
  AppraiseeTemplateNotInCompany: { code: "CY-004", exit: 44, status: 422 },
  AppraiseeListedTwice: { code: "CY-005", exit: 45, status: 422 },
  CycleWithoutAppraisees: { code: "CY-006", exit: 46, status: 422 },
  AppraisalsNotSubmitted: { code: "CY-007", exit: 47, status: 422 },
  CycleNameTaken: { code: "CY-008", exit: 48, status: 422 },
  TemplateWithoutKras: { code: "TP-001", exit: 41, status: 422 },
  TemplateKraNotInCompany: { code: "TP-002", exit: 42, status: 422 },
  TemplateCriteriaNotInCompany: { code: "TP-003", exit: 43, status: 422 },
  TemplateLineRepeated: { code: "TP-004", exit: 44, status: 422 },
  TemplateWeightageOutOfRange: { code: "TP-005", exit: 45, status: 422 },
  KraWeightageNotHundred: { code: "TP-006", exit: 46, status: 422 },
  CriteriaWeightageNotHundred: { code: "TP-007", exit: 47, status: 422 },
  TemplateTitleTaken: { code: "TP-008", exit: 48, status: 422 },
  AttendeeNotInCompany: { code: "AN-001", exit: 41, status: 422 },
  AttendeeHasLeft: { code: "AN-002", exit: 42, status: 422 },
  AttendanceBeforeJoining: { code: "AN-003", exit: 43, status: 422 },
  AttendanceAlreadyMarked: { code: "AN-004", exit: 44, status: 422 },
  AttendanceOnLeave: { code: "AN-005", exit: 45, status: 422 },
  RequesterNotInCompany: { code: "AQ-001", exit: 41, status: 422 },
  RequesterHasLeft: { code: "AQ-002", exit: 42, status: 422 },
  RequestEndsBeforeStart: { code: "AQ-003", exit: 43, status: 422 },
  RequestBeforeJoining: { code: "AQ-004", exit: 44, status: 422 },
  AttendanceRequestOverlaps: { code: "AQ-005", exit: 45, status: 422 },
  KybNotApproved: { code: "BA-001", exit: 41, status: 422 },
  BankAccountNameTaken: { code: "BA-002", exit: 42, status: 422 },
  AccountClosed: { code: "BT-001", exit: 41, status: 422 },
  CurrencyNotHeld: { code: "BT-002", exit: 42, status: 422 },
  NothingToSend: { code: "BT-003", exit: 43, status: 422 },
  AlreadyRecorded: { code: "BT-004", exit: 44, status: 422 },
  BranchNameTaken: { code: "BR-001", exit: 41, status: 422 },
  KybAlreadyStarted: { code: "KB-001", exit: 41, status: 422 },
  KycAlreadyStarted: { code: "KC-001", exit: 41, status: 422 },
  CompanyNameTaken: { code: "CO-001", exit: 41, status: 422 },
  CompanyAbbrTaken: { code: "CO-002", exit: 42, status: 422 },
  ParentCostCenterNotInCompany: { code: "CC-001", exit: 41, status: 422 },
  ParentCostCenterIsLedger: { code: "CC-002", exit: 42, status: 422 },
  RootCostCenterIsLedger: { code: "CC-003", exit: 43, status: 422 },
  CostCenterNameTaken: { code: "CC-004", exit: 44, status: 422 },
  DepartmentNameTaken: { code: "DE-001", exit: 41, status: 422 },
  DesignationNameTaken: { code: "DS-001", exit: 41, status: 422 },
  EmployeeAlreadyHired: { code: "EM-001", exit: 41, status: 422 },
  DepartmentNotInCompany: { code: "EM-002", exit: 42, status: 422 },
  DesignationNotInCompany: { code: "EM-003", exit: 43, status: 422 },
  JoinedBeforeBorn: { code: "EM-004", exit: 44, status: 422 },
  RelievedBeforeJoined: { code: "EM-005", exit: 45, status: 422 },
  CriteriaNameTaken: { code: "FC-001", exit: 41, status: 422 },
  EmployeeGradeNameTaken: { code: "EG-001", exit: 41, status: 422 },
  FeedbackCycleCompleted: { code: "PF-007", exit: 41, status: 422 },
  FeedbackForOneself: { code: "PF-002", exit: 42, status: 422 },
  ReviewerNotInCompany: { code: "PF-003", exit: 43, status: 422 },
  ReviewerHasLeft: { code: "PF-004", exit: 44, status: 422 },
  FeedbackRatingsDontMatchCriteria: { code: "PF-005", exit: 45, status: 422 },
  FeedbackRatingOutOfRange: { code: "PF-006", exit: 46, status: 422 },
  PromotedEmployeeNotInCompany: { code: "PM-001", exit: 41, status: 422 },
  PromotedEmployeeHasLeft: { code: "PM-002", exit: 42, status: 422 },
  NewDesignationNotInCompany: { code: "PM-003", exit: 43, status: 422 },
  DesignationUnchanged: { code: "PM-004", exit: 44, status: 422 },
  PromotionNotYetDue: { code: "PM-005", exit: 45, status: 422 },
  SeparatedEmployeeNotInCompany: { code: "SP-001", exit: 41, status: 422 },
  SeparationAlreadyOpen: { code: "SP-002", exit: 42, status: 422 },
  TransferredEmployeeNotInCompany: { code: "TR-001", exit: 41, status: 422 },
  TransferredEmployeeHasLeft: { code: "TR-002", exit: 42, status: 422 },
  NewDepartmentNotInCompany: { code: "TR-003", exit: 43, status: 422 },
  DepartmentUnchanged: { code: "TR-004", exit: 44, status: 422 },
  TransferNotYetDue: { code: "TR-005", exit: 45, status: 422 },
  EmploymentTypeNameTaken: { code: "TY-001", exit: 41, status: 422 },
  SanctionedOverClaimed: { code: "EX-001", exit: 41, status: 422 },
  ExpenseTypeNotInCompany: { code: "EX-002", exit: 42, status: 422 },
  ClaimNotDraft: { code: "EX-003", exit: 43, status: 422 },
  ClaimantNotActive: { code: "EC-001", exit: 41, status: 422 },
  EmployeeNotInCompany: { code: "EC-002", exit: 42, status: 422 },
  ClaimHasNoExpenses: { code: "EC-003", exit: 43, status: 422 },
  ExpenseTypeTaken: { code: "ET-001", exit: 41, status: 422 },
  FiscalYearEndsBeforeStart: { code: "FY-001", exit: 41, status: 422 },
  FiscalYearWrongLength: { code: "FY-002", exit: 42, status: 422 },
  FiscalYearOverlaps: { code: "FY-003", exit: 43, status: 422 },
  FiscalYearNameTaken: { code: "FY-004", exit: 44, status: 422 },
  GoalCycleCompleted: { code: "GO-001", exit: 41, status: 422 },
  GoalEmployeeNotInCompany: { code: "GO-002", exit: 42, status: 422 },
  GoalOwnerHasLeft: { code: "GO-003", exit: 43, status: 422 },
  GoalKraNotInAppraisal: { code: "GO-004", exit: 44, status: 422 },
  ParentGoalMismatch: { code: "GO-005", exit: 45, status: 422 },
  ProgressOutOfRange: { code: "GO-006", exit: 46, status: 422 },
  GoalIsGroup: { code: "GO-007", exit: 47, status: 422 },
  GoalNotGroup: { code: "GO-008", exit: 49, status: 422 },
  ParentGoalNotGroup: { code: "GO-009", exit: 48, status: 422 },
  HolidayDateTaken: { code: "HD-001", exit: 41, status: 422 },
  HolidayOutsideList: { code: "HD-002", exit: 42, status: 422 },
  HolidayListNameTaken: { code: "HL-001", exit: 43, status: 422 },
  HolidayListEndsBeforeStart: { code: "HL-002", exit: 44, status: 422 },
  ApplicantRejected: { code: "IV-001", exit: 41, status: 422 },
  RoundNotInCompany: { code: "IV-002", exit: 42, status: 422 },
  InterviewEndsBeforeStart: { code: "IV-003", exit: 43, status: 422 },
  InterviewerNotInCompany: { code: "IV-004", exit: 44, status: 422 },
  InterviewerHasLeft: { code: "IV-005", exit: 45, status: 422 },
  InterviewAlreadyScheduled: { code: "IV-006", exit: 46, status: 422 },
  FeedbackGiverNotInterviewer: { code: "IF-001", exit: 41, status: 422 },
  FeedbackBeforeInterview: { code: "IF-002", exit: 42, status: 422 },
  FeedbackAlreadyGiven: { code: "IF-003", exit: 43, status: 422 },
  RoundNameTaken: { code: "IR-001", exit: 41, status: 422 },
  RoundInterviewerNotInCompany: { code: "IR-002", exit: 42, status: 422 },
  RoundInterviewerHasLeft: { code: "IR-003", exit: 43, status: 422 },
  OpeningClosed: { code: "JA-001", exit: 41, status: 422 },
  OfferNotAccepted: { code: "JA-002", exit: 42, status: 422 },
  OfferDesignationNotInCompany: { code: "JF-001", exit: 41, status: 422 },
  OfferAlreadyMade: { code: "JF-002", exit: 42, status: 422 },
  OpeningWithoutVacancies: { code: "JO-001", exit: 41, status: 422 },
  JournalEntryTooFewLines: { code: "JE-001", exit: 41, status: 422 },
  LineAccountNotInCompany: { code: "JE-002", exit: 42, status: 422 },
  LineAccountIsGroup: { code: "JE-003", exit: 43, status: 422 },
  LineCostCenterNotInCompany: { code: "JE-004", exit: 44, status: 422 },
  LineCostCenterIsGroup: { code: "JE-005", exit: 45, status: 422 },
  LineWithoutAmount: { code: "JE-006", exit: 46, status: 422 },
  LineDebitAndCredit: { code: "JE-007", exit: 47, status: 422 },
  JournalEntryUnbalanced: { code: "JE-008", exit: 48, status: 422 },
  PostingDateOutsideFiscalYear: { code: "JE-009", exit: 49, status: 422 },
  KraTitleTaken: { code: "KR-001", exit: 41, status: 422 },
  AllocateeNotInCompany: { code: "LL-001", exit: 41, status: 422 },
  AllocateeHasLeft: { code: "LL-002", exit: 42, status: 422 },
  AllocationTypeNotInCompany: { code: "LL-003", exit: 43, status: 422 },
  AllocationEndsBeforeStart: { code: "LL-004", exit: 44, status: 422 },
  AllocationOverlaps: { code: "LL-005", exit: 45, status: 422 },
  LeaveWithoutPayNotAllocated: { code: "LL-006", exit: 46, status: 422 },
  NoLeavesAllocated: { code: "LL-007", exit: 47, status: 422 },
  AllocationExceedsPeriod: { code: "LL-008", exit: 48, status: 422 },
  ApplicantNotInCompany: { code: "LP-001", exit: 41, status: 422 },
  ApplicantHasLeft: { code: "LP-002", exit: 42, status: 422 },
  ApplicationTypeNotInCompany: { code: "LP-003", exit: 43, status: 422 },
  LeaveEndsBeforeStart: { code: "LP-004", exit: 44, status: 422 },
  LeaveBeforeJoining: { code: "LP-005", exit: 45, status: 422 },
  NoAllocationCovers: { code: "LP-006", exit: 46, status: 422 },
  LeaveAllHolidays: { code: "LP-007", exit: 47, status: 422 },
  InsufficientLeaveBalance: { code: "LP-008", exit: 48, status: 422 },
  LeaveOverlaps: { code: "LP-009", exit: 49, status: 422 },
  LeaveTooLong: { code: "LP-010", exit: 50, status: 422 },
  LeaveDayAttended: { code: "LP-011", exit: 51, status: 422 },
  LeaveTypeNameTaken: { code: "LT-001", exit: 41, status: 422 },
  PayrollEndsBeforeStart: { code: "PE-001", exit: 41, status: 422 },
  PayableAccountNotInCompany: { code: "PE-002", exit: 42, status: 422 },
  PayableAccountIsGroup: { code: "PE-003", exit: 43, status: 422 },
  PayableAccountHasType: { code: "PE-004", exit: 44, status: 422 },
  PayrollCostCenterNotInCompany: { code: "PE-005", exit: 45, status: 422 },
  PayrollCostCenterIsGroup: { code: "PE-006", exit: 46, status: 422 },
  NoEmployeesFound: { code: "PE-007", exit: 47, status: 422 },
  SalarySlipExists: { code: "PE-008", exit: 48, status: 422 },
  NoAssignmentAtStart: { code: "PE-009", exit: 49, status: 422 },
  AccrualOutsideFiscalYear: { code: "PE-010", exit: 50, status: 422 },
  PayrollPeriodEndsBeforeStart: { code: "PP-001", exit: 41, status: 422 },
  PayrollPeriodOverlaps: { code: "PP-002", exit: 42, status: 422 },
  PayrollPeriodNameTaken: { code: "PP-003", exit: 43, status: 422 },
  SafeAlreadyRecorded: { code: "SF-001", exit: 41, status: 422 },
  FounderHasNoSafe: { code: "SF-002", exit: 42, status: 422 },
  ComponentAccountNotInCompany: { code: "SC-001", exit: 41, status: 422 },
  ComponentAccountIsGroup: { code: "SC-002", exit: 42, status: 422 },
  SalaryComponentTaken: { code: "SC-003", exit: 43, status: 422 },
  StructureWithoutEarnings: { code: "SS-001", exit: 41, status: 422 },
  StructureComponentNotInCompany: { code: "SS-002", exit: 42, status: 422 },
  StructureComponentWrongType: { code: "SS-003", exit: 43, status: 422 },
  StructureLineWithoutAmount: { code: "SS-004", exit: 44, status: 422 },
  StructureComponentRepeated: { code: "SS-005", exit: 45, status: 422 },
  StructureNetPayNegative: { code: "SS-006", exit: 46, status: 422 },
  StructureInUse: { code: "SS-007", exit: 47, status: 422 },
  SalaryStructureNameTaken: { code: "SS-008", exit: 48, status: 422 },
  AssignedEmployeeNotInCompany: { code: "SA-001", exit: 41, status: 422 },
  AssignedEmployeeHasLeft: { code: "SA-002", exit: 42, status: 422 },
  AssignmentExists: { code: "SA-003", exit: 43, status: 422 },
  AssignmentBeforeJoining: { code: "SA-004", exit: 44, status: 422 },
  AssignedStructureNotInCompany: { code: "SA-005", exit: 45, status: 422 },
  AssignedStructureNotSubmitted: { code: "SA-006", exit: 46, status: 422 },
  ShiftTypeNameTaken: { code: "SH-001", exit: 41, status: 422 },
  ShiftStartsWhenItEnds: { code: "SH-002", exit: 42, status: 422 },
  AccountNotGroup: { code: "AC-900", exit: 40, status: 409 },
  AppraisalNotDraft: { code: "AP-900", exit: 40, status: 409 },
  AppraisalCycleNotNotStarted: { code: "CY-900", exit: 40, status: 409 },
  AppraisalTemplateNotActive: { code: "TP-900", exit: 40, status: 409 },
  AttendanceNotMarked: { code: "AN-900", exit: 40, status: 409 },
  AttendanceRequestNotDraft: { code: "AQ-900", exit: 40, status: 409 },
  BankAccountNotOpen: { code: "BA-900", exit: 40, status: 409 },
  BankTransactionNotPending: { code: "BT-900", exit: 40, status: 409 },
  BranchNotActive: { code: "BR-900", exit: 40, status: 409 },
  BridgeBusinessNotStarted: { code: "KB-900", exit: 40, status: 409 },
  BridgeIndividualNotStarted: { code: "KC-900", exit: 40, status: 409 },
  CompanyNotActive: { code: "CO-900", exit: 40, status: 409 },
  CostCenterNotGroup: { code: "CC-900", exit: 40, status: 409 },
  DepartmentNotActive: { code: "DE-900", exit: 40, status: 409 },
  DesignationNotActive: { code: "DS-900", exit: 40, status: 409 },
  EmployeeNotActive: { code: "EM-900", exit: 40, status: 409 },
  EmployeeFeedbackCriteriaNotActive: { code: "FC-900", exit: 40, status: 409 },
  EmployeeGradeNotActive: { code: "EG-900", exit: 40, status: 409 },
  EmployeePerformanceFeedbackNotDraft: { code: "PF-900", exit: 40, status: 409 },
  EmployeePromotionNotDraft: { code: "PM-900", exit: 40, status: 409 },
  EmployeeSeparationNotPending: { code: "SP-900", exit: 40, status: 409 },
  EmployeeTransferNotDraft: { code: "TR-900", exit: 40, status: 409 },
  EmploymentTypeNotActive: { code: "TY-900", exit: 40, status: 409 },
  ExpenseNotActive: { code: "EX-900", exit: 40, status: 409 },
  ExpenseClaimNotDraft: { code: "EC-900", exit: 40, status: 409 },
  ExpenseClaimTypeNotActive: { code: "ET-900", exit: 40, status: 409 },
  FiscalYearNotActive: { code: "FY-900", exit: 40, status: 409 },
  GoalNotPending: { code: "GO-900", exit: 40, status: 409 },
  HolidayNotActive: { code: "HD-900", exit: 40, status: 409 },
  HolidayListNotActive: { code: "HL-900", exit: 40, status: 409 },
  InterviewNotPending: { code: "IV-900", exit: 40, status: 409 },
  InterviewFeedbackNotGiven: { code: "IF-900", exit: 40, status: 409 },
  InterviewRoundNotActive: { code: "IR-900", exit: 40, status: 409 },
  JobApplicantNotOpen: { code: "JA-900", exit: 40, status: 409 },
  JobOfferNotAwaiting: { code: "JF-900", exit: 40, status: 409 },
  JobOpeningNotOpen: { code: "JO-900", exit: 40, status: 409 },
  JournalEntryNotDraft: { code: "JE-900", exit: 40, status: 409 },
  KraNotActive: { code: "KR-900", exit: 40, status: 409 },
  LeaveAllocationNotDraft: { code: "LL-900", exit: 40, status: 409 },
  LeaveApplicationNotOpen: { code: "LP-900", exit: 40, status: 409 },
  LeaveTypeNotActive: { code: "LT-900", exit: 40, status: 409 },
  PayrollEntryNotDraft: { code: "PE-900", exit: 40, status: 409 },
  PayrollPeriodNotActive: { code: "PP-900", exit: 40, status: 409 },
  SafeNotCounterfactual: { code: "SF-900", exit: 40, status: 409 },
  SalaryComponentNotActive: { code: "SC-900", exit: 40, status: 409 },
  SalaryStructureNotDraft: { code: "SS-900", exit: 40, status: 409 },
  SalaryStructureAssignmentNotDraft: { code: "SA-900", exit: 40, status: 409 },
  ShiftTypeNotActive: { code: "SH-900", exit: 40, status: 409 },
  AccountNotFound: { code: "AC-901", exit: 4, status: 404 },
  AppraisalNotFound: { code: "AP-901", exit: 4, status: 404 },
  AppraisalCycleNotFound: { code: "CY-901", exit: 4, status: 404 },
  AppraisalTemplateNotFound: { code: "TP-901", exit: 4, status: 404 },
  BankAccountNotFound: { code: "BA-901", exit: 4, status: 404 },
  BankTransactionNotFound: { code: "BT-901", exit: 4, status: 404 },
  BridgeBusinessNotFound: { code: "KB-901", exit: 4, status: 404 },
  BridgeIndividualNotFound: { code: "KC-901", exit: 4, status: 404 },
  CompanyNotFound: { code: "CO-901", exit: 4, status: 404 },
  CostCenterNotFound: { code: "CC-901", exit: 4, status: 404 },
  DepartmentNotFound: { code: "DE-901", exit: 4, status: 404 },
  DesignationNotFound: { code: "DS-901", exit: 4, status: 404 },
  EmployeeNotFound: { code: "EM-901", exit: 4, status: 404 },
  ExpenseClaimTypeNotFound: { code: "ET-901", exit: 4, status: 404 },
  InterviewNotFound: { code: "IV-901", exit: 4, status: 404 },
  InterviewRoundNotFound: { code: "IR-901", exit: 4, status: 404 },
  KraNotFound: { code: "KR-901", exit: 4, status: 404 },
  LeaveTypeNotFound: { code: "LT-901", exit: 4, status: 404 },
  SalaryStructureNotFound: { code: "SS-901", exit: 4, status: 404 },
  NotAllowed: { code: "AR-001", exit: 3, status: 403 },
  IdempotencyConflict: { code: "AR-002", exit: 120, status: 409 },
} as const;
type Refusal = keyof typeof refusals;

ErrorNames.name(Account.ParentAccountNotInCompany, "ParentAccountNotInCompany");
export class ParentAccountNotInCompany extends Schema.TaggedError<ParentAccountNotInCompany>()("ParentAccountNotInCompany", { code: Schema.Literal(refusals.ParentAccountNotInCompany.code), ...wireStruct(Account.ParentAccountNotInCompany.fields).fields }, { httpApiStatus: refusals.ParentAccountNotInCompany.status }) { static readonly code = refusals.ParentAccountNotInCompany.code; }
ErrorNames.name(Account.ParentAccountIsLedger, "ParentAccountIsLedger");
export class ParentAccountIsLedger extends Schema.TaggedError<ParentAccountIsLedger>()("ParentAccountIsLedger", { code: Schema.Literal(refusals.ParentAccountIsLedger.code), ...wireStruct(Account.ParentAccountIsLedger.fields).fields }, { httpApiStatus: refusals.ParentAccountIsLedger.status }) { static readonly code = refusals.ParentAccountIsLedger.code; }
ErrorNames.name(Account.RootAccountIsLedger, "RootAccountIsLedger");
export class RootAccountIsLedger extends Schema.TaggedError<RootAccountIsLedger>()("RootAccountIsLedger", { code: Schema.Literal(refusals.RootAccountIsLedger.code), ...wireStruct(Account.RootAccountIsLedger.fields).fields }, { httpApiStatus: refusals.RootAccountIsLedger.status }) { static readonly code = refusals.RootAccountIsLedger.code; }
ErrorNames.name(Account.RootTypeMissing, "RootTypeMissing");
export class RootTypeMissing extends Schema.TaggedError<RootTypeMissing>()("RootTypeMissing", { code: Schema.Literal(refusals.RootTypeMissing.code), ...wireStruct(Account.RootTypeMissing.fields).fields }, { httpApiStatus: refusals.RootTypeMissing.status }) { static readonly code = refusals.RootTypeMissing.code; }
ErrorNames.name(Account.RootTypeNotParents, "RootTypeNotParents");
export class RootTypeNotParents extends Schema.TaggedError<RootTypeNotParents>()("RootTypeNotParents", { code: Schema.Literal(refusals.RootTypeNotParents.code), ...wireStruct(Account.RootTypeNotParents.fields).fields }, { httpApiStatus: refusals.RootTypeNotParents.status }) { static readonly code = refusals.RootTypeNotParents.code; }
ErrorNames.name(Account.AccountHasChildren, "AccountHasChildren");
export class AccountHasChildren extends Schema.TaggedError<AccountHasChildren>()("AccountHasChildren", { code: Schema.Literal(refusals.AccountHasChildren.code), ...wireStruct(Account.AccountHasChildren.fields).fields }, { httpApiStatus: refusals.AccountHasChildren.status }) { static readonly code = refusals.AccountHasChildren.code; }
ErrorNames.name(Account.AccountNameTaken, "AccountNameTaken");
export class AccountNameTaken extends Schema.TaggedError<AccountNameTaken>()("AccountNameTaken", { code: Schema.Literal(refusals.AccountNameTaken.code), ...wireStruct(Account.AccountNameTaken.fields).fields }, { httpApiStatus: refusals.AccountNameTaken.status }) { static readonly code = refusals.AccountNameTaken.code; }
ErrorNames.name(Appraisal.AppraisedEmployeeNotInCompany, "AppraisedEmployeeNotInCompany");
export class AppraisedEmployeeNotInCompany extends Schema.TaggedError<AppraisedEmployeeNotInCompany>()("AppraisedEmployeeNotInCompany", { code: Schema.Literal(refusals.AppraisedEmployeeNotInCompany.code), ...wireStruct(Appraisal.AppraisedEmployeeNotInCompany.fields).fields }, { httpApiStatus: refusals.AppraisedEmployeeNotInCompany.status }) { static readonly code = refusals.AppraisedEmployeeNotInCompany.code; }
ErrorNames.name(Appraisal.AppraisedEmployeeHasLeft, "AppraisedEmployeeHasLeft");
export class AppraisedEmployeeHasLeft extends Schema.TaggedError<AppraisedEmployeeHasLeft>()("AppraisedEmployeeHasLeft", { code: Schema.Literal(refusals.AppraisedEmployeeHasLeft.code), ...wireStruct(Appraisal.AppraisedEmployeeHasLeft.fields).fields }, { httpApiStatus: refusals.AppraisedEmployeeHasLeft.status }) { static readonly code = refusals.AppraisedEmployeeHasLeft.code; }
ErrorNames.name(Appraisal.AppraisalCycleCompleted, "AppraisalCycleCompleted");
export class AppraisalCycleCompleted extends Schema.TaggedError<AppraisalCycleCompleted>()("AppraisalCycleCompleted", { code: Schema.Literal(refusals.AppraisalCycleCompleted.code), ...wireStruct(Appraisal.AppraisalCycleCompleted.fields).fields }, { httpApiStatus: refusals.AppraisalCycleCompleted.status }) { static readonly code = refusals.AppraisalCycleCompleted.code; }
ErrorNames.name(Appraisal.AppraisalTemplateNotInCompany, "AppraisalTemplateNotInCompany");
export class AppraisalTemplateNotInCompany extends Schema.TaggedError<AppraisalTemplateNotInCompany>()("AppraisalTemplateNotInCompany", { code: Schema.Literal(refusals.AppraisalTemplateNotInCompany.code), ...wireStruct(Appraisal.AppraisalTemplateNotInCompany.fields).fields }, { httpApiStatus: refusals.AppraisalTemplateNotInCompany.status }) { static readonly code = refusals.AppraisalTemplateNotInCompany.code; }
ErrorNames.name(Appraisal.AppraisalAlreadyExists, "AppraisalAlreadyExists");
export class AppraisalAlreadyExists extends Schema.TaggedError<AppraisalAlreadyExists>()("AppraisalAlreadyExists", { code: Schema.Literal(refusals.AppraisalAlreadyExists.code), ...wireStruct(Appraisal.AppraisalAlreadyExists.fields).fields }, { httpApiStatus: refusals.AppraisalAlreadyExists.status }) { static readonly code = refusals.AppraisalAlreadyExists.code; }
ErrorNames.name(Appraisal.NotRatedManually, "NotRatedManually");
export class NotRatedManually extends Schema.TaggedError<NotRatedManually>()("NotRatedManually", { code: Schema.Literal(refusals.NotRatedManually.code), ...wireStruct(Appraisal.NotRatedManually.fields).fields }, { httpApiStatus: refusals.NotRatedManually.status }) { static readonly code = refusals.NotRatedManually.code; }
ErrorNames.name(Appraisal.ScoresDontMatchKras, "ScoresDontMatchKras");
export class ScoresDontMatchKras extends Schema.TaggedError<ScoresDontMatchKras>()("ScoresDontMatchKras", { code: Schema.Literal(refusals.ScoresDontMatchKras.code), ...wireStruct(Appraisal.ScoresDontMatchKras.fields).fields }, { httpApiStatus: refusals.ScoresDontMatchKras.status }) { static readonly code = refusals.ScoresDontMatchKras.code; }
ErrorNames.name(Appraisal.KraScoreOutOfRange, "KraScoreOutOfRange");
export class KraScoreOutOfRange extends Schema.TaggedError<KraScoreOutOfRange>()("KraScoreOutOfRange", { code: Schema.Literal(refusals.KraScoreOutOfRange.code), ...wireStruct(Appraisal.KraScoreOutOfRange.fields).fields }, { httpApiStatus: refusals.KraScoreOutOfRange.status }) { static readonly code = refusals.KraScoreOutOfRange.code; }
ErrorNames.name(Appraisal.SelfRatingsDontMatchCriteria, "SelfRatingsDontMatchCriteria");
export class SelfRatingsDontMatchCriteria extends Schema.TaggedError<SelfRatingsDontMatchCriteria>()("SelfRatingsDontMatchCriteria", { code: Schema.Literal(refusals.SelfRatingsDontMatchCriteria.code), ...wireStruct(Appraisal.SelfRatingsDontMatchCriteria.fields).fields }, { httpApiStatus: refusals.SelfRatingsDontMatchCriteria.status }) { static readonly code = refusals.SelfRatingsDontMatchCriteria.code; }
ErrorNames.name(Appraisal.SelfRatingOutOfRange, "SelfRatingOutOfRange");
export class SelfRatingOutOfRange extends Schema.TaggedError<SelfRatingOutOfRange>()("SelfRatingOutOfRange", { code: Schema.Literal(refusals.SelfRatingOutOfRange.code), ...wireStruct(Appraisal.SelfRatingOutOfRange.fields).fields }, { httpApiStatus: refusals.SelfRatingOutOfRange.status }) { static readonly code = refusals.SelfRatingOutOfRange.code; }
ErrorNames.name(AppraisalCycle.CycleEndsBeforeStart, "CycleEndsBeforeStart");
export class CycleEndsBeforeStart extends Schema.TaggedError<CycleEndsBeforeStart>()("CycleEndsBeforeStart", { code: Schema.Literal(refusals.CycleEndsBeforeStart.code), ...wireStruct(AppraisalCycle.CycleEndsBeforeStart.fields).fields }, { httpApiStatus: refusals.CycleEndsBeforeStart.status }) { static readonly code = refusals.CycleEndsBeforeStart.code; }
ErrorNames.name(AppraisalCycle.AppraiseeNotInCompany, "AppraiseeNotInCompany");
export class AppraiseeNotInCompany extends Schema.TaggedError<AppraiseeNotInCompany>()("AppraiseeNotInCompany", { code: Schema.Literal(refusals.AppraiseeNotInCompany.code), ...wireStruct(AppraisalCycle.AppraiseeNotInCompany.fields).fields }, { httpApiStatus: refusals.AppraiseeNotInCompany.status }) { static readonly code = refusals.AppraiseeNotInCompany.code; }
ErrorNames.name(AppraisalCycle.AppraiseeHasLeft, "AppraiseeHasLeft");
export class AppraiseeHasLeft extends Schema.TaggedError<AppraiseeHasLeft>()("AppraiseeHasLeft", { code: Schema.Literal(refusals.AppraiseeHasLeft.code), ...wireStruct(AppraisalCycle.AppraiseeHasLeft.fields).fields }, { httpApiStatus: refusals.AppraiseeHasLeft.status }) { static readonly code = refusals.AppraiseeHasLeft.code; }
ErrorNames.name(AppraisalCycle.AppraiseeTemplateNotInCompany, "AppraiseeTemplateNotInCompany");
export class AppraiseeTemplateNotInCompany extends Schema.TaggedError<AppraiseeTemplateNotInCompany>()("AppraiseeTemplateNotInCompany", { code: Schema.Literal(refusals.AppraiseeTemplateNotInCompany.code), ...wireStruct(AppraisalCycle.AppraiseeTemplateNotInCompany.fields).fields }, { httpApiStatus: refusals.AppraiseeTemplateNotInCompany.status }) { static readonly code = refusals.AppraiseeTemplateNotInCompany.code; }
ErrorNames.name(AppraisalCycle.AppraiseeListedTwice, "AppraiseeListedTwice");
export class AppraiseeListedTwice extends Schema.TaggedError<AppraiseeListedTwice>()("AppraiseeListedTwice", { code: Schema.Literal(refusals.AppraiseeListedTwice.code), ...wireStruct(AppraisalCycle.AppraiseeListedTwice.fields).fields }, { httpApiStatus: refusals.AppraiseeListedTwice.status }) { static readonly code = refusals.AppraiseeListedTwice.code; }
ErrorNames.name(AppraisalCycle.CycleWithoutAppraisees, "CycleWithoutAppraisees");
export class CycleWithoutAppraisees extends Schema.TaggedError<CycleWithoutAppraisees>()("CycleWithoutAppraisees", { code: Schema.Literal(refusals.CycleWithoutAppraisees.code), ...wireStruct(AppraisalCycle.CycleWithoutAppraisees.fields).fields }, { httpApiStatus: refusals.CycleWithoutAppraisees.status }) { static readonly code = refusals.CycleWithoutAppraisees.code; }
ErrorNames.name(AppraisalCycle.AppraisalsNotSubmitted, "AppraisalsNotSubmitted");
export class AppraisalsNotSubmitted extends Schema.TaggedError<AppraisalsNotSubmitted>()("AppraisalsNotSubmitted", { code: Schema.Literal(refusals.AppraisalsNotSubmitted.code), ...wireStruct(AppraisalCycle.AppraisalsNotSubmitted.fields).fields }, { httpApiStatus: refusals.AppraisalsNotSubmitted.status }) { static readonly code = refusals.AppraisalsNotSubmitted.code; }
ErrorNames.name(AppraisalCycle.CycleNameTaken, "CycleNameTaken");
export class CycleNameTaken extends Schema.TaggedError<CycleNameTaken>()("CycleNameTaken", { code: Schema.Literal(refusals.CycleNameTaken.code), ...wireStruct(AppraisalCycle.CycleNameTaken.fields).fields }, { httpApiStatus: refusals.CycleNameTaken.status }) { static readonly code = refusals.CycleNameTaken.code; }
ErrorNames.name(AppraisalTemplate.TemplateWithoutKras, "TemplateWithoutKras");
export class TemplateWithoutKras extends Schema.TaggedError<TemplateWithoutKras>()("TemplateWithoutKras", { code: Schema.Literal(refusals.TemplateWithoutKras.code), ...wireStruct(AppraisalTemplate.TemplateWithoutKras.fields).fields }, { httpApiStatus: refusals.TemplateWithoutKras.status }) { static readonly code = refusals.TemplateWithoutKras.code; }
ErrorNames.name(AppraisalTemplate.TemplateKraNotInCompany, "TemplateKraNotInCompany");
export class TemplateKraNotInCompany extends Schema.TaggedError<TemplateKraNotInCompany>()("TemplateKraNotInCompany", { code: Schema.Literal(refusals.TemplateKraNotInCompany.code), ...wireStruct(AppraisalTemplate.TemplateKraNotInCompany.fields).fields }, { httpApiStatus: refusals.TemplateKraNotInCompany.status }) { static readonly code = refusals.TemplateKraNotInCompany.code; }
ErrorNames.name(AppraisalTemplate.TemplateCriteriaNotInCompany, "TemplateCriteriaNotInCompany");
export class TemplateCriteriaNotInCompany extends Schema.TaggedError<TemplateCriteriaNotInCompany>()("TemplateCriteriaNotInCompany", { code: Schema.Literal(refusals.TemplateCriteriaNotInCompany.code), ...wireStruct(AppraisalTemplate.TemplateCriteriaNotInCompany.fields).fields }, { httpApiStatus: refusals.TemplateCriteriaNotInCompany.status }) { static readonly code = refusals.TemplateCriteriaNotInCompany.code; }
ErrorNames.name(AppraisalTemplate.TemplateLineRepeated, "TemplateLineRepeated");
export class TemplateLineRepeated extends Schema.TaggedError<TemplateLineRepeated>()("TemplateLineRepeated", { code: Schema.Literal(refusals.TemplateLineRepeated.code), ...wireStruct(AppraisalTemplate.TemplateLineRepeated.fields).fields }, { httpApiStatus: refusals.TemplateLineRepeated.status }) { static readonly code = refusals.TemplateLineRepeated.code; }
ErrorNames.name(AppraisalTemplate.TemplateWeightageOutOfRange, "TemplateWeightageOutOfRange");
export class TemplateWeightageOutOfRange extends Schema.TaggedError<TemplateWeightageOutOfRange>()("TemplateWeightageOutOfRange", { code: Schema.Literal(refusals.TemplateWeightageOutOfRange.code), ...wireStruct(AppraisalTemplate.TemplateWeightageOutOfRange.fields).fields }, { httpApiStatus: refusals.TemplateWeightageOutOfRange.status }) { static readonly code = refusals.TemplateWeightageOutOfRange.code; }
ErrorNames.name(AppraisalTemplate.KraWeightageNotHundred, "KraWeightageNotHundred");
export class KraWeightageNotHundred extends Schema.TaggedError<KraWeightageNotHundred>()("KraWeightageNotHundred", { code: Schema.Literal(refusals.KraWeightageNotHundred.code), ...wireStruct(AppraisalTemplate.KraWeightageNotHundred.fields).fields }, { httpApiStatus: refusals.KraWeightageNotHundred.status }) { static readonly code = refusals.KraWeightageNotHundred.code; }
ErrorNames.name(AppraisalTemplate.CriteriaWeightageNotHundred, "CriteriaWeightageNotHundred");
export class CriteriaWeightageNotHundred extends Schema.TaggedError<CriteriaWeightageNotHundred>()("CriteriaWeightageNotHundred", { code: Schema.Literal(refusals.CriteriaWeightageNotHundred.code), ...wireStruct(AppraisalTemplate.CriteriaWeightageNotHundred.fields).fields }, { httpApiStatus: refusals.CriteriaWeightageNotHundred.status }) { static readonly code = refusals.CriteriaWeightageNotHundred.code; }
ErrorNames.name(AppraisalTemplate.TemplateTitleTaken, "TemplateTitleTaken");
export class TemplateTitleTaken extends Schema.TaggedError<TemplateTitleTaken>()("TemplateTitleTaken", { code: Schema.Literal(refusals.TemplateTitleTaken.code), ...wireStruct(AppraisalTemplate.TemplateTitleTaken.fields).fields }, { httpApiStatus: refusals.TemplateTitleTaken.status }) { static readonly code = refusals.TemplateTitleTaken.code; }
ErrorNames.name(Attendance.AttendeeNotInCompany, "AttendeeNotInCompany");
export class AttendeeNotInCompany extends Schema.TaggedError<AttendeeNotInCompany>()("AttendeeNotInCompany", { code: Schema.Literal(refusals.AttendeeNotInCompany.code), ...wireStruct(Attendance.AttendeeNotInCompany.fields).fields }, { httpApiStatus: refusals.AttendeeNotInCompany.status }) { static readonly code = refusals.AttendeeNotInCompany.code; }
ErrorNames.name(Attendance.AttendeeHasLeft, "AttendeeHasLeft");
export class AttendeeHasLeft extends Schema.TaggedError<AttendeeHasLeft>()("AttendeeHasLeft", { code: Schema.Literal(refusals.AttendeeHasLeft.code), ...wireStruct(Attendance.AttendeeHasLeft.fields).fields }, { httpApiStatus: refusals.AttendeeHasLeft.status }) { static readonly code = refusals.AttendeeHasLeft.code; }
ErrorNames.name(Attendance.AttendanceBeforeJoining, "AttendanceBeforeJoining");
export class AttendanceBeforeJoining extends Schema.TaggedError<AttendanceBeforeJoining>()("AttendanceBeforeJoining", { code: Schema.Literal(refusals.AttendanceBeforeJoining.code), ...wireStruct(Attendance.AttendanceBeforeJoining.fields).fields }, { httpApiStatus: refusals.AttendanceBeforeJoining.status }) { static readonly code = refusals.AttendanceBeforeJoining.code; }
ErrorNames.name(Attendance.AttendanceAlreadyMarked, "AttendanceAlreadyMarked");
export class AttendanceAlreadyMarked extends Schema.TaggedError<AttendanceAlreadyMarked>()("AttendanceAlreadyMarked", { code: Schema.Literal(refusals.AttendanceAlreadyMarked.code), ...wireStruct(Attendance.AttendanceAlreadyMarked.fields).fields }, { httpApiStatus: refusals.AttendanceAlreadyMarked.status }) { static readonly code = refusals.AttendanceAlreadyMarked.code; }
ErrorNames.name(Attendance.AttendanceOnLeave, "AttendanceOnLeave");
export class AttendanceOnLeave extends Schema.TaggedError<AttendanceOnLeave>()("AttendanceOnLeave", { code: Schema.Literal(refusals.AttendanceOnLeave.code), ...wireStruct(Attendance.AttendanceOnLeave.fields).fields }, { httpApiStatus: refusals.AttendanceOnLeave.status }) { static readonly code = refusals.AttendanceOnLeave.code; }
ErrorNames.name(AttendanceRequest.RequesterNotInCompany, "RequesterNotInCompany");
export class RequesterNotInCompany extends Schema.TaggedError<RequesterNotInCompany>()("RequesterNotInCompany", { code: Schema.Literal(refusals.RequesterNotInCompany.code), ...wireStruct(AttendanceRequest.RequesterNotInCompany.fields).fields }, { httpApiStatus: refusals.RequesterNotInCompany.status }) { static readonly code = refusals.RequesterNotInCompany.code; }
ErrorNames.name(AttendanceRequest.RequesterHasLeft, "RequesterHasLeft");
export class RequesterHasLeft extends Schema.TaggedError<RequesterHasLeft>()("RequesterHasLeft", { code: Schema.Literal(refusals.RequesterHasLeft.code), ...wireStruct(AttendanceRequest.RequesterHasLeft.fields).fields }, { httpApiStatus: refusals.RequesterHasLeft.status }) { static readonly code = refusals.RequesterHasLeft.code; }
ErrorNames.name(AttendanceRequest.RequestEndsBeforeStart, "RequestEndsBeforeStart");
export class RequestEndsBeforeStart extends Schema.TaggedError<RequestEndsBeforeStart>()("RequestEndsBeforeStart", { code: Schema.Literal(refusals.RequestEndsBeforeStart.code), ...wireStruct(AttendanceRequest.RequestEndsBeforeStart.fields).fields }, { httpApiStatus: refusals.RequestEndsBeforeStart.status }) { static readonly code = refusals.RequestEndsBeforeStart.code; }
ErrorNames.name(AttendanceRequest.RequestBeforeJoining, "RequestBeforeJoining");
export class RequestBeforeJoining extends Schema.TaggedError<RequestBeforeJoining>()("RequestBeforeJoining", { code: Schema.Literal(refusals.RequestBeforeJoining.code), ...wireStruct(AttendanceRequest.RequestBeforeJoining.fields).fields }, { httpApiStatus: refusals.RequestBeforeJoining.status }) { static readonly code = refusals.RequestBeforeJoining.code; }
ErrorNames.name(AttendanceRequest.AttendanceRequestOverlaps, "AttendanceRequestOverlaps");
export class AttendanceRequestOverlaps extends Schema.TaggedError<AttendanceRequestOverlaps>()("AttendanceRequestOverlaps", { code: Schema.Literal(refusals.AttendanceRequestOverlaps.code), ...wireStruct(AttendanceRequest.AttendanceRequestOverlaps.fields).fields }, { httpApiStatus: refusals.AttendanceRequestOverlaps.status }) { static readonly code = refusals.AttendanceRequestOverlaps.code; }
ErrorNames.name(BankAccount.KybNotApproved, "KybNotApproved");
export class KybNotApproved extends Schema.TaggedError<KybNotApproved>()("KybNotApproved", { code: Schema.Literal(refusals.KybNotApproved.code), ...wireStruct(BankAccount.KybNotApproved.fields).fields }, { httpApiStatus: refusals.KybNotApproved.status }) { static readonly code = refusals.KybNotApproved.code; }
ErrorNames.name(BankAccount.BankAccountNameTaken, "BankAccountNameTaken");
export class BankAccountNameTaken extends Schema.TaggedError<BankAccountNameTaken>()("BankAccountNameTaken", { code: Schema.Literal(refusals.BankAccountNameTaken.code), ...wireStruct(BankAccount.BankAccountNameTaken.fields).fields }, { httpApiStatus: refusals.BankAccountNameTaken.status }) { static readonly code = refusals.BankAccountNameTaken.code; }
ErrorNames.name(BankTransaction.AccountClosed, "AccountClosed");
export class AccountClosed extends Schema.TaggedError<AccountClosed>()("AccountClosed", { code: Schema.Literal(refusals.AccountClosed.code), ...wireStruct(BankTransaction.AccountClosed.fields).fields }, { httpApiStatus: refusals.AccountClosed.status }) { static readonly code = refusals.AccountClosed.code; }
ErrorNames.name(BankTransaction.CurrencyNotHeld, "CurrencyNotHeld");
export class CurrencyNotHeld extends Schema.TaggedError<CurrencyNotHeld>()("CurrencyNotHeld", { code: Schema.Literal(refusals.CurrencyNotHeld.code), ...wireStruct(BankTransaction.CurrencyNotHeld.fields).fields }, { httpApiStatus: refusals.CurrencyNotHeld.status }) { static readonly code = refusals.CurrencyNotHeld.code; }
ErrorNames.name(BankTransaction.NothingToSend, "NothingToSend");
export class NothingToSend extends Schema.TaggedError<NothingToSend>()("NothingToSend", { code: Schema.Literal(refusals.NothingToSend.code), ...wireStruct(BankTransaction.NothingToSend.fields).fields }, { httpApiStatus: refusals.NothingToSend.status }) { static readonly code = refusals.NothingToSend.code; }
ErrorNames.name(BankTransaction.AlreadyRecorded, "AlreadyRecorded");
export class AlreadyRecorded extends Schema.TaggedError<AlreadyRecorded>()("AlreadyRecorded", { code: Schema.Literal(refusals.AlreadyRecorded.code), ...wireStruct(BankTransaction.AlreadyRecorded.fields).fields }, { httpApiStatus: refusals.AlreadyRecorded.status }) { static readonly code = refusals.AlreadyRecorded.code; }
ErrorNames.name(Branch.BranchNameTaken, "BranchNameTaken");
export class BranchNameTaken extends Schema.TaggedError<BranchNameTaken>()("BranchNameTaken", { code: Schema.Literal(refusals.BranchNameTaken.code), ...wireStruct(Branch.BranchNameTaken.fields).fields }, { httpApiStatus: refusals.BranchNameTaken.status }) { static readonly code = refusals.BranchNameTaken.code; }
ErrorNames.name(BridgeBusiness.KybAlreadyStarted, "KybAlreadyStarted");
export class KybAlreadyStarted extends Schema.TaggedError<KybAlreadyStarted>()("KybAlreadyStarted", { code: Schema.Literal(refusals.KybAlreadyStarted.code), ...wireStruct(BridgeBusiness.KybAlreadyStarted.fields).fields }, { httpApiStatus: refusals.KybAlreadyStarted.status }) { static readonly code = refusals.KybAlreadyStarted.code; }
ErrorNames.name(BridgeIndividual.KycAlreadyStarted, "KycAlreadyStarted");
export class KycAlreadyStarted extends Schema.TaggedError<KycAlreadyStarted>()("KycAlreadyStarted", { code: Schema.Literal(refusals.KycAlreadyStarted.code), ...wireStruct(BridgeIndividual.KycAlreadyStarted.fields).fields }, { httpApiStatus: refusals.KycAlreadyStarted.status }) { static readonly code = refusals.KycAlreadyStarted.code; }
ErrorNames.name(Company.CompanyNameTaken, "CompanyNameTaken");
export class CompanyNameTaken extends Schema.TaggedError<CompanyNameTaken>()("CompanyNameTaken", { code: Schema.Literal(refusals.CompanyNameTaken.code), ...wireStruct(Company.CompanyNameTaken.fields).fields }, { httpApiStatus: refusals.CompanyNameTaken.status }) { static readonly code = refusals.CompanyNameTaken.code; }
ErrorNames.name(Company.CompanyAbbrTaken, "CompanyAbbrTaken");
export class CompanyAbbrTaken extends Schema.TaggedError<CompanyAbbrTaken>()("CompanyAbbrTaken", { code: Schema.Literal(refusals.CompanyAbbrTaken.code), ...wireStruct(Company.CompanyAbbrTaken.fields).fields }, { httpApiStatus: refusals.CompanyAbbrTaken.status }) { static readonly code = refusals.CompanyAbbrTaken.code; }
ErrorNames.name(CostCenter.ParentCostCenterNotInCompany, "ParentCostCenterNotInCompany");
export class ParentCostCenterNotInCompany extends Schema.TaggedError<ParentCostCenterNotInCompany>()("ParentCostCenterNotInCompany", { code: Schema.Literal(refusals.ParentCostCenterNotInCompany.code), ...wireStruct(CostCenter.ParentCostCenterNotInCompany.fields).fields }, { httpApiStatus: refusals.ParentCostCenterNotInCompany.status }) { static readonly code = refusals.ParentCostCenterNotInCompany.code; }
ErrorNames.name(CostCenter.ParentCostCenterIsLedger, "ParentCostCenterIsLedger");
export class ParentCostCenterIsLedger extends Schema.TaggedError<ParentCostCenterIsLedger>()("ParentCostCenterIsLedger", { code: Schema.Literal(refusals.ParentCostCenterIsLedger.code), ...wireStruct(CostCenter.ParentCostCenterIsLedger.fields).fields }, { httpApiStatus: refusals.ParentCostCenterIsLedger.status }) { static readonly code = refusals.ParentCostCenterIsLedger.code; }
ErrorNames.name(CostCenter.RootCostCenterIsLedger, "RootCostCenterIsLedger");
export class RootCostCenterIsLedger extends Schema.TaggedError<RootCostCenterIsLedger>()("RootCostCenterIsLedger", { code: Schema.Literal(refusals.RootCostCenterIsLedger.code), ...wireStruct(CostCenter.RootCostCenterIsLedger.fields).fields }, { httpApiStatus: refusals.RootCostCenterIsLedger.status }) { static readonly code = refusals.RootCostCenterIsLedger.code; }
ErrorNames.name(CostCenter.CostCenterNameTaken, "CostCenterNameTaken");
export class CostCenterNameTaken extends Schema.TaggedError<CostCenterNameTaken>()("CostCenterNameTaken", { code: Schema.Literal(refusals.CostCenterNameTaken.code), ...wireStruct(CostCenter.CostCenterNameTaken.fields).fields }, { httpApiStatus: refusals.CostCenterNameTaken.status }) { static readonly code = refusals.CostCenterNameTaken.code; }
ErrorNames.name(Department.DepartmentNameTaken, "DepartmentNameTaken");
export class DepartmentNameTaken extends Schema.TaggedError<DepartmentNameTaken>()("DepartmentNameTaken", { code: Schema.Literal(refusals.DepartmentNameTaken.code), ...wireStruct(Department.DepartmentNameTaken.fields).fields }, { httpApiStatus: refusals.DepartmentNameTaken.status }) { static readonly code = refusals.DepartmentNameTaken.code; }
ErrorNames.name(Designation.DesignationNameTaken, "DesignationNameTaken");
export class DesignationNameTaken extends Schema.TaggedError<DesignationNameTaken>()("DesignationNameTaken", { code: Schema.Literal(refusals.DesignationNameTaken.code), ...wireStruct(Designation.DesignationNameTaken.fields).fields }, { httpApiStatus: refusals.DesignationNameTaken.status }) { static readonly code = refusals.DesignationNameTaken.code; }
ErrorNames.name(Employee.EmployeeAlreadyHired, "EmployeeAlreadyHired");
export class EmployeeAlreadyHired extends Schema.TaggedError<EmployeeAlreadyHired>()("EmployeeAlreadyHired", { code: Schema.Literal(refusals.EmployeeAlreadyHired.code), ...wireStruct(Employee.EmployeeAlreadyHired.fields).fields }, { httpApiStatus: refusals.EmployeeAlreadyHired.status }) { static readonly code = refusals.EmployeeAlreadyHired.code; }
ErrorNames.name(Employee.DepartmentNotInCompany, "DepartmentNotInCompany");
export class DepartmentNotInCompany extends Schema.TaggedError<DepartmentNotInCompany>()("DepartmentNotInCompany", { code: Schema.Literal(refusals.DepartmentNotInCompany.code), ...wireStruct(Employee.DepartmentNotInCompany.fields).fields }, { httpApiStatus: refusals.DepartmentNotInCompany.status }) { static readonly code = refusals.DepartmentNotInCompany.code; }
ErrorNames.name(Employee.DesignationNotInCompany, "DesignationNotInCompany");
export class DesignationNotInCompany extends Schema.TaggedError<DesignationNotInCompany>()("DesignationNotInCompany", { code: Schema.Literal(refusals.DesignationNotInCompany.code), ...wireStruct(Employee.DesignationNotInCompany.fields).fields }, { httpApiStatus: refusals.DesignationNotInCompany.status }) { static readonly code = refusals.DesignationNotInCompany.code; }
ErrorNames.name(Employee.JoinedBeforeBorn, "JoinedBeforeBorn");
export class JoinedBeforeBorn extends Schema.TaggedError<JoinedBeforeBorn>()("JoinedBeforeBorn", { code: Schema.Literal(refusals.JoinedBeforeBorn.code), ...wireStruct(Employee.JoinedBeforeBorn.fields).fields }, { httpApiStatus: refusals.JoinedBeforeBorn.status }) { static readonly code = refusals.JoinedBeforeBorn.code; }
ErrorNames.name(Employee.RelievedBeforeJoined, "RelievedBeforeJoined");
export class RelievedBeforeJoined extends Schema.TaggedError<RelievedBeforeJoined>()("RelievedBeforeJoined", { code: Schema.Literal(refusals.RelievedBeforeJoined.code), ...wireStruct(Employee.RelievedBeforeJoined.fields).fields }, { httpApiStatus: refusals.RelievedBeforeJoined.status }) { static readonly code = refusals.RelievedBeforeJoined.code; }
ErrorNames.name(EmployeeFeedbackCriteria.CriteriaNameTaken, "CriteriaNameTaken");
export class CriteriaNameTaken extends Schema.TaggedError<CriteriaNameTaken>()("CriteriaNameTaken", { code: Schema.Literal(refusals.CriteriaNameTaken.code), ...wireStruct(EmployeeFeedbackCriteria.CriteriaNameTaken.fields).fields }, { httpApiStatus: refusals.CriteriaNameTaken.status }) { static readonly code = refusals.CriteriaNameTaken.code; }
ErrorNames.name(EmployeeGrade.EmployeeGradeNameTaken, "EmployeeGradeNameTaken");
export class EmployeeGradeNameTaken extends Schema.TaggedError<EmployeeGradeNameTaken>()("EmployeeGradeNameTaken", { code: Schema.Literal(refusals.EmployeeGradeNameTaken.code), ...wireStruct(EmployeeGrade.EmployeeGradeNameTaken.fields).fields }, { httpApiStatus: refusals.EmployeeGradeNameTaken.status }) { static readonly code = refusals.EmployeeGradeNameTaken.code; }
ErrorNames.name(EmployeePerformanceFeedback.FeedbackCycleCompleted, "FeedbackCycleCompleted");
export class FeedbackCycleCompleted extends Schema.TaggedError<FeedbackCycleCompleted>()("FeedbackCycleCompleted", { code: Schema.Literal(refusals.FeedbackCycleCompleted.code), ...wireStruct(EmployeePerformanceFeedback.FeedbackCycleCompleted.fields).fields }, { httpApiStatus: refusals.FeedbackCycleCompleted.status }) { static readonly code = refusals.FeedbackCycleCompleted.code; }
ErrorNames.name(EmployeePerformanceFeedback.FeedbackForOneself, "FeedbackForOneself");
export class FeedbackForOneself extends Schema.TaggedError<FeedbackForOneself>()("FeedbackForOneself", { code: Schema.Literal(refusals.FeedbackForOneself.code), ...wireStruct(EmployeePerformanceFeedback.FeedbackForOneself.fields).fields }, { httpApiStatus: refusals.FeedbackForOneself.status }) { static readonly code = refusals.FeedbackForOneself.code; }
ErrorNames.name(EmployeePerformanceFeedback.ReviewerNotInCompany, "ReviewerNotInCompany");
export class ReviewerNotInCompany extends Schema.TaggedError<ReviewerNotInCompany>()("ReviewerNotInCompany", { code: Schema.Literal(refusals.ReviewerNotInCompany.code), ...wireStruct(EmployeePerformanceFeedback.ReviewerNotInCompany.fields).fields }, { httpApiStatus: refusals.ReviewerNotInCompany.status }) { static readonly code = refusals.ReviewerNotInCompany.code; }
ErrorNames.name(EmployeePerformanceFeedback.ReviewerHasLeft, "ReviewerHasLeft");
export class ReviewerHasLeft extends Schema.TaggedError<ReviewerHasLeft>()("ReviewerHasLeft", { code: Schema.Literal(refusals.ReviewerHasLeft.code), ...wireStruct(EmployeePerformanceFeedback.ReviewerHasLeft.fields).fields }, { httpApiStatus: refusals.ReviewerHasLeft.status }) { static readonly code = refusals.ReviewerHasLeft.code; }
ErrorNames.name(EmployeePerformanceFeedback.FeedbackRatingsDontMatchCriteria, "FeedbackRatingsDontMatchCriteria");
export class FeedbackRatingsDontMatchCriteria extends Schema.TaggedError<FeedbackRatingsDontMatchCriteria>()("FeedbackRatingsDontMatchCriteria", { code: Schema.Literal(refusals.FeedbackRatingsDontMatchCriteria.code), ...wireStruct(EmployeePerformanceFeedback.FeedbackRatingsDontMatchCriteria.fields).fields }, { httpApiStatus: refusals.FeedbackRatingsDontMatchCriteria.status }) { static readonly code = refusals.FeedbackRatingsDontMatchCriteria.code; }
ErrorNames.name(EmployeePerformanceFeedback.FeedbackRatingOutOfRange, "FeedbackRatingOutOfRange");
export class FeedbackRatingOutOfRange extends Schema.TaggedError<FeedbackRatingOutOfRange>()("FeedbackRatingOutOfRange", { code: Schema.Literal(refusals.FeedbackRatingOutOfRange.code), ...wireStruct(EmployeePerformanceFeedback.FeedbackRatingOutOfRange.fields).fields }, { httpApiStatus: refusals.FeedbackRatingOutOfRange.status }) { static readonly code = refusals.FeedbackRatingOutOfRange.code; }
ErrorNames.name(EmployeePromotion.PromotedEmployeeNotInCompany, "PromotedEmployeeNotInCompany");
export class PromotedEmployeeNotInCompany extends Schema.TaggedError<PromotedEmployeeNotInCompany>()("PromotedEmployeeNotInCompany", { code: Schema.Literal(refusals.PromotedEmployeeNotInCompany.code), ...wireStruct(EmployeePromotion.PromotedEmployeeNotInCompany.fields).fields }, { httpApiStatus: refusals.PromotedEmployeeNotInCompany.status }) { static readonly code = refusals.PromotedEmployeeNotInCompany.code; }
ErrorNames.name(EmployeePromotion.PromotedEmployeeHasLeft, "PromotedEmployeeHasLeft");
export class PromotedEmployeeHasLeft extends Schema.TaggedError<PromotedEmployeeHasLeft>()("PromotedEmployeeHasLeft", { code: Schema.Literal(refusals.PromotedEmployeeHasLeft.code), ...wireStruct(EmployeePromotion.PromotedEmployeeHasLeft.fields).fields }, { httpApiStatus: refusals.PromotedEmployeeHasLeft.status }) { static readonly code = refusals.PromotedEmployeeHasLeft.code; }
ErrorNames.name(EmployeePromotion.NewDesignationNotInCompany, "NewDesignationNotInCompany");
export class NewDesignationNotInCompany extends Schema.TaggedError<NewDesignationNotInCompany>()("NewDesignationNotInCompany", { code: Schema.Literal(refusals.NewDesignationNotInCompany.code), ...wireStruct(EmployeePromotion.NewDesignationNotInCompany.fields).fields }, { httpApiStatus: refusals.NewDesignationNotInCompany.status }) { static readonly code = refusals.NewDesignationNotInCompany.code; }
ErrorNames.name(EmployeePromotion.DesignationUnchanged, "DesignationUnchanged");
export class DesignationUnchanged extends Schema.TaggedError<DesignationUnchanged>()("DesignationUnchanged", { code: Schema.Literal(refusals.DesignationUnchanged.code), ...wireStruct(EmployeePromotion.DesignationUnchanged.fields).fields }, { httpApiStatus: refusals.DesignationUnchanged.status }) { static readonly code = refusals.DesignationUnchanged.code; }
ErrorNames.name(EmployeePromotion.PromotionNotYetDue, "PromotionNotYetDue");
export class PromotionNotYetDue extends Schema.TaggedError<PromotionNotYetDue>()("PromotionNotYetDue", { code: Schema.Literal(refusals.PromotionNotYetDue.code), ...wireStruct(EmployeePromotion.PromotionNotYetDue.fields).fields }, { httpApiStatus: refusals.PromotionNotYetDue.status }) { static readonly code = refusals.PromotionNotYetDue.code; }
ErrorNames.name(EmployeeSeparation.SeparatedEmployeeNotInCompany, "SeparatedEmployeeNotInCompany");
export class SeparatedEmployeeNotInCompany extends Schema.TaggedError<SeparatedEmployeeNotInCompany>()("SeparatedEmployeeNotInCompany", { code: Schema.Literal(refusals.SeparatedEmployeeNotInCompany.code), ...wireStruct(EmployeeSeparation.SeparatedEmployeeNotInCompany.fields).fields }, { httpApiStatus: refusals.SeparatedEmployeeNotInCompany.status }) { static readonly code = refusals.SeparatedEmployeeNotInCompany.code; }
ErrorNames.name(EmployeeSeparation.SeparationAlreadyOpen, "SeparationAlreadyOpen");
export class SeparationAlreadyOpen extends Schema.TaggedError<SeparationAlreadyOpen>()("SeparationAlreadyOpen", { code: Schema.Literal(refusals.SeparationAlreadyOpen.code), ...wireStruct(EmployeeSeparation.SeparationAlreadyOpen.fields).fields }, { httpApiStatus: refusals.SeparationAlreadyOpen.status }) { static readonly code = refusals.SeparationAlreadyOpen.code; }
ErrorNames.name(EmployeeTransfer.TransferredEmployeeNotInCompany, "TransferredEmployeeNotInCompany");
export class TransferredEmployeeNotInCompany extends Schema.TaggedError<TransferredEmployeeNotInCompany>()("TransferredEmployeeNotInCompany", { code: Schema.Literal(refusals.TransferredEmployeeNotInCompany.code), ...wireStruct(EmployeeTransfer.TransferredEmployeeNotInCompany.fields).fields }, { httpApiStatus: refusals.TransferredEmployeeNotInCompany.status }) { static readonly code = refusals.TransferredEmployeeNotInCompany.code; }
ErrorNames.name(EmployeeTransfer.TransferredEmployeeHasLeft, "TransferredEmployeeHasLeft");
export class TransferredEmployeeHasLeft extends Schema.TaggedError<TransferredEmployeeHasLeft>()("TransferredEmployeeHasLeft", { code: Schema.Literal(refusals.TransferredEmployeeHasLeft.code), ...wireStruct(EmployeeTransfer.TransferredEmployeeHasLeft.fields).fields }, { httpApiStatus: refusals.TransferredEmployeeHasLeft.status }) { static readonly code = refusals.TransferredEmployeeHasLeft.code; }
ErrorNames.name(EmployeeTransfer.NewDepartmentNotInCompany, "NewDepartmentNotInCompany");
export class NewDepartmentNotInCompany extends Schema.TaggedError<NewDepartmentNotInCompany>()("NewDepartmentNotInCompany", { code: Schema.Literal(refusals.NewDepartmentNotInCompany.code), ...wireStruct(EmployeeTransfer.NewDepartmentNotInCompany.fields).fields }, { httpApiStatus: refusals.NewDepartmentNotInCompany.status }) { static readonly code = refusals.NewDepartmentNotInCompany.code; }
ErrorNames.name(EmployeeTransfer.DepartmentUnchanged, "DepartmentUnchanged");
export class DepartmentUnchanged extends Schema.TaggedError<DepartmentUnchanged>()("DepartmentUnchanged", { code: Schema.Literal(refusals.DepartmentUnchanged.code), ...wireStruct(EmployeeTransfer.DepartmentUnchanged.fields).fields }, { httpApiStatus: refusals.DepartmentUnchanged.status }) { static readonly code = refusals.DepartmentUnchanged.code; }
ErrorNames.name(EmployeeTransfer.TransferNotYetDue, "TransferNotYetDue");
export class TransferNotYetDue extends Schema.TaggedError<TransferNotYetDue>()("TransferNotYetDue", { code: Schema.Literal(refusals.TransferNotYetDue.code), ...wireStruct(EmployeeTransfer.TransferNotYetDue.fields).fields }, { httpApiStatus: refusals.TransferNotYetDue.status }) { static readonly code = refusals.TransferNotYetDue.code; }
ErrorNames.name(EmploymentType.EmploymentTypeNameTaken, "EmploymentTypeNameTaken");
export class EmploymentTypeNameTaken extends Schema.TaggedError<EmploymentTypeNameTaken>()("EmploymentTypeNameTaken", { code: Schema.Literal(refusals.EmploymentTypeNameTaken.code), ...wireStruct(EmploymentType.EmploymentTypeNameTaken.fields).fields }, { httpApiStatus: refusals.EmploymentTypeNameTaken.status }) { static readonly code = refusals.EmploymentTypeNameTaken.code; }
ErrorNames.name(Expense.SanctionedOverClaimed, "SanctionedOverClaimed");
export class SanctionedOverClaimed extends Schema.TaggedError<SanctionedOverClaimed>()("SanctionedOverClaimed", { code: Schema.Literal(refusals.SanctionedOverClaimed.code), ...wireStruct(Expense.SanctionedOverClaimed.fields).fields }, { httpApiStatus: refusals.SanctionedOverClaimed.status }) { static readonly code = refusals.SanctionedOverClaimed.code; }
ErrorNames.name(Expense.ExpenseTypeNotInCompany, "ExpenseTypeNotInCompany");
export class ExpenseTypeNotInCompany extends Schema.TaggedError<ExpenseTypeNotInCompany>()("ExpenseTypeNotInCompany", { code: Schema.Literal(refusals.ExpenseTypeNotInCompany.code), ...wireStruct(Expense.ExpenseTypeNotInCompany.fields).fields }, { httpApiStatus: refusals.ExpenseTypeNotInCompany.status }) { static readonly code = refusals.ExpenseTypeNotInCompany.code; }
ErrorNames.name(Expense.ClaimNotDraft, "ClaimNotDraft");
export class ClaimNotDraft extends Schema.TaggedError<ClaimNotDraft>()("ClaimNotDraft", { code: Schema.Literal(refusals.ClaimNotDraft.code), ...wireStruct(Expense.ClaimNotDraft.fields).fields }, { httpApiStatus: refusals.ClaimNotDraft.status }) { static readonly code = refusals.ClaimNotDraft.code; }
ErrorNames.name(ExpenseClaim.ClaimantNotActive, "ClaimantNotActive");
export class ClaimantNotActive extends Schema.TaggedError<ClaimantNotActive>()("ClaimantNotActive", { code: Schema.Literal(refusals.ClaimantNotActive.code), ...wireStruct(ExpenseClaim.ClaimantNotActive.fields).fields }, { httpApiStatus: refusals.ClaimantNotActive.status }) { static readonly code = refusals.ClaimantNotActive.code; }
ErrorNames.name(ExpenseClaim.EmployeeNotInCompany, "EmployeeNotInCompany");
export class EmployeeNotInCompany extends Schema.TaggedError<EmployeeNotInCompany>()("EmployeeNotInCompany", { code: Schema.Literal(refusals.EmployeeNotInCompany.code), ...wireStruct(ExpenseClaim.EmployeeNotInCompany.fields).fields }, { httpApiStatus: refusals.EmployeeNotInCompany.status }) { static readonly code = refusals.EmployeeNotInCompany.code; }
ErrorNames.name(ExpenseClaim.ClaimHasNoExpenses, "ClaimHasNoExpenses");
export class ClaimHasNoExpenses extends Schema.TaggedError<ClaimHasNoExpenses>()("ClaimHasNoExpenses", { code: Schema.Literal(refusals.ClaimHasNoExpenses.code), ...wireStruct(ExpenseClaim.ClaimHasNoExpenses.fields).fields }, { httpApiStatus: refusals.ClaimHasNoExpenses.status }) { static readonly code = refusals.ClaimHasNoExpenses.code; }
ErrorNames.name(ExpenseClaimType.ExpenseTypeTaken, "ExpenseTypeTaken");
export class ExpenseTypeTaken extends Schema.TaggedError<ExpenseTypeTaken>()("ExpenseTypeTaken", { code: Schema.Literal(refusals.ExpenseTypeTaken.code), ...wireStruct(ExpenseClaimType.ExpenseTypeTaken.fields).fields }, { httpApiStatus: refusals.ExpenseTypeTaken.status }) { static readonly code = refusals.ExpenseTypeTaken.code; }
ErrorNames.name(FiscalYear.FiscalYearEndsBeforeStart, "FiscalYearEndsBeforeStart");
export class FiscalYearEndsBeforeStart extends Schema.TaggedError<FiscalYearEndsBeforeStart>()("FiscalYearEndsBeforeStart", { code: Schema.Literal(refusals.FiscalYearEndsBeforeStart.code), ...wireStruct(FiscalYear.FiscalYearEndsBeforeStart.fields).fields }, { httpApiStatus: refusals.FiscalYearEndsBeforeStart.status }) { static readonly code = refusals.FiscalYearEndsBeforeStart.code; }
ErrorNames.name(FiscalYear.FiscalYearWrongLength, "FiscalYearWrongLength");
export class FiscalYearWrongLength extends Schema.TaggedError<FiscalYearWrongLength>()("FiscalYearWrongLength", { code: Schema.Literal(refusals.FiscalYearWrongLength.code), ...wireStruct(FiscalYear.FiscalYearWrongLength.fields).fields }, { httpApiStatus: refusals.FiscalYearWrongLength.status }) { static readonly code = refusals.FiscalYearWrongLength.code; }
ErrorNames.name(FiscalYear.FiscalYearOverlaps, "FiscalYearOverlaps");
export class FiscalYearOverlaps extends Schema.TaggedError<FiscalYearOverlaps>()("FiscalYearOverlaps", { code: Schema.Literal(refusals.FiscalYearOverlaps.code), ...wireStruct(FiscalYear.FiscalYearOverlaps.fields).fields }, { httpApiStatus: refusals.FiscalYearOverlaps.status }) { static readonly code = refusals.FiscalYearOverlaps.code; }
ErrorNames.name(FiscalYear.FiscalYearNameTaken, "FiscalYearNameTaken");
export class FiscalYearNameTaken extends Schema.TaggedError<FiscalYearNameTaken>()("FiscalYearNameTaken", { code: Schema.Literal(refusals.FiscalYearNameTaken.code), ...wireStruct(FiscalYear.FiscalYearNameTaken.fields).fields }, { httpApiStatus: refusals.FiscalYearNameTaken.status }) { static readonly code = refusals.FiscalYearNameTaken.code; }
ErrorNames.name(Goal.GoalCycleCompleted, "GoalCycleCompleted");
export class GoalCycleCompleted extends Schema.TaggedError<GoalCycleCompleted>()("GoalCycleCompleted", { code: Schema.Literal(refusals.GoalCycleCompleted.code), ...wireStruct(Goal.GoalCycleCompleted.fields).fields }, { httpApiStatus: refusals.GoalCycleCompleted.status }) { static readonly code = refusals.GoalCycleCompleted.code; }
ErrorNames.name(Goal.GoalEmployeeNotInCompany, "GoalEmployeeNotInCompany");
export class GoalEmployeeNotInCompany extends Schema.TaggedError<GoalEmployeeNotInCompany>()("GoalEmployeeNotInCompany", { code: Schema.Literal(refusals.GoalEmployeeNotInCompany.code), ...wireStruct(Goal.GoalEmployeeNotInCompany.fields).fields }, { httpApiStatus: refusals.GoalEmployeeNotInCompany.status }) { static readonly code = refusals.GoalEmployeeNotInCompany.code; }
ErrorNames.name(Goal.GoalOwnerHasLeft, "GoalOwnerHasLeft");
export class GoalOwnerHasLeft extends Schema.TaggedError<GoalOwnerHasLeft>()("GoalOwnerHasLeft", { code: Schema.Literal(refusals.GoalOwnerHasLeft.code), ...wireStruct(Goal.GoalOwnerHasLeft.fields).fields }, { httpApiStatus: refusals.GoalOwnerHasLeft.status }) { static readonly code = refusals.GoalOwnerHasLeft.code; }
ErrorNames.name(Goal.GoalKraNotInAppraisal, "GoalKraNotInAppraisal");
export class GoalKraNotInAppraisal extends Schema.TaggedError<GoalKraNotInAppraisal>()("GoalKraNotInAppraisal", { code: Schema.Literal(refusals.GoalKraNotInAppraisal.code), ...wireStruct(Goal.GoalKraNotInAppraisal.fields).fields }, { httpApiStatus: refusals.GoalKraNotInAppraisal.status }) { static readonly code = refusals.GoalKraNotInAppraisal.code; }
ErrorNames.name(Goal.ParentGoalMismatch, "ParentGoalMismatch");
export class ParentGoalMismatch extends Schema.TaggedError<ParentGoalMismatch>()("ParentGoalMismatch", { code: Schema.Literal(refusals.ParentGoalMismatch.code), ...wireStruct(Goal.ParentGoalMismatch.fields).fields }, { httpApiStatus: refusals.ParentGoalMismatch.status }) { static readonly code = refusals.ParentGoalMismatch.code; }
ErrorNames.name(Goal.ProgressOutOfRange, "ProgressOutOfRange");
export class ProgressOutOfRange extends Schema.TaggedError<ProgressOutOfRange>()("ProgressOutOfRange", { code: Schema.Literal(refusals.ProgressOutOfRange.code), ...wireStruct(Goal.ProgressOutOfRange.fields).fields }, { httpApiStatus: refusals.ProgressOutOfRange.status }) { static readonly code = refusals.ProgressOutOfRange.code; }
ErrorNames.name(Goal.GoalIsGroup, "GoalIsGroup");
export class GoalIsGroup extends Schema.TaggedError<GoalIsGroup>()("GoalIsGroup", { code: Schema.Literal(refusals.GoalIsGroup.code), ...wireStruct(Goal.GoalIsGroup.fields).fields }, { httpApiStatus: refusals.GoalIsGroup.status }) { static readonly code = refusals.GoalIsGroup.code; }
ErrorNames.name(Goal.GoalNotGroup, "GoalNotGroup");
export class GoalNotGroup extends Schema.TaggedError<GoalNotGroup>()("GoalNotGroup", { code: Schema.Literal(refusals.GoalNotGroup.code), ...wireStruct(Goal.GoalNotGroup.fields).fields }, { httpApiStatus: refusals.GoalNotGroup.status }) { static readonly code = refusals.GoalNotGroup.code; }
ErrorNames.name(Goal.ParentGoalNotGroup, "ParentGoalNotGroup");
export class ParentGoalNotGroup extends Schema.TaggedError<ParentGoalNotGroup>()("ParentGoalNotGroup", { code: Schema.Literal(refusals.ParentGoalNotGroup.code), ...wireStruct(Goal.ParentGoalNotGroup.fields).fields }, { httpApiStatus: refusals.ParentGoalNotGroup.status }) { static readonly code = refusals.ParentGoalNotGroup.code; }
ErrorNames.name(Holiday.HolidayDateTaken, "HolidayDateTaken");
export class HolidayDateTaken extends Schema.TaggedError<HolidayDateTaken>()("HolidayDateTaken", { code: Schema.Literal(refusals.HolidayDateTaken.code), ...wireStruct(Holiday.HolidayDateTaken.fields).fields }, { httpApiStatus: refusals.HolidayDateTaken.status }) { static readonly code = refusals.HolidayDateTaken.code; }
ErrorNames.name(Holiday.HolidayOutsideList, "HolidayOutsideList");
export class HolidayOutsideList extends Schema.TaggedError<HolidayOutsideList>()("HolidayOutsideList", { code: Schema.Literal(refusals.HolidayOutsideList.code), ...wireStruct(Holiday.HolidayOutsideList.fields).fields }, { httpApiStatus: refusals.HolidayOutsideList.status }) { static readonly code = refusals.HolidayOutsideList.code; }
ErrorNames.name(HolidayList.HolidayListNameTaken, "HolidayListNameTaken");
export class HolidayListNameTaken extends Schema.TaggedError<HolidayListNameTaken>()("HolidayListNameTaken", { code: Schema.Literal(refusals.HolidayListNameTaken.code), ...wireStruct(HolidayList.HolidayListNameTaken.fields).fields }, { httpApiStatus: refusals.HolidayListNameTaken.status }) { static readonly code = refusals.HolidayListNameTaken.code; }
ErrorNames.name(HolidayList.HolidayListEndsBeforeStart, "HolidayListEndsBeforeStart");
export class HolidayListEndsBeforeStart extends Schema.TaggedError<HolidayListEndsBeforeStart>()("HolidayListEndsBeforeStart", { code: Schema.Literal(refusals.HolidayListEndsBeforeStart.code), ...wireStruct(HolidayList.HolidayListEndsBeforeStart.fields).fields }, { httpApiStatus: refusals.HolidayListEndsBeforeStart.status }) { static readonly code = refusals.HolidayListEndsBeforeStart.code; }
ErrorNames.name(Interview.ApplicantRejected, "ApplicantRejected");
export class ApplicantRejected extends Schema.TaggedError<ApplicantRejected>()("ApplicantRejected", { code: Schema.Literal(refusals.ApplicantRejected.code), ...wireStruct(Interview.ApplicantRejected.fields).fields }, { httpApiStatus: refusals.ApplicantRejected.status }) { static readonly code = refusals.ApplicantRejected.code; }
ErrorNames.name(Interview.RoundNotInCompany, "RoundNotInCompany");
export class RoundNotInCompany extends Schema.TaggedError<RoundNotInCompany>()("RoundNotInCompany", { code: Schema.Literal(refusals.RoundNotInCompany.code), ...wireStruct(Interview.RoundNotInCompany.fields).fields }, { httpApiStatus: refusals.RoundNotInCompany.status }) { static readonly code = refusals.RoundNotInCompany.code; }
ErrorNames.name(Interview.InterviewEndsBeforeStart, "InterviewEndsBeforeStart");
export class InterviewEndsBeforeStart extends Schema.TaggedError<InterviewEndsBeforeStart>()("InterviewEndsBeforeStart", { code: Schema.Literal(refusals.InterviewEndsBeforeStart.code), ...wireStruct(Interview.InterviewEndsBeforeStart.fields).fields }, { httpApiStatus: refusals.InterviewEndsBeforeStart.status }) { static readonly code = refusals.InterviewEndsBeforeStart.code; }
ErrorNames.name(Interview.InterviewerNotInCompany, "InterviewerNotInCompany");
export class InterviewerNotInCompany extends Schema.TaggedError<InterviewerNotInCompany>()("InterviewerNotInCompany", { code: Schema.Literal(refusals.InterviewerNotInCompany.code), ...wireStruct(Interview.InterviewerNotInCompany.fields).fields }, { httpApiStatus: refusals.InterviewerNotInCompany.status }) { static readonly code = refusals.InterviewerNotInCompany.code; }
ErrorNames.name(Interview.InterviewerHasLeft, "InterviewerHasLeft");
export class InterviewerHasLeft extends Schema.TaggedError<InterviewerHasLeft>()("InterviewerHasLeft", { code: Schema.Literal(refusals.InterviewerHasLeft.code), ...wireStruct(Interview.InterviewerHasLeft.fields).fields }, { httpApiStatus: refusals.InterviewerHasLeft.status }) { static readonly code = refusals.InterviewerHasLeft.code; }
ErrorNames.name(Interview.InterviewAlreadyScheduled, "InterviewAlreadyScheduled");
export class InterviewAlreadyScheduled extends Schema.TaggedError<InterviewAlreadyScheduled>()("InterviewAlreadyScheduled", { code: Schema.Literal(refusals.InterviewAlreadyScheduled.code), ...wireStruct(Interview.InterviewAlreadyScheduled.fields).fields }, { httpApiStatus: refusals.InterviewAlreadyScheduled.status }) { static readonly code = refusals.InterviewAlreadyScheduled.code; }
ErrorNames.name(InterviewFeedback.FeedbackGiverNotInterviewer, "FeedbackGiverNotInterviewer");
export class FeedbackGiverNotInterviewer extends Schema.TaggedError<FeedbackGiverNotInterviewer>()("FeedbackGiverNotInterviewer", { code: Schema.Literal(refusals.FeedbackGiverNotInterviewer.code), ...wireStruct(InterviewFeedback.FeedbackGiverNotInterviewer.fields).fields }, { httpApiStatus: refusals.FeedbackGiverNotInterviewer.status }) { static readonly code = refusals.FeedbackGiverNotInterviewer.code; }
ErrorNames.name(InterviewFeedback.FeedbackBeforeInterview, "FeedbackBeforeInterview");
export class FeedbackBeforeInterview extends Schema.TaggedError<FeedbackBeforeInterview>()("FeedbackBeforeInterview", { code: Schema.Literal(refusals.FeedbackBeforeInterview.code), ...wireStruct(InterviewFeedback.FeedbackBeforeInterview.fields).fields }, { httpApiStatus: refusals.FeedbackBeforeInterview.status }) { static readonly code = refusals.FeedbackBeforeInterview.code; }
ErrorNames.name(InterviewFeedback.FeedbackAlreadyGiven, "FeedbackAlreadyGiven");
export class FeedbackAlreadyGiven extends Schema.TaggedError<FeedbackAlreadyGiven>()("FeedbackAlreadyGiven", { code: Schema.Literal(refusals.FeedbackAlreadyGiven.code), ...wireStruct(InterviewFeedback.FeedbackAlreadyGiven.fields).fields }, { httpApiStatus: refusals.FeedbackAlreadyGiven.status }) { static readonly code = refusals.FeedbackAlreadyGiven.code; }
ErrorNames.name(InterviewRound.RoundNameTaken, "RoundNameTaken");
export class RoundNameTaken extends Schema.TaggedError<RoundNameTaken>()("RoundNameTaken", { code: Schema.Literal(refusals.RoundNameTaken.code), ...wireStruct(InterviewRound.RoundNameTaken.fields).fields }, { httpApiStatus: refusals.RoundNameTaken.status }) { static readonly code = refusals.RoundNameTaken.code; }
ErrorNames.name(InterviewRound.RoundInterviewerNotInCompany, "RoundInterviewerNotInCompany");
export class RoundInterviewerNotInCompany extends Schema.TaggedError<RoundInterviewerNotInCompany>()("RoundInterviewerNotInCompany", { code: Schema.Literal(refusals.RoundInterviewerNotInCompany.code), ...wireStruct(InterviewRound.RoundInterviewerNotInCompany.fields).fields }, { httpApiStatus: refusals.RoundInterviewerNotInCompany.status }) { static readonly code = refusals.RoundInterviewerNotInCompany.code; }
ErrorNames.name(InterviewRound.RoundInterviewerHasLeft, "RoundInterviewerHasLeft");
export class RoundInterviewerHasLeft extends Schema.TaggedError<RoundInterviewerHasLeft>()("RoundInterviewerHasLeft", { code: Schema.Literal(refusals.RoundInterviewerHasLeft.code), ...wireStruct(InterviewRound.RoundInterviewerHasLeft.fields).fields }, { httpApiStatus: refusals.RoundInterviewerHasLeft.status }) { static readonly code = refusals.RoundInterviewerHasLeft.code; }
ErrorNames.name(JobApplicant.OpeningClosed, "OpeningClosed");
export class OpeningClosed extends Schema.TaggedError<OpeningClosed>()("OpeningClosed", { code: Schema.Literal(refusals.OpeningClosed.code), ...wireStruct(JobApplicant.OpeningClosed.fields).fields }, { httpApiStatus: refusals.OpeningClosed.status }) { static readonly code = refusals.OpeningClosed.code; }
ErrorNames.name(JobApplicant.OfferNotAccepted, "OfferNotAccepted");
export class OfferNotAccepted extends Schema.TaggedError<OfferNotAccepted>()("OfferNotAccepted", { code: Schema.Literal(refusals.OfferNotAccepted.code), ...wireStruct(JobApplicant.OfferNotAccepted.fields).fields }, { httpApiStatus: refusals.OfferNotAccepted.status }) { static readonly code = refusals.OfferNotAccepted.code; }
ErrorNames.name(JobOffer.OfferDesignationNotInCompany, "OfferDesignationNotInCompany");
export class OfferDesignationNotInCompany extends Schema.TaggedError<OfferDesignationNotInCompany>()("OfferDesignationNotInCompany", { code: Schema.Literal(refusals.OfferDesignationNotInCompany.code), ...wireStruct(JobOffer.OfferDesignationNotInCompany.fields).fields }, { httpApiStatus: refusals.OfferDesignationNotInCompany.status }) { static readonly code = refusals.OfferDesignationNotInCompany.code; }
ErrorNames.name(JobOffer.OfferAlreadyMade, "OfferAlreadyMade");
export class OfferAlreadyMade extends Schema.TaggedError<OfferAlreadyMade>()("OfferAlreadyMade", { code: Schema.Literal(refusals.OfferAlreadyMade.code), ...wireStruct(JobOffer.OfferAlreadyMade.fields).fields }, { httpApiStatus: refusals.OfferAlreadyMade.status }) { static readonly code = refusals.OfferAlreadyMade.code; }
ErrorNames.name(JobOpening.OpeningWithoutVacancies, "OpeningWithoutVacancies");
export class OpeningWithoutVacancies extends Schema.TaggedError<OpeningWithoutVacancies>()("OpeningWithoutVacancies", { code: Schema.Literal(refusals.OpeningWithoutVacancies.code), ...wireStruct(JobOpening.OpeningWithoutVacancies.fields).fields }, { httpApiStatus: refusals.OpeningWithoutVacancies.status }) { static readonly code = refusals.OpeningWithoutVacancies.code; }
ErrorNames.name(JournalEntry.JournalEntryTooFewLines, "JournalEntryTooFewLines");
export class JournalEntryTooFewLines extends Schema.TaggedError<JournalEntryTooFewLines>()("JournalEntryTooFewLines", { code: Schema.Literal(refusals.JournalEntryTooFewLines.code), ...wireStruct(JournalEntry.JournalEntryTooFewLines.fields).fields }, { httpApiStatus: refusals.JournalEntryTooFewLines.status }) { static readonly code = refusals.JournalEntryTooFewLines.code; }
ErrorNames.name(JournalEntry.LineAccountNotInCompany, "LineAccountNotInCompany");
export class LineAccountNotInCompany extends Schema.TaggedError<LineAccountNotInCompany>()("LineAccountNotInCompany", { code: Schema.Literal(refusals.LineAccountNotInCompany.code), ...wireStruct(JournalEntry.LineAccountNotInCompany.fields).fields }, { httpApiStatus: refusals.LineAccountNotInCompany.status }) { static readonly code = refusals.LineAccountNotInCompany.code; }
ErrorNames.name(JournalEntry.LineAccountIsGroup, "LineAccountIsGroup");
export class LineAccountIsGroup extends Schema.TaggedError<LineAccountIsGroup>()("LineAccountIsGroup", { code: Schema.Literal(refusals.LineAccountIsGroup.code), ...wireStruct(JournalEntry.LineAccountIsGroup.fields).fields }, { httpApiStatus: refusals.LineAccountIsGroup.status }) { static readonly code = refusals.LineAccountIsGroup.code; }
ErrorNames.name(JournalEntry.LineCostCenterNotInCompany, "LineCostCenterNotInCompany");
export class LineCostCenterNotInCompany extends Schema.TaggedError<LineCostCenterNotInCompany>()("LineCostCenterNotInCompany", { code: Schema.Literal(refusals.LineCostCenterNotInCompany.code), ...wireStruct(JournalEntry.LineCostCenterNotInCompany.fields).fields }, { httpApiStatus: refusals.LineCostCenterNotInCompany.status }) { static readonly code = refusals.LineCostCenterNotInCompany.code; }
ErrorNames.name(JournalEntry.LineCostCenterIsGroup, "LineCostCenterIsGroup");
export class LineCostCenterIsGroup extends Schema.TaggedError<LineCostCenterIsGroup>()("LineCostCenterIsGroup", { code: Schema.Literal(refusals.LineCostCenterIsGroup.code), ...wireStruct(JournalEntry.LineCostCenterIsGroup.fields).fields }, { httpApiStatus: refusals.LineCostCenterIsGroup.status }) { static readonly code = refusals.LineCostCenterIsGroup.code; }
ErrorNames.name(JournalEntry.LineWithoutAmount, "LineWithoutAmount");
export class LineWithoutAmount extends Schema.TaggedError<LineWithoutAmount>()("LineWithoutAmount", { code: Schema.Literal(refusals.LineWithoutAmount.code), ...wireStruct(JournalEntry.LineWithoutAmount.fields).fields }, { httpApiStatus: refusals.LineWithoutAmount.status }) { static readonly code = refusals.LineWithoutAmount.code; }
ErrorNames.name(JournalEntry.LineDebitAndCredit, "LineDebitAndCredit");
export class LineDebitAndCredit extends Schema.TaggedError<LineDebitAndCredit>()("LineDebitAndCredit", { code: Schema.Literal(refusals.LineDebitAndCredit.code), ...wireStruct(JournalEntry.LineDebitAndCredit.fields).fields }, { httpApiStatus: refusals.LineDebitAndCredit.status }) { static readonly code = refusals.LineDebitAndCredit.code; }
ErrorNames.name(JournalEntry.JournalEntryUnbalanced, "JournalEntryUnbalanced");
export class JournalEntryUnbalanced extends Schema.TaggedError<JournalEntryUnbalanced>()("JournalEntryUnbalanced", { code: Schema.Literal(refusals.JournalEntryUnbalanced.code), ...wireStruct(JournalEntry.JournalEntryUnbalanced.fields).fields }, { httpApiStatus: refusals.JournalEntryUnbalanced.status }) { static readonly code = refusals.JournalEntryUnbalanced.code; }
ErrorNames.name(JournalEntry.PostingDateOutsideFiscalYear, "PostingDateOutsideFiscalYear");
export class PostingDateOutsideFiscalYear extends Schema.TaggedError<PostingDateOutsideFiscalYear>()("PostingDateOutsideFiscalYear", { code: Schema.Literal(refusals.PostingDateOutsideFiscalYear.code), ...wireStruct(JournalEntry.PostingDateOutsideFiscalYear.fields).fields }, { httpApiStatus: refusals.PostingDateOutsideFiscalYear.status }) { static readonly code = refusals.PostingDateOutsideFiscalYear.code; }
ErrorNames.name(Kra.KraTitleTaken, "KraTitleTaken");
export class KraTitleTaken extends Schema.TaggedError<KraTitleTaken>()("KraTitleTaken", { code: Schema.Literal(refusals.KraTitleTaken.code), ...wireStruct(Kra.KraTitleTaken.fields).fields }, { httpApiStatus: refusals.KraTitleTaken.status }) { static readonly code = refusals.KraTitleTaken.code; }
ErrorNames.name(LeaveAllocation.AllocateeNotInCompany, "AllocateeNotInCompany");
export class AllocateeNotInCompany extends Schema.TaggedError<AllocateeNotInCompany>()("AllocateeNotInCompany", { code: Schema.Literal(refusals.AllocateeNotInCompany.code), ...wireStruct(LeaveAllocation.AllocateeNotInCompany.fields).fields }, { httpApiStatus: refusals.AllocateeNotInCompany.status }) { static readonly code = refusals.AllocateeNotInCompany.code; }
ErrorNames.name(LeaveAllocation.AllocateeHasLeft, "AllocateeHasLeft");
export class AllocateeHasLeft extends Schema.TaggedError<AllocateeHasLeft>()("AllocateeHasLeft", { code: Schema.Literal(refusals.AllocateeHasLeft.code), ...wireStruct(LeaveAllocation.AllocateeHasLeft.fields).fields }, { httpApiStatus: refusals.AllocateeHasLeft.status }) { static readonly code = refusals.AllocateeHasLeft.code; }
ErrorNames.name(LeaveAllocation.AllocationTypeNotInCompany, "AllocationTypeNotInCompany");
export class AllocationTypeNotInCompany extends Schema.TaggedError<AllocationTypeNotInCompany>()("AllocationTypeNotInCompany", { code: Schema.Literal(refusals.AllocationTypeNotInCompany.code), ...wireStruct(LeaveAllocation.AllocationTypeNotInCompany.fields).fields }, { httpApiStatus: refusals.AllocationTypeNotInCompany.status }) { static readonly code = refusals.AllocationTypeNotInCompany.code; }
ErrorNames.name(LeaveAllocation.AllocationEndsBeforeStart, "AllocationEndsBeforeStart");
export class AllocationEndsBeforeStart extends Schema.TaggedError<AllocationEndsBeforeStart>()("AllocationEndsBeforeStart", { code: Schema.Literal(refusals.AllocationEndsBeforeStart.code), ...wireStruct(LeaveAllocation.AllocationEndsBeforeStart.fields).fields }, { httpApiStatus: refusals.AllocationEndsBeforeStart.status }) { static readonly code = refusals.AllocationEndsBeforeStart.code; }
ErrorNames.name(LeaveAllocation.AllocationOverlaps, "AllocationOverlaps");
export class AllocationOverlaps extends Schema.TaggedError<AllocationOverlaps>()("AllocationOverlaps", { code: Schema.Literal(refusals.AllocationOverlaps.code), ...wireStruct(LeaveAllocation.AllocationOverlaps.fields).fields }, { httpApiStatus: refusals.AllocationOverlaps.status }) { static readonly code = refusals.AllocationOverlaps.code; }
ErrorNames.name(LeaveAllocation.LeaveWithoutPayNotAllocated, "LeaveWithoutPayNotAllocated");
export class LeaveWithoutPayNotAllocated extends Schema.TaggedError<LeaveWithoutPayNotAllocated>()("LeaveWithoutPayNotAllocated", { code: Schema.Literal(refusals.LeaveWithoutPayNotAllocated.code), ...wireStruct(LeaveAllocation.LeaveWithoutPayNotAllocated.fields).fields }, { httpApiStatus: refusals.LeaveWithoutPayNotAllocated.status }) { static readonly code = refusals.LeaveWithoutPayNotAllocated.code; }
ErrorNames.name(LeaveAllocation.NoLeavesAllocated, "NoLeavesAllocated");
export class NoLeavesAllocated extends Schema.TaggedError<NoLeavesAllocated>()("NoLeavesAllocated", { code: Schema.Literal(refusals.NoLeavesAllocated.code), ...wireStruct(LeaveAllocation.NoLeavesAllocated.fields).fields }, { httpApiStatus: refusals.NoLeavesAllocated.status }) { static readonly code = refusals.NoLeavesAllocated.code; }
ErrorNames.name(LeaveAllocation.AllocationExceedsPeriod, "AllocationExceedsPeriod");
export class AllocationExceedsPeriod extends Schema.TaggedError<AllocationExceedsPeriod>()("AllocationExceedsPeriod", { code: Schema.Literal(refusals.AllocationExceedsPeriod.code), ...wireStruct(LeaveAllocation.AllocationExceedsPeriod.fields).fields }, { httpApiStatus: refusals.AllocationExceedsPeriod.status }) { static readonly code = refusals.AllocationExceedsPeriod.code; }
ErrorNames.name(LeaveApplication.ApplicantNotInCompany, "ApplicantNotInCompany");
export class ApplicantNotInCompany extends Schema.TaggedError<ApplicantNotInCompany>()("ApplicantNotInCompany", { code: Schema.Literal(refusals.ApplicantNotInCompany.code), ...wireStruct(LeaveApplication.ApplicantNotInCompany.fields).fields }, { httpApiStatus: refusals.ApplicantNotInCompany.status }) { static readonly code = refusals.ApplicantNotInCompany.code; }
ErrorNames.name(LeaveApplication.ApplicantHasLeft, "ApplicantHasLeft");
export class ApplicantHasLeft extends Schema.TaggedError<ApplicantHasLeft>()("ApplicantHasLeft", { code: Schema.Literal(refusals.ApplicantHasLeft.code), ...wireStruct(LeaveApplication.ApplicantHasLeft.fields).fields }, { httpApiStatus: refusals.ApplicantHasLeft.status }) { static readonly code = refusals.ApplicantHasLeft.code; }
ErrorNames.name(LeaveApplication.ApplicationTypeNotInCompany, "ApplicationTypeNotInCompany");
export class ApplicationTypeNotInCompany extends Schema.TaggedError<ApplicationTypeNotInCompany>()("ApplicationTypeNotInCompany", { code: Schema.Literal(refusals.ApplicationTypeNotInCompany.code), ...wireStruct(LeaveApplication.ApplicationTypeNotInCompany.fields).fields }, { httpApiStatus: refusals.ApplicationTypeNotInCompany.status }) { static readonly code = refusals.ApplicationTypeNotInCompany.code; }
ErrorNames.name(LeaveApplication.LeaveEndsBeforeStart, "LeaveEndsBeforeStart");
export class LeaveEndsBeforeStart extends Schema.TaggedError<LeaveEndsBeforeStart>()("LeaveEndsBeforeStart", { code: Schema.Literal(refusals.LeaveEndsBeforeStart.code), ...wireStruct(LeaveApplication.LeaveEndsBeforeStart.fields).fields }, { httpApiStatus: refusals.LeaveEndsBeforeStart.status }) { static readonly code = refusals.LeaveEndsBeforeStart.code; }
ErrorNames.name(LeaveApplication.LeaveBeforeJoining, "LeaveBeforeJoining");
export class LeaveBeforeJoining extends Schema.TaggedError<LeaveBeforeJoining>()("LeaveBeforeJoining", { code: Schema.Literal(refusals.LeaveBeforeJoining.code), ...wireStruct(LeaveApplication.LeaveBeforeJoining.fields).fields }, { httpApiStatus: refusals.LeaveBeforeJoining.status }) { static readonly code = refusals.LeaveBeforeJoining.code; }
ErrorNames.name(LeaveApplication.NoAllocationCovers, "NoAllocationCovers");
export class NoAllocationCovers extends Schema.TaggedError<NoAllocationCovers>()("NoAllocationCovers", { code: Schema.Literal(refusals.NoAllocationCovers.code), ...wireStruct(LeaveApplication.NoAllocationCovers.fields).fields }, { httpApiStatus: refusals.NoAllocationCovers.status }) { static readonly code = refusals.NoAllocationCovers.code; }
ErrorNames.name(LeaveApplication.LeaveAllHolidays, "LeaveAllHolidays");
export class LeaveAllHolidays extends Schema.TaggedError<LeaveAllHolidays>()("LeaveAllHolidays", { code: Schema.Literal(refusals.LeaveAllHolidays.code), ...wireStruct(LeaveApplication.LeaveAllHolidays.fields).fields }, { httpApiStatus: refusals.LeaveAllHolidays.status }) { static readonly code = refusals.LeaveAllHolidays.code; }
ErrorNames.name(LeaveApplication.InsufficientLeaveBalance, "InsufficientLeaveBalance");
export class InsufficientLeaveBalance extends Schema.TaggedError<InsufficientLeaveBalance>()("InsufficientLeaveBalance", { code: Schema.Literal(refusals.InsufficientLeaveBalance.code), ...wireStruct(LeaveApplication.InsufficientLeaveBalance.fields).fields }, { httpApiStatus: refusals.InsufficientLeaveBalance.status }) { static readonly code = refusals.InsufficientLeaveBalance.code; }
ErrorNames.name(LeaveApplication.LeaveOverlaps, "LeaveOverlaps");
export class LeaveOverlaps extends Schema.TaggedError<LeaveOverlaps>()("LeaveOverlaps", { code: Schema.Literal(refusals.LeaveOverlaps.code), ...wireStruct(LeaveApplication.LeaveOverlaps.fields).fields }, { httpApiStatus: refusals.LeaveOverlaps.status }) { static readonly code = refusals.LeaveOverlaps.code; }
ErrorNames.name(LeaveApplication.LeaveTooLong, "LeaveTooLong");
export class LeaveTooLong extends Schema.TaggedError<LeaveTooLong>()("LeaveTooLong", { code: Schema.Literal(refusals.LeaveTooLong.code), ...wireStruct(LeaveApplication.LeaveTooLong.fields).fields }, { httpApiStatus: refusals.LeaveTooLong.status }) { static readonly code = refusals.LeaveTooLong.code; }
ErrorNames.name(LeaveApplication.LeaveDayAttended, "LeaveDayAttended");
export class LeaveDayAttended extends Schema.TaggedError<LeaveDayAttended>()("LeaveDayAttended", { code: Schema.Literal(refusals.LeaveDayAttended.code), ...wireStruct(LeaveApplication.LeaveDayAttended.fields).fields }, { httpApiStatus: refusals.LeaveDayAttended.status }) { static readonly code = refusals.LeaveDayAttended.code; }
ErrorNames.name(LeaveType.LeaveTypeNameTaken, "LeaveTypeNameTaken");
export class LeaveTypeNameTaken extends Schema.TaggedError<LeaveTypeNameTaken>()("LeaveTypeNameTaken", { code: Schema.Literal(refusals.LeaveTypeNameTaken.code), ...wireStruct(LeaveType.LeaveTypeNameTaken.fields).fields }, { httpApiStatus: refusals.LeaveTypeNameTaken.status }) { static readonly code = refusals.LeaveTypeNameTaken.code; }
ErrorNames.name(PayrollEntry.PayrollEndsBeforeStart, "PayrollEndsBeforeStart");
export class PayrollEndsBeforeStart extends Schema.TaggedError<PayrollEndsBeforeStart>()("PayrollEndsBeforeStart", { code: Schema.Literal(refusals.PayrollEndsBeforeStart.code), ...wireStruct(PayrollEntry.PayrollEndsBeforeStart.fields).fields }, { httpApiStatus: refusals.PayrollEndsBeforeStart.status }) { static readonly code = refusals.PayrollEndsBeforeStart.code; }
ErrorNames.name(PayrollEntry.PayableAccountNotInCompany, "PayableAccountNotInCompany");
export class PayableAccountNotInCompany extends Schema.TaggedError<PayableAccountNotInCompany>()("PayableAccountNotInCompany", { code: Schema.Literal(refusals.PayableAccountNotInCompany.code), ...wireStruct(PayrollEntry.PayableAccountNotInCompany.fields).fields }, { httpApiStatus: refusals.PayableAccountNotInCompany.status }) { static readonly code = refusals.PayableAccountNotInCompany.code; }
ErrorNames.name(PayrollEntry.PayableAccountIsGroup, "PayableAccountIsGroup");
export class PayableAccountIsGroup extends Schema.TaggedError<PayableAccountIsGroup>()("PayableAccountIsGroup", { code: Schema.Literal(refusals.PayableAccountIsGroup.code), ...wireStruct(PayrollEntry.PayableAccountIsGroup.fields).fields }, { httpApiStatus: refusals.PayableAccountIsGroup.status }) { static readonly code = refusals.PayableAccountIsGroup.code; }
ErrorNames.name(PayrollEntry.PayableAccountHasType, "PayableAccountHasType");
export class PayableAccountHasType extends Schema.TaggedError<PayableAccountHasType>()("PayableAccountHasType", { code: Schema.Literal(refusals.PayableAccountHasType.code), ...wireStruct(PayrollEntry.PayableAccountHasType.fields).fields }, { httpApiStatus: refusals.PayableAccountHasType.status }) { static readonly code = refusals.PayableAccountHasType.code; }
ErrorNames.name(PayrollEntry.PayrollCostCenterNotInCompany, "PayrollCostCenterNotInCompany");
export class PayrollCostCenterNotInCompany extends Schema.TaggedError<PayrollCostCenterNotInCompany>()("PayrollCostCenterNotInCompany", { code: Schema.Literal(refusals.PayrollCostCenterNotInCompany.code), ...wireStruct(PayrollEntry.PayrollCostCenterNotInCompany.fields).fields }, { httpApiStatus: refusals.PayrollCostCenterNotInCompany.status }) { static readonly code = refusals.PayrollCostCenterNotInCompany.code; }
ErrorNames.name(PayrollEntry.PayrollCostCenterIsGroup, "PayrollCostCenterIsGroup");
export class PayrollCostCenterIsGroup extends Schema.TaggedError<PayrollCostCenterIsGroup>()("PayrollCostCenterIsGroup", { code: Schema.Literal(refusals.PayrollCostCenterIsGroup.code), ...wireStruct(PayrollEntry.PayrollCostCenterIsGroup.fields).fields }, { httpApiStatus: refusals.PayrollCostCenterIsGroup.status }) { static readonly code = refusals.PayrollCostCenterIsGroup.code; }
ErrorNames.name(PayrollEntry.NoEmployeesFound, "NoEmployeesFound");
export class NoEmployeesFound extends Schema.TaggedError<NoEmployeesFound>()("NoEmployeesFound", { code: Schema.Literal(refusals.NoEmployeesFound.code), ...wireStruct(PayrollEntry.NoEmployeesFound.fields).fields }, { httpApiStatus: refusals.NoEmployeesFound.status }) { static readonly code = refusals.NoEmployeesFound.code; }
ErrorNames.name(PayrollEntry.SalarySlipExists, "SalarySlipExists");
export class SalarySlipExists extends Schema.TaggedError<SalarySlipExists>()("SalarySlipExists", { code: Schema.Literal(refusals.SalarySlipExists.code), ...wireStruct(PayrollEntry.SalarySlipExists.fields).fields }, { httpApiStatus: refusals.SalarySlipExists.status }) { static readonly code = refusals.SalarySlipExists.code; }
ErrorNames.name(PayrollEntry.NoAssignmentAtStart, "NoAssignmentAtStart");
export class NoAssignmentAtStart extends Schema.TaggedError<NoAssignmentAtStart>()("NoAssignmentAtStart", { code: Schema.Literal(refusals.NoAssignmentAtStart.code), ...wireStruct(PayrollEntry.NoAssignmentAtStart.fields).fields }, { httpApiStatus: refusals.NoAssignmentAtStart.status }) { static readonly code = refusals.NoAssignmentAtStart.code; }
ErrorNames.name(PayrollEntry.AccrualOutsideFiscalYear, "AccrualOutsideFiscalYear");
export class AccrualOutsideFiscalYear extends Schema.TaggedError<AccrualOutsideFiscalYear>()("AccrualOutsideFiscalYear", { code: Schema.Literal(refusals.AccrualOutsideFiscalYear.code), ...wireStruct(PayrollEntry.AccrualOutsideFiscalYear.fields).fields }, { httpApiStatus: refusals.AccrualOutsideFiscalYear.status }) { static readonly code = refusals.AccrualOutsideFiscalYear.code; }
ErrorNames.name(PayrollPeriod.PayrollPeriodEndsBeforeStart, "PayrollPeriodEndsBeforeStart");
export class PayrollPeriodEndsBeforeStart extends Schema.TaggedError<PayrollPeriodEndsBeforeStart>()("PayrollPeriodEndsBeforeStart", { code: Schema.Literal(refusals.PayrollPeriodEndsBeforeStart.code), ...wireStruct(PayrollPeriod.PayrollPeriodEndsBeforeStart.fields).fields }, { httpApiStatus: refusals.PayrollPeriodEndsBeforeStart.status }) { static readonly code = refusals.PayrollPeriodEndsBeforeStart.code; }
ErrorNames.name(PayrollPeriod.PayrollPeriodOverlaps, "PayrollPeriodOverlaps");
export class PayrollPeriodOverlaps extends Schema.TaggedError<PayrollPeriodOverlaps>()("PayrollPeriodOverlaps", { code: Schema.Literal(refusals.PayrollPeriodOverlaps.code), ...wireStruct(PayrollPeriod.PayrollPeriodOverlaps.fields).fields }, { httpApiStatus: refusals.PayrollPeriodOverlaps.status }) { static readonly code = refusals.PayrollPeriodOverlaps.code; }
ErrorNames.name(PayrollPeriod.PayrollPeriodNameTaken, "PayrollPeriodNameTaken");
export class PayrollPeriodNameTaken extends Schema.TaggedError<PayrollPeriodNameTaken>()("PayrollPeriodNameTaken", { code: Schema.Literal(refusals.PayrollPeriodNameTaken.code), ...wireStruct(PayrollPeriod.PayrollPeriodNameTaken.fields).fields }, { httpApiStatus: refusals.PayrollPeriodNameTaken.status }) { static readonly code = refusals.PayrollPeriodNameTaken.code; }
ErrorNames.name(Safe.SafeAlreadyRecorded, "SafeAlreadyRecorded");
export class SafeAlreadyRecorded extends Schema.TaggedError<SafeAlreadyRecorded>()("SafeAlreadyRecorded", { code: Schema.Literal(refusals.SafeAlreadyRecorded.code), ...wireStruct(Safe.SafeAlreadyRecorded.fields).fields }, { httpApiStatus: refusals.SafeAlreadyRecorded.status }) { static readonly code = refusals.SafeAlreadyRecorded.code; }
ErrorNames.name(Safe.FounderHasNoSafe, "FounderHasNoSafe");
export class FounderHasNoSafe extends Schema.TaggedError<FounderHasNoSafe>()("FounderHasNoSafe", { code: Schema.Literal(refusals.FounderHasNoSafe.code), ...wireStruct(Safe.FounderHasNoSafe.fields).fields }, { httpApiStatus: refusals.FounderHasNoSafe.status }) { static readonly code = refusals.FounderHasNoSafe.code; }
ErrorNames.name(SalaryComponent.ComponentAccountNotInCompany, "ComponentAccountNotInCompany");
export class ComponentAccountNotInCompany extends Schema.TaggedError<ComponentAccountNotInCompany>()("ComponentAccountNotInCompany", { code: Schema.Literal(refusals.ComponentAccountNotInCompany.code), ...wireStruct(SalaryComponent.ComponentAccountNotInCompany.fields).fields }, { httpApiStatus: refusals.ComponentAccountNotInCompany.status }) { static readonly code = refusals.ComponentAccountNotInCompany.code; }
ErrorNames.name(SalaryComponent.ComponentAccountIsGroup, "ComponentAccountIsGroup");
export class ComponentAccountIsGroup extends Schema.TaggedError<ComponentAccountIsGroup>()("ComponentAccountIsGroup", { code: Schema.Literal(refusals.ComponentAccountIsGroup.code), ...wireStruct(SalaryComponent.ComponentAccountIsGroup.fields).fields }, { httpApiStatus: refusals.ComponentAccountIsGroup.status }) { static readonly code = refusals.ComponentAccountIsGroup.code; }
ErrorNames.name(SalaryComponent.SalaryComponentTaken, "SalaryComponentTaken");
export class SalaryComponentTaken extends Schema.TaggedError<SalaryComponentTaken>()("SalaryComponentTaken", { code: Schema.Literal(refusals.SalaryComponentTaken.code), ...wireStruct(SalaryComponent.SalaryComponentTaken.fields).fields }, { httpApiStatus: refusals.SalaryComponentTaken.status }) { static readonly code = refusals.SalaryComponentTaken.code; }
ErrorNames.name(SalaryStructure.StructureWithoutEarnings, "StructureWithoutEarnings");
export class StructureWithoutEarnings extends Schema.TaggedError<StructureWithoutEarnings>()("StructureWithoutEarnings", { code: Schema.Literal(refusals.StructureWithoutEarnings.code), ...wireStruct(SalaryStructure.StructureWithoutEarnings.fields).fields }, { httpApiStatus: refusals.StructureWithoutEarnings.status }) { static readonly code = refusals.StructureWithoutEarnings.code; }
ErrorNames.name(SalaryStructure.StructureComponentNotInCompany, "StructureComponentNotInCompany");
export class StructureComponentNotInCompany extends Schema.TaggedError<StructureComponentNotInCompany>()("StructureComponentNotInCompany", { code: Schema.Literal(refusals.StructureComponentNotInCompany.code), ...wireStruct(SalaryStructure.StructureComponentNotInCompany.fields).fields }, { httpApiStatus: refusals.StructureComponentNotInCompany.status }) { static readonly code = refusals.StructureComponentNotInCompany.code; }
ErrorNames.name(SalaryStructure.StructureComponentWrongType, "StructureComponentWrongType");
export class StructureComponentWrongType extends Schema.TaggedError<StructureComponentWrongType>()("StructureComponentWrongType", { code: Schema.Literal(refusals.StructureComponentWrongType.code), ...wireStruct(SalaryStructure.StructureComponentWrongType.fields).fields }, { httpApiStatus: refusals.StructureComponentWrongType.status }) { static readonly code = refusals.StructureComponentWrongType.code; }
ErrorNames.name(SalaryStructure.StructureLineWithoutAmount, "StructureLineWithoutAmount");
export class StructureLineWithoutAmount extends Schema.TaggedError<StructureLineWithoutAmount>()("StructureLineWithoutAmount", { code: Schema.Literal(refusals.StructureLineWithoutAmount.code), ...wireStruct(SalaryStructure.StructureLineWithoutAmount.fields).fields }, { httpApiStatus: refusals.StructureLineWithoutAmount.status }) { static readonly code = refusals.StructureLineWithoutAmount.code; }
ErrorNames.name(SalaryStructure.StructureComponentRepeated, "StructureComponentRepeated");
export class StructureComponentRepeated extends Schema.TaggedError<StructureComponentRepeated>()("StructureComponentRepeated", { code: Schema.Literal(refusals.StructureComponentRepeated.code), ...wireStruct(SalaryStructure.StructureComponentRepeated.fields).fields }, { httpApiStatus: refusals.StructureComponentRepeated.status }) { static readonly code = refusals.StructureComponentRepeated.code; }
ErrorNames.name(SalaryStructure.StructureNetPayNegative, "StructureNetPayNegative");
export class StructureNetPayNegative extends Schema.TaggedError<StructureNetPayNegative>()("StructureNetPayNegative", { code: Schema.Literal(refusals.StructureNetPayNegative.code), ...wireStruct(SalaryStructure.StructureNetPayNegative.fields).fields }, { httpApiStatus: refusals.StructureNetPayNegative.status }) { static readonly code = refusals.StructureNetPayNegative.code; }
ErrorNames.name(SalaryStructure.StructureInUse, "StructureInUse");
export class StructureInUse extends Schema.TaggedError<StructureInUse>()("StructureInUse", { code: Schema.Literal(refusals.StructureInUse.code), ...wireStruct(SalaryStructure.StructureInUse.fields).fields }, { httpApiStatus: refusals.StructureInUse.status }) { static readonly code = refusals.StructureInUse.code; }
ErrorNames.name(SalaryStructure.SalaryStructureNameTaken, "SalaryStructureNameTaken");
export class SalaryStructureNameTaken extends Schema.TaggedError<SalaryStructureNameTaken>()("SalaryStructureNameTaken", { code: Schema.Literal(refusals.SalaryStructureNameTaken.code), ...wireStruct(SalaryStructure.SalaryStructureNameTaken.fields).fields }, { httpApiStatus: refusals.SalaryStructureNameTaken.status }) { static readonly code = refusals.SalaryStructureNameTaken.code; }
ErrorNames.name(SalaryStructureAssignment.AssignedEmployeeNotInCompany, "AssignedEmployeeNotInCompany");
export class AssignedEmployeeNotInCompany extends Schema.TaggedError<AssignedEmployeeNotInCompany>()("AssignedEmployeeNotInCompany", { code: Schema.Literal(refusals.AssignedEmployeeNotInCompany.code), ...wireStruct(SalaryStructureAssignment.AssignedEmployeeNotInCompany.fields).fields }, { httpApiStatus: refusals.AssignedEmployeeNotInCompany.status }) { static readonly code = refusals.AssignedEmployeeNotInCompany.code; }
ErrorNames.name(SalaryStructureAssignment.AssignedEmployeeHasLeft, "AssignedEmployeeHasLeft");
export class AssignedEmployeeHasLeft extends Schema.TaggedError<AssignedEmployeeHasLeft>()("AssignedEmployeeHasLeft", { code: Schema.Literal(refusals.AssignedEmployeeHasLeft.code), ...wireStruct(SalaryStructureAssignment.AssignedEmployeeHasLeft.fields).fields }, { httpApiStatus: refusals.AssignedEmployeeHasLeft.status }) { static readonly code = refusals.AssignedEmployeeHasLeft.code; }
ErrorNames.name(SalaryStructureAssignment.AssignmentExists, "AssignmentExists");
export class AssignmentExists extends Schema.TaggedError<AssignmentExists>()("AssignmentExists", { code: Schema.Literal(refusals.AssignmentExists.code), ...wireStruct(SalaryStructureAssignment.AssignmentExists.fields).fields }, { httpApiStatus: refusals.AssignmentExists.status }) { static readonly code = refusals.AssignmentExists.code; }
ErrorNames.name(SalaryStructureAssignment.AssignmentBeforeJoining, "AssignmentBeforeJoining");
export class AssignmentBeforeJoining extends Schema.TaggedError<AssignmentBeforeJoining>()("AssignmentBeforeJoining", { code: Schema.Literal(refusals.AssignmentBeforeJoining.code), ...wireStruct(SalaryStructureAssignment.AssignmentBeforeJoining.fields).fields }, { httpApiStatus: refusals.AssignmentBeforeJoining.status }) { static readonly code = refusals.AssignmentBeforeJoining.code; }
ErrorNames.name(SalaryStructureAssignment.AssignedStructureNotInCompany, "AssignedStructureNotInCompany");
export class AssignedStructureNotInCompany extends Schema.TaggedError<AssignedStructureNotInCompany>()("AssignedStructureNotInCompany", { code: Schema.Literal(refusals.AssignedStructureNotInCompany.code), ...wireStruct(SalaryStructureAssignment.AssignedStructureNotInCompany.fields).fields }, { httpApiStatus: refusals.AssignedStructureNotInCompany.status }) { static readonly code = refusals.AssignedStructureNotInCompany.code; }
ErrorNames.name(SalaryStructureAssignment.AssignedStructureNotSubmitted, "AssignedStructureNotSubmitted");
export class AssignedStructureNotSubmitted extends Schema.TaggedError<AssignedStructureNotSubmitted>()("AssignedStructureNotSubmitted", { code: Schema.Literal(refusals.AssignedStructureNotSubmitted.code), ...wireStruct(SalaryStructureAssignment.AssignedStructureNotSubmitted.fields).fields }, { httpApiStatus: refusals.AssignedStructureNotSubmitted.status }) { static readonly code = refusals.AssignedStructureNotSubmitted.code; }
ErrorNames.name(ShiftType.ShiftTypeNameTaken, "ShiftTypeNameTaken");
export class ShiftTypeNameTaken extends Schema.TaggedError<ShiftTypeNameTaken>()("ShiftTypeNameTaken", { code: Schema.Literal(refusals.ShiftTypeNameTaken.code), ...wireStruct(ShiftType.ShiftTypeNameTaken.fields).fields }, { httpApiStatus: refusals.ShiftTypeNameTaken.status }) { static readonly code = refusals.ShiftTypeNameTaken.code; }
ErrorNames.name(ShiftType.ShiftStartsWhenItEnds, "ShiftStartsWhenItEnds");
export class ShiftStartsWhenItEnds extends Schema.TaggedError<ShiftStartsWhenItEnds>()("ShiftStartsWhenItEnds", { code: Schema.Literal(refusals.ShiftStartsWhenItEnds.code), ...wireStruct(ShiftType.ShiftStartsWhenItEnds.fields).fields }, { httpApiStatus: refusals.ShiftStartsWhenItEnds.status }) { static readonly code = refusals.ShiftStartsWhenItEnds.code; }
export class AccountNotGroup extends Schema.TaggedError<AccountNotGroup>()("AccountNotGroup", { code: Schema.Literal(refusals.AccountNotGroup.code), ...{ state: Schema.Literals(["group", "ledger"]) } }, { httpApiStatus: refusals.AccountNotGroup.status }) { static readonly code = refusals.AccountNotGroup.code; }
export class AppraisalNotDraft extends Schema.TaggedError<AppraisalNotDraft>()("AppraisalNotDraft", { code: Schema.Literal(refusals.AppraisalNotDraft.code), ...{ state: Schema.Literals(["draft", "submitted"]) } }, { httpApiStatus: refusals.AppraisalNotDraft.status }) { static readonly code = refusals.AppraisalNotDraft.code; }
export class AppraisalCycleNotNotStarted extends Schema.TaggedError<AppraisalCycleNotNotStarted>()("AppraisalCycleNotNotStarted", { code: Schema.Literal(refusals.AppraisalCycleNotNotStarted.code), ...{ state: Schema.Literals(["notStarted", "inProgress", "completed"]) } }, { httpApiStatus: refusals.AppraisalCycleNotNotStarted.status }) { static readonly code = refusals.AppraisalCycleNotNotStarted.code; }
export class AppraisalTemplateNotActive extends Schema.TaggedError<AppraisalTemplateNotActive>()("AppraisalTemplateNotActive", { code: Schema.Literal(refusals.AppraisalTemplateNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.AppraisalTemplateNotActive.status }) { static readonly code = refusals.AppraisalTemplateNotActive.code; }
export class AttendanceNotMarked extends Schema.TaggedError<AttendanceNotMarked>()("AttendanceNotMarked", { code: Schema.Literal(refusals.AttendanceNotMarked.code), ...{ state: Schema.Literals(["marked"]) } }, { httpApiStatus: refusals.AttendanceNotMarked.status }) { static readonly code = refusals.AttendanceNotMarked.code; }
export class AttendanceRequestNotDraft extends Schema.TaggedError<AttendanceRequestNotDraft>()("AttendanceRequestNotDraft", { code: Schema.Literal(refusals.AttendanceRequestNotDraft.code), ...{ state: Schema.Literals(["draft", "approved", "rejected"]) } }, { httpApiStatus: refusals.AttendanceRequestNotDraft.status }) { static readonly code = refusals.AttendanceRequestNotDraft.code; }
export class BankAccountNotOpen extends Schema.TaggedError<BankAccountNotOpen>()("BankAccountNotOpen", { code: Schema.Literal(refusals.BankAccountNotOpen.code), ...{ state: Schema.Literals(["open", "closed"]) } }, { httpApiStatus: refusals.BankAccountNotOpen.status }) { static readonly code = refusals.BankAccountNotOpen.code; }
export class BankTransactionNotPending extends Schema.TaggedError<BankTransactionNotPending>()("BankTransactionNotPending", { code: Schema.Literal(refusals.BankTransactionNotPending.code), ...{ state: Schema.Literals(["pending", "settled", "failed"]) } }, { httpApiStatus: refusals.BankTransactionNotPending.status }) { static readonly code = refusals.BankTransactionNotPending.code; }
export class BranchNotActive extends Schema.TaggedError<BranchNotActive>()("BranchNotActive", { code: Schema.Literal(refusals.BranchNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.BranchNotActive.status }) { static readonly code = refusals.BranchNotActive.code; }
export class BridgeBusinessNotStarted extends Schema.TaggedError<BridgeBusinessNotStarted>()("BridgeBusinessNotStarted", { code: Schema.Literal(refusals.BridgeBusinessNotStarted.code), ...{ state: Schema.Literals(["started", "approved", "rejected"]) } }, { httpApiStatus: refusals.BridgeBusinessNotStarted.status }) { static readonly code = refusals.BridgeBusinessNotStarted.code; }
export class BridgeIndividualNotStarted extends Schema.TaggedError<BridgeIndividualNotStarted>()("BridgeIndividualNotStarted", { code: Schema.Literal(refusals.BridgeIndividualNotStarted.code), ...{ state: Schema.Literals(["started", "approved", "rejected"]) } }, { httpApiStatus: refusals.BridgeIndividualNotStarted.status }) { static readonly code = refusals.BridgeIndividualNotStarted.code; }
export class CompanyNotActive extends Schema.TaggedError<CompanyNotActive>()("CompanyNotActive", { code: Schema.Literal(refusals.CompanyNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.CompanyNotActive.status }) { static readonly code = refusals.CompanyNotActive.code; }
export class CostCenterNotGroup extends Schema.TaggedError<CostCenterNotGroup>()("CostCenterNotGroup", { code: Schema.Literal(refusals.CostCenterNotGroup.code), ...{ state: Schema.Literals(["group", "ledger"]) } }, { httpApiStatus: refusals.CostCenterNotGroup.status }) { static readonly code = refusals.CostCenterNotGroup.code; }
export class DepartmentNotActive extends Schema.TaggedError<DepartmentNotActive>()("DepartmentNotActive", { code: Schema.Literal(refusals.DepartmentNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.DepartmentNotActive.status }) { static readonly code = refusals.DepartmentNotActive.code; }
export class DesignationNotActive extends Schema.TaggedError<DesignationNotActive>()("DesignationNotActive", { code: Schema.Literal(refusals.DesignationNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.DesignationNotActive.status }) { static readonly code = refusals.DesignationNotActive.code; }
export class EmployeeNotActive extends Schema.TaggedError<EmployeeNotActive>()("EmployeeNotActive", { code: Schema.Literal(refusals.EmployeeNotActive.code), ...{ state: Schema.Literals(["active", "left"]) } }, { httpApiStatus: refusals.EmployeeNotActive.status }) { static readonly code = refusals.EmployeeNotActive.code; }
export class EmployeeFeedbackCriteriaNotActive extends Schema.TaggedError<EmployeeFeedbackCriteriaNotActive>()("EmployeeFeedbackCriteriaNotActive", { code: Schema.Literal(refusals.EmployeeFeedbackCriteriaNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.EmployeeFeedbackCriteriaNotActive.status }) { static readonly code = refusals.EmployeeFeedbackCriteriaNotActive.code; }
export class EmployeeGradeNotActive extends Schema.TaggedError<EmployeeGradeNotActive>()("EmployeeGradeNotActive", { code: Schema.Literal(refusals.EmployeeGradeNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.EmployeeGradeNotActive.status }) { static readonly code = refusals.EmployeeGradeNotActive.code; }
export class EmployeePerformanceFeedbackNotDraft extends Schema.TaggedError<EmployeePerformanceFeedbackNotDraft>()("EmployeePerformanceFeedbackNotDraft", { code: Schema.Literal(refusals.EmployeePerformanceFeedbackNotDraft.code), ...{ state: Schema.Literals(["draft", "submitted"]) } }, { httpApiStatus: refusals.EmployeePerformanceFeedbackNotDraft.status }) { static readonly code = refusals.EmployeePerformanceFeedbackNotDraft.code; }
export class EmployeePromotionNotDraft extends Schema.TaggedError<EmployeePromotionNotDraft>()("EmployeePromotionNotDraft", { code: Schema.Literal(refusals.EmployeePromotionNotDraft.code), ...{ state: Schema.Literals(["draft", "submitted", "cancelled"]) } }, { httpApiStatus: refusals.EmployeePromotionNotDraft.status }) { static readonly code = refusals.EmployeePromotionNotDraft.code; }
export class EmployeeSeparationNotPending extends Schema.TaggedError<EmployeeSeparationNotPending>()("EmployeeSeparationNotPending", { code: Schema.Literal(refusals.EmployeeSeparationNotPending.code), ...{ state: Schema.Literals(["pending", "inProcess", "completed"]) } }, { httpApiStatus: refusals.EmployeeSeparationNotPending.status }) { static readonly code = refusals.EmployeeSeparationNotPending.code; }
export class EmployeeTransferNotDraft extends Schema.TaggedError<EmployeeTransferNotDraft>()("EmployeeTransferNotDraft", { code: Schema.Literal(refusals.EmployeeTransferNotDraft.code), ...{ state: Schema.Literals(["draft", "submitted", "cancelled"]) } }, { httpApiStatus: refusals.EmployeeTransferNotDraft.status }) { static readonly code = refusals.EmployeeTransferNotDraft.code; }
export class EmploymentTypeNotActive extends Schema.TaggedError<EmploymentTypeNotActive>()("EmploymentTypeNotActive", { code: Schema.Literal(refusals.EmploymentTypeNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.EmploymentTypeNotActive.status }) { static readonly code = refusals.EmploymentTypeNotActive.code; }
export class ExpenseNotActive extends Schema.TaggedError<ExpenseNotActive>()("ExpenseNotActive", { code: Schema.Literal(refusals.ExpenseNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.ExpenseNotActive.status }) { static readonly code = refusals.ExpenseNotActive.code; }
export class ExpenseClaimNotDraft extends Schema.TaggedError<ExpenseClaimNotDraft>()("ExpenseClaimNotDraft", { code: Schema.Literal(refusals.ExpenseClaimNotDraft.code), ...{ state: Schema.Literals(["draft", "approved", "rejected"]) } }, { httpApiStatus: refusals.ExpenseClaimNotDraft.status }) { static readonly code = refusals.ExpenseClaimNotDraft.code; }
export class ExpenseClaimTypeNotActive extends Schema.TaggedError<ExpenseClaimTypeNotActive>()("ExpenseClaimTypeNotActive", { code: Schema.Literal(refusals.ExpenseClaimTypeNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.ExpenseClaimTypeNotActive.status }) { static readonly code = refusals.ExpenseClaimTypeNotActive.code; }
export class FiscalYearNotActive extends Schema.TaggedError<FiscalYearNotActive>()("FiscalYearNotActive", { code: Schema.Literal(refusals.FiscalYearNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.FiscalYearNotActive.status }) { static readonly code = refusals.FiscalYearNotActive.code; }
export class GoalNotPending extends Schema.TaggedError<GoalNotPending>()("GoalNotPending", { code: Schema.Literal(refusals.GoalNotPending.code), ...{ state: Schema.Literals(["pending", "inProgress", "completed", "archived", "closed"]) } }, { httpApiStatus: refusals.GoalNotPending.status }) { static readonly code = refusals.GoalNotPending.code; }
export class HolidayNotActive extends Schema.TaggedError<HolidayNotActive>()("HolidayNotActive", { code: Schema.Literal(refusals.HolidayNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.HolidayNotActive.status }) { static readonly code = refusals.HolidayNotActive.code; }
export class HolidayListNotActive extends Schema.TaggedError<HolidayListNotActive>()("HolidayListNotActive", { code: Schema.Literal(refusals.HolidayListNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.HolidayListNotActive.status }) { static readonly code = refusals.HolidayListNotActive.code; }
export class InterviewNotPending extends Schema.TaggedError<InterviewNotPending>()("InterviewNotPending", { code: Schema.Literal(refusals.InterviewNotPending.code), ...{ state: Schema.Literals(["pending", "cleared", "rejected"]) } }, { httpApiStatus: refusals.InterviewNotPending.status }) { static readonly code = refusals.InterviewNotPending.code; }
export class InterviewFeedbackNotGiven extends Schema.TaggedError<InterviewFeedbackNotGiven>()("InterviewFeedbackNotGiven", { code: Schema.Literal(refusals.InterviewFeedbackNotGiven.code), ...{ state: Schema.Literals(["given"]) } }, { httpApiStatus: refusals.InterviewFeedbackNotGiven.status }) { static readonly code = refusals.InterviewFeedbackNotGiven.code; }
export class InterviewRoundNotActive extends Schema.TaggedError<InterviewRoundNotActive>()("InterviewRoundNotActive", { code: Schema.Literal(refusals.InterviewRoundNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.InterviewRoundNotActive.status }) { static readonly code = refusals.InterviewRoundNotActive.code; }
export class JobApplicantNotOpen extends Schema.TaggedError<JobApplicantNotOpen>()("JobApplicantNotOpen", { code: Schema.Literal(refusals.JobApplicantNotOpen.code), ...{ state: Schema.Literals(["open", "hold", "rejected", "accepted"]) } }, { httpApiStatus: refusals.JobApplicantNotOpen.status }) { static readonly code = refusals.JobApplicantNotOpen.code; }
export class JobOfferNotAwaiting extends Schema.TaggedError<JobOfferNotAwaiting>()("JobOfferNotAwaiting", { code: Schema.Literal(refusals.JobOfferNotAwaiting.code), ...{ state: Schema.Literals(["awaiting", "accepted", "rejected"]) } }, { httpApiStatus: refusals.JobOfferNotAwaiting.status }) { static readonly code = refusals.JobOfferNotAwaiting.code; }
export class JobOpeningNotOpen extends Schema.TaggedError<JobOpeningNotOpen>()("JobOpeningNotOpen", { code: Schema.Literal(refusals.JobOpeningNotOpen.code), ...{ state: Schema.Literals(["open", "closed"]) } }, { httpApiStatus: refusals.JobOpeningNotOpen.status }) { static readonly code = refusals.JobOpeningNotOpen.code; }
export class JournalEntryNotDraft extends Schema.TaggedError<JournalEntryNotDraft>()("JournalEntryNotDraft", { code: Schema.Literal(refusals.JournalEntryNotDraft.code), ...{ state: Schema.Literals(["draft", "submitted", "cancelled"]) } }, { httpApiStatus: refusals.JournalEntryNotDraft.status }) { static readonly code = refusals.JournalEntryNotDraft.code; }
export class KraNotActive extends Schema.TaggedError<KraNotActive>()("KraNotActive", { code: Schema.Literal(refusals.KraNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.KraNotActive.status }) { static readonly code = refusals.KraNotActive.code; }
export class LeaveAllocationNotDraft extends Schema.TaggedError<LeaveAllocationNotDraft>()("LeaveAllocationNotDraft", { code: Schema.Literal(refusals.LeaveAllocationNotDraft.code), ...{ state: Schema.Literals(["draft", "submitted"]) } }, { httpApiStatus: refusals.LeaveAllocationNotDraft.status }) { static readonly code = refusals.LeaveAllocationNotDraft.code; }
export class LeaveApplicationNotOpen extends Schema.TaggedError<LeaveApplicationNotOpen>()("LeaveApplicationNotOpen", { code: Schema.Literal(refusals.LeaveApplicationNotOpen.code), ...{ state: Schema.Literals(["open", "approved", "rejected", "cancelled"]) } }, { httpApiStatus: refusals.LeaveApplicationNotOpen.status }) { static readonly code = refusals.LeaveApplicationNotOpen.code; }
export class LeaveTypeNotActive extends Schema.TaggedError<LeaveTypeNotActive>()("LeaveTypeNotActive", { code: Schema.Literal(refusals.LeaveTypeNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.LeaveTypeNotActive.status }) { static readonly code = refusals.LeaveTypeNotActive.code; }
export class PayrollEntryNotDraft extends Schema.TaggedError<PayrollEntryNotDraft>()("PayrollEntryNotDraft", { code: Schema.Literal(refusals.PayrollEntryNotDraft.code), ...{ state: Schema.Literals(["draft", "submitted", "accrued"]) } }, { httpApiStatus: refusals.PayrollEntryNotDraft.status }) { static readonly code = refusals.PayrollEntryNotDraft.code; }
export class PayrollPeriodNotActive extends Schema.TaggedError<PayrollPeriodNotActive>()("PayrollPeriodNotActive", { code: Schema.Literal(refusals.PayrollPeriodNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.PayrollPeriodNotActive.status }) { static readonly code = refusals.PayrollPeriodNotActive.code; }
export class SafeNotCounterfactual extends Schema.TaggedError<SafeNotCounterfactual>()("SafeNotCounterfactual", { code: Schema.Literal(refusals.SafeNotCounterfactual.code), ...{ state: Schema.Literals(["counterfactual"]) } }, { httpApiStatus: refusals.SafeNotCounterfactual.status }) { static readonly code = refusals.SafeNotCounterfactual.code; }
export class SalaryComponentNotActive extends Schema.TaggedError<SalaryComponentNotActive>()("SalaryComponentNotActive", { code: Schema.Literal(refusals.SalaryComponentNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.SalaryComponentNotActive.status }) { static readonly code = refusals.SalaryComponentNotActive.code; }
export class SalaryStructureNotDraft extends Schema.TaggedError<SalaryStructureNotDraft>()("SalaryStructureNotDraft", { code: Schema.Literal(refusals.SalaryStructureNotDraft.code), ...{ state: Schema.Literals(["draft", "submitted", "cancelled"]) } }, { httpApiStatus: refusals.SalaryStructureNotDraft.status }) { static readonly code = refusals.SalaryStructureNotDraft.code; }
export class SalaryStructureAssignmentNotDraft extends Schema.TaggedError<SalaryStructureAssignmentNotDraft>()("SalaryStructureAssignmentNotDraft", { code: Schema.Literal(refusals.SalaryStructureAssignmentNotDraft.code), ...{ state: Schema.Literals(["draft", "submitted", "cancelled"]) } }, { httpApiStatus: refusals.SalaryStructureAssignmentNotDraft.status }) { static readonly code = refusals.SalaryStructureAssignmentNotDraft.code; }
export class ShiftTypeNotActive extends Schema.TaggedError<ShiftTypeNotActive>()("ShiftTypeNotActive", { code: Schema.Literal(refusals.ShiftTypeNotActive.code), ...{ state: Schema.Literals(["active"]) } }, { httpApiStatus: refusals.ShiftTypeNotActive.status }) { static readonly code = refusals.ShiftTypeNotActive.code; }
export class AccountNotFound extends Schema.TaggedError<AccountNotFound>()("AccountNotFound", { code: Schema.Literal(refusals.AccountNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.AccountNotFound.status }) { static readonly code = refusals.AccountNotFound.code; }
export class AppraisalNotFound extends Schema.TaggedError<AppraisalNotFound>()("AppraisalNotFound", { code: Schema.Literal(refusals.AppraisalNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.AppraisalNotFound.status }) { static readonly code = refusals.AppraisalNotFound.code; }
export class AppraisalCycleNotFound extends Schema.TaggedError<AppraisalCycleNotFound>()("AppraisalCycleNotFound", { code: Schema.Literal(refusals.AppraisalCycleNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.AppraisalCycleNotFound.status }) { static readonly code = refusals.AppraisalCycleNotFound.code; }
export class AppraisalTemplateNotFound extends Schema.TaggedError<AppraisalTemplateNotFound>()("AppraisalTemplateNotFound", { code: Schema.Literal(refusals.AppraisalTemplateNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.AppraisalTemplateNotFound.status }) { static readonly code = refusals.AppraisalTemplateNotFound.code; }
export class BankAccountNotFound extends Schema.TaggedError<BankAccountNotFound>()("BankAccountNotFound", { code: Schema.Literal(refusals.BankAccountNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.BankAccountNotFound.status }) { static readonly code = refusals.BankAccountNotFound.code; }
export class BankTransactionNotFound extends Schema.TaggedError<BankTransactionNotFound>()("BankTransactionNotFound", { code: Schema.Literal(refusals.BankTransactionNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.BankTransactionNotFound.status }) { static readonly code = refusals.BankTransactionNotFound.code; }
export class BridgeBusinessNotFound extends Schema.TaggedError<BridgeBusinessNotFound>()("BridgeBusinessNotFound", { code: Schema.Literal(refusals.BridgeBusinessNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.BridgeBusinessNotFound.status }) { static readonly code = refusals.BridgeBusinessNotFound.code; }
export class BridgeIndividualNotFound extends Schema.TaggedError<BridgeIndividualNotFound>()("BridgeIndividualNotFound", { code: Schema.Literal(refusals.BridgeIndividualNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.BridgeIndividualNotFound.status }) { static readonly code = refusals.BridgeIndividualNotFound.code; }
export class CompanyNotFound extends Schema.TaggedError<CompanyNotFound>()("CompanyNotFound", { code: Schema.Literal(refusals.CompanyNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.CompanyNotFound.status }) { static readonly code = refusals.CompanyNotFound.code; }
export class CostCenterNotFound extends Schema.TaggedError<CostCenterNotFound>()("CostCenterNotFound", { code: Schema.Literal(refusals.CostCenterNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.CostCenterNotFound.status }) { static readonly code = refusals.CostCenterNotFound.code; }
export class DepartmentNotFound extends Schema.TaggedError<DepartmentNotFound>()("DepartmentNotFound", { code: Schema.Literal(refusals.DepartmentNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.DepartmentNotFound.status }) { static readonly code = refusals.DepartmentNotFound.code; }
export class DesignationNotFound extends Schema.TaggedError<DesignationNotFound>()("DesignationNotFound", { code: Schema.Literal(refusals.DesignationNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.DesignationNotFound.status }) { static readonly code = refusals.DesignationNotFound.code; }
export class EmployeeNotFound extends Schema.TaggedError<EmployeeNotFound>()("EmployeeNotFound", { code: Schema.Literal(refusals.EmployeeNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.EmployeeNotFound.status }) { static readonly code = refusals.EmployeeNotFound.code; }
export class ExpenseClaimTypeNotFound extends Schema.TaggedError<ExpenseClaimTypeNotFound>()("ExpenseClaimTypeNotFound", { code: Schema.Literal(refusals.ExpenseClaimTypeNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.ExpenseClaimTypeNotFound.status }) { static readonly code = refusals.ExpenseClaimTypeNotFound.code; }
export class InterviewNotFound extends Schema.TaggedError<InterviewNotFound>()("InterviewNotFound", { code: Schema.Literal(refusals.InterviewNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.InterviewNotFound.status }) { static readonly code = refusals.InterviewNotFound.code; }
export class InterviewRoundNotFound extends Schema.TaggedError<InterviewRoundNotFound>()("InterviewRoundNotFound", { code: Schema.Literal(refusals.InterviewRoundNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.InterviewRoundNotFound.status }) { static readonly code = refusals.InterviewRoundNotFound.code; }
export class KraNotFound extends Schema.TaggedError<KraNotFound>()("KraNotFound", { code: Schema.Literal(refusals.KraNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.KraNotFound.status }) { static readonly code = refusals.KraNotFound.code; }
export class LeaveTypeNotFound extends Schema.TaggedError<LeaveTypeNotFound>()("LeaveTypeNotFound", { code: Schema.Literal(refusals.LeaveTypeNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.LeaveTypeNotFound.status }) { static readonly code = refusals.LeaveTypeNotFound.code; }
export class SalaryStructureNotFound extends Schema.TaggedError<SalaryStructureNotFound>()("SalaryStructureNotFound", { code: Schema.Literal(refusals.SalaryStructureNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.SalaryStructureNotFound.status }) { static readonly code = refusals.SalaryStructureNotFound.code; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal(refusals.NotAllowed.code), ...{} }, { httpApiStatus: refusals.NotAllowed.status }) { static readonly code = refusals.NotAllowed.code; }
export class IdempotencyConflict extends Schema.TaggedError<IdempotencyConflict>()("IdempotencyConflict", { code: Schema.Literal(refusals.IdempotencyConflict.code), ...{} }, { httpApiStatus: refusals.IdempotencyConflict.status }) { static readonly code = refusals.IdempotencyConflict.code; }

/** Each refusal's exit code, for the CLI: read from `refusals`. */
export const exits = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.exit])) as { readonly [K in Refusal]: (typeof refusals)[K]["exit"] };

/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. Read from `refusals`. */
export const codes = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.code])) as { readonly [K in Refusal]: (typeof refusals)[K]["code"] };

/** The declared errors themselves, by name: their fields say who may see a value (the visibility rule cuts a refusal by them). */
export const declared = {
  ParentAccountNotInCompany: Account.ParentAccountNotInCompany,
  ParentAccountIsLedger: Account.ParentAccountIsLedger,
  RootAccountIsLedger: Account.RootAccountIsLedger,
  RootTypeMissing: Account.RootTypeMissing,
  RootTypeNotParents: Account.RootTypeNotParents,
  AccountHasChildren: Account.AccountHasChildren,
  AccountNameTaken: Account.AccountNameTaken,
  AppraisedEmployeeNotInCompany: Appraisal.AppraisedEmployeeNotInCompany,
  AppraisedEmployeeHasLeft: Appraisal.AppraisedEmployeeHasLeft,
  AppraisalCycleCompleted: Appraisal.AppraisalCycleCompleted,
  AppraisalTemplateNotInCompany: Appraisal.AppraisalTemplateNotInCompany,
  AppraisalAlreadyExists: Appraisal.AppraisalAlreadyExists,
  NotRatedManually: Appraisal.NotRatedManually,
  ScoresDontMatchKras: Appraisal.ScoresDontMatchKras,
  KraScoreOutOfRange: Appraisal.KraScoreOutOfRange,
  SelfRatingsDontMatchCriteria: Appraisal.SelfRatingsDontMatchCriteria,
  SelfRatingOutOfRange: Appraisal.SelfRatingOutOfRange,
  CycleEndsBeforeStart: AppraisalCycle.CycleEndsBeforeStart,
  AppraiseeNotInCompany: AppraisalCycle.AppraiseeNotInCompany,
  AppraiseeHasLeft: AppraisalCycle.AppraiseeHasLeft,
  AppraiseeTemplateNotInCompany: AppraisalCycle.AppraiseeTemplateNotInCompany,
  AppraiseeListedTwice: AppraisalCycle.AppraiseeListedTwice,
  CycleWithoutAppraisees: AppraisalCycle.CycleWithoutAppraisees,
  AppraisalsNotSubmitted: AppraisalCycle.AppraisalsNotSubmitted,
  CycleNameTaken: AppraisalCycle.CycleNameTaken,
  TemplateWithoutKras: AppraisalTemplate.TemplateWithoutKras,
  TemplateKraNotInCompany: AppraisalTemplate.TemplateKraNotInCompany,
  TemplateCriteriaNotInCompany: AppraisalTemplate.TemplateCriteriaNotInCompany,
  TemplateLineRepeated: AppraisalTemplate.TemplateLineRepeated,
  TemplateWeightageOutOfRange: AppraisalTemplate.TemplateWeightageOutOfRange,
  KraWeightageNotHundred: AppraisalTemplate.KraWeightageNotHundred,
  CriteriaWeightageNotHundred: AppraisalTemplate.CriteriaWeightageNotHundred,
  TemplateTitleTaken: AppraisalTemplate.TemplateTitleTaken,
  AttendeeNotInCompany: Attendance.AttendeeNotInCompany,
  AttendeeHasLeft: Attendance.AttendeeHasLeft,
  AttendanceBeforeJoining: Attendance.AttendanceBeforeJoining,
  AttendanceAlreadyMarked: Attendance.AttendanceAlreadyMarked,
  AttendanceOnLeave: Attendance.AttendanceOnLeave,
  RequesterNotInCompany: AttendanceRequest.RequesterNotInCompany,
  RequesterHasLeft: AttendanceRequest.RequesterHasLeft,
  RequestEndsBeforeStart: AttendanceRequest.RequestEndsBeforeStart,
  RequestBeforeJoining: AttendanceRequest.RequestBeforeJoining,
  AttendanceRequestOverlaps: AttendanceRequest.AttendanceRequestOverlaps,
  KybNotApproved: BankAccount.KybNotApproved,
  BankAccountNameTaken: BankAccount.BankAccountNameTaken,
  AccountClosed: BankTransaction.AccountClosed,
  CurrencyNotHeld: BankTransaction.CurrencyNotHeld,
  NothingToSend: BankTransaction.NothingToSend,
  AlreadyRecorded: BankTransaction.AlreadyRecorded,
  BranchNameTaken: Branch.BranchNameTaken,
  KybAlreadyStarted: BridgeBusiness.KybAlreadyStarted,
  KycAlreadyStarted: BridgeIndividual.KycAlreadyStarted,
  CompanyNameTaken: Company.CompanyNameTaken,
  CompanyAbbrTaken: Company.CompanyAbbrTaken,
  ParentCostCenterNotInCompany: CostCenter.ParentCostCenterNotInCompany,
  ParentCostCenterIsLedger: CostCenter.ParentCostCenterIsLedger,
  RootCostCenterIsLedger: CostCenter.RootCostCenterIsLedger,
  CostCenterNameTaken: CostCenter.CostCenterNameTaken,
  DepartmentNameTaken: Department.DepartmentNameTaken,
  DesignationNameTaken: Designation.DesignationNameTaken,
  EmployeeAlreadyHired: Employee.EmployeeAlreadyHired,
  DepartmentNotInCompany: Employee.DepartmentNotInCompany,
  DesignationNotInCompany: Employee.DesignationNotInCompany,
  JoinedBeforeBorn: Employee.JoinedBeforeBorn,
  RelievedBeforeJoined: Employee.RelievedBeforeJoined,
  CriteriaNameTaken: EmployeeFeedbackCriteria.CriteriaNameTaken,
  EmployeeGradeNameTaken: EmployeeGrade.EmployeeGradeNameTaken,
  FeedbackCycleCompleted: EmployeePerformanceFeedback.FeedbackCycleCompleted,
  FeedbackForOneself: EmployeePerformanceFeedback.FeedbackForOneself,
  ReviewerNotInCompany: EmployeePerformanceFeedback.ReviewerNotInCompany,
  ReviewerHasLeft: EmployeePerformanceFeedback.ReviewerHasLeft,
  FeedbackRatingsDontMatchCriteria: EmployeePerformanceFeedback.FeedbackRatingsDontMatchCriteria,
  FeedbackRatingOutOfRange: EmployeePerformanceFeedback.FeedbackRatingOutOfRange,
  PromotedEmployeeNotInCompany: EmployeePromotion.PromotedEmployeeNotInCompany,
  PromotedEmployeeHasLeft: EmployeePromotion.PromotedEmployeeHasLeft,
  NewDesignationNotInCompany: EmployeePromotion.NewDesignationNotInCompany,
  DesignationUnchanged: EmployeePromotion.DesignationUnchanged,
  PromotionNotYetDue: EmployeePromotion.PromotionNotYetDue,
  SeparatedEmployeeNotInCompany: EmployeeSeparation.SeparatedEmployeeNotInCompany,
  SeparationAlreadyOpen: EmployeeSeparation.SeparationAlreadyOpen,
  TransferredEmployeeNotInCompany: EmployeeTransfer.TransferredEmployeeNotInCompany,
  TransferredEmployeeHasLeft: EmployeeTransfer.TransferredEmployeeHasLeft,
  NewDepartmentNotInCompany: EmployeeTransfer.NewDepartmentNotInCompany,
  DepartmentUnchanged: EmployeeTransfer.DepartmentUnchanged,
  TransferNotYetDue: EmployeeTransfer.TransferNotYetDue,
  EmploymentTypeNameTaken: EmploymentType.EmploymentTypeNameTaken,
  SanctionedOverClaimed: Expense.SanctionedOverClaimed,
  ExpenseTypeNotInCompany: Expense.ExpenseTypeNotInCompany,
  ClaimNotDraft: Expense.ClaimNotDraft,
  ClaimantNotActive: ExpenseClaim.ClaimantNotActive,
  EmployeeNotInCompany: ExpenseClaim.EmployeeNotInCompany,
  ClaimHasNoExpenses: ExpenseClaim.ClaimHasNoExpenses,
  ExpenseTypeTaken: ExpenseClaimType.ExpenseTypeTaken,
  FiscalYearEndsBeforeStart: FiscalYear.FiscalYearEndsBeforeStart,
  FiscalYearWrongLength: FiscalYear.FiscalYearWrongLength,
  FiscalYearOverlaps: FiscalYear.FiscalYearOverlaps,
  FiscalYearNameTaken: FiscalYear.FiscalYearNameTaken,
  GoalCycleCompleted: Goal.GoalCycleCompleted,
  GoalEmployeeNotInCompany: Goal.GoalEmployeeNotInCompany,
  GoalOwnerHasLeft: Goal.GoalOwnerHasLeft,
  GoalKraNotInAppraisal: Goal.GoalKraNotInAppraisal,
  ParentGoalMismatch: Goal.ParentGoalMismatch,
  ProgressOutOfRange: Goal.ProgressOutOfRange,
  GoalIsGroup: Goal.GoalIsGroup,
  GoalNotGroup: Goal.GoalNotGroup,
  ParentGoalNotGroup: Goal.ParentGoalNotGroup,
  HolidayDateTaken: Holiday.HolidayDateTaken,
  HolidayOutsideList: Holiday.HolidayOutsideList,
  HolidayListNameTaken: HolidayList.HolidayListNameTaken,
  HolidayListEndsBeforeStart: HolidayList.HolidayListEndsBeforeStart,
  ApplicantRejected: Interview.ApplicantRejected,
  RoundNotInCompany: Interview.RoundNotInCompany,
  InterviewEndsBeforeStart: Interview.InterviewEndsBeforeStart,
  InterviewerNotInCompany: Interview.InterviewerNotInCompany,
  InterviewerHasLeft: Interview.InterviewerHasLeft,
  InterviewAlreadyScheduled: Interview.InterviewAlreadyScheduled,
  FeedbackGiverNotInterviewer: InterviewFeedback.FeedbackGiverNotInterviewer,
  FeedbackBeforeInterview: InterviewFeedback.FeedbackBeforeInterview,
  FeedbackAlreadyGiven: InterviewFeedback.FeedbackAlreadyGiven,
  RoundNameTaken: InterviewRound.RoundNameTaken,
  RoundInterviewerNotInCompany: InterviewRound.RoundInterviewerNotInCompany,
  RoundInterviewerHasLeft: InterviewRound.RoundInterviewerHasLeft,
  OpeningClosed: JobApplicant.OpeningClosed,
  OfferNotAccepted: JobApplicant.OfferNotAccepted,
  OfferDesignationNotInCompany: JobOffer.OfferDesignationNotInCompany,
  OfferAlreadyMade: JobOffer.OfferAlreadyMade,
  OpeningWithoutVacancies: JobOpening.OpeningWithoutVacancies,
  JournalEntryTooFewLines: JournalEntry.JournalEntryTooFewLines,
  LineAccountNotInCompany: JournalEntry.LineAccountNotInCompany,
  LineAccountIsGroup: JournalEntry.LineAccountIsGroup,
  LineCostCenterNotInCompany: JournalEntry.LineCostCenterNotInCompany,
  LineCostCenterIsGroup: JournalEntry.LineCostCenterIsGroup,
  LineWithoutAmount: JournalEntry.LineWithoutAmount,
  LineDebitAndCredit: JournalEntry.LineDebitAndCredit,
  JournalEntryUnbalanced: JournalEntry.JournalEntryUnbalanced,
  PostingDateOutsideFiscalYear: JournalEntry.PostingDateOutsideFiscalYear,
  KraTitleTaken: Kra.KraTitleTaken,
  AllocateeNotInCompany: LeaveAllocation.AllocateeNotInCompany,
  AllocateeHasLeft: LeaveAllocation.AllocateeHasLeft,
  AllocationTypeNotInCompany: LeaveAllocation.AllocationTypeNotInCompany,
  AllocationEndsBeforeStart: LeaveAllocation.AllocationEndsBeforeStart,
  AllocationOverlaps: LeaveAllocation.AllocationOverlaps,
  LeaveWithoutPayNotAllocated: LeaveAllocation.LeaveWithoutPayNotAllocated,
  NoLeavesAllocated: LeaveAllocation.NoLeavesAllocated,
  AllocationExceedsPeriod: LeaveAllocation.AllocationExceedsPeriod,
  ApplicantNotInCompany: LeaveApplication.ApplicantNotInCompany,
  ApplicantHasLeft: LeaveApplication.ApplicantHasLeft,
  ApplicationTypeNotInCompany: LeaveApplication.ApplicationTypeNotInCompany,
  LeaveEndsBeforeStart: LeaveApplication.LeaveEndsBeforeStart,
  LeaveBeforeJoining: LeaveApplication.LeaveBeforeJoining,
  NoAllocationCovers: LeaveApplication.NoAllocationCovers,
  LeaveAllHolidays: LeaveApplication.LeaveAllHolidays,
  InsufficientLeaveBalance: LeaveApplication.InsufficientLeaveBalance,
  LeaveOverlaps: LeaveApplication.LeaveOverlaps,
  LeaveTooLong: LeaveApplication.LeaveTooLong,
  LeaveDayAttended: LeaveApplication.LeaveDayAttended,
  LeaveTypeNameTaken: LeaveType.LeaveTypeNameTaken,
  PayrollEndsBeforeStart: PayrollEntry.PayrollEndsBeforeStart,
  PayableAccountNotInCompany: PayrollEntry.PayableAccountNotInCompany,
  PayableAccountIsGroup: PayrollEntry.PayableAccountIsGroup,
  PayableAccountHasType: PayrollEntry.PayableAccountHasType,
  PayrollCostCenterNotInCompany: PayrollEntry.PayrollCostCenterNotInCompany,
  PayrollCostCenterIsGroup: PayrollEntry.PayrollCostCenterIsGroup,
  NoEmployeesFound: PayrollEntry.NoEmployeesFound,
  SalarySlipExists: PayrollEntry.SalarySlipExists,
  NoAssignmentAtStart: PayrollEntry.NoAssignmentAtStart,
  AccrualOutsideFiscalYear: PayrollEntry.AccrualOutsideFiscalYear,
  PayrollPeriodEndsBeforeStart: PayrollPeriod.PayrollPeriodEndsBeforeStart,
  PayrollPeriodOverlaps: PayrollPeriod.PayrollPeriodOverlaps,
  PayrollPeriodNameTaken: PayrollPeriod.PayrollPeriodNameTaken,
  SafeAlreadyRecorded: Safe.SafeAlreadyRecorded,
  FounderHasNoSafe: Safe.FounderHasNoSafe,
  ComponentAccountNotInCompany: SalaryComponent.ComponentAccountNotInCompany,
  ComponentAccountIsGroup: SalaryComponent.ComponentAccountIsGroup,
  SalaryComponentTaken: SalaryComponent.SalaryComponentTaken,
  StructureWithoutEarnings: SalaryStructure.StructureWithoutEarnings,
  StructureComponentNotInCompany: SalaryStructure.StructureComponentNotInCompany,
  StructureComponentWrongType: SalaryStructure.StructureComponentWrongType,
  StructureLineWithoutAmount: SalaryStructure.StructureLineWithoutAmount,
  StructureComponentRepeated: SalaryStructure.StructureComponentRepeated,
  StructureNetPayNegative: SalaryStructure.StructureNetPayNegative,
  StructureInUse: SalaryStructure.StructureInUse,
  SalaryStructureNameTaken: SalaryStructure.SalaryStructureNameTaken,
  AssignedEmployeeNotInCompany: SalaryStructureAssignment.AssignedEmployeeNotInCompany,
  AssignedEmployeeHasLeft: SalaryStructureAssignment.AssignedEmployeeHasLeft,
  AssignmentExists: SalaryStructureAssignment.AssignmentExists,
  AssignmentBeforeJoining: SalaryStructureAssignment.AssignmentBeforeJoining,
  AssignedStructureNotInCompany: SalaryStructureAssignment.AssignedStructureNotInCompany,
  AssignedStructureNotSubmitted: SalaryStructureAssignment.AssignedStructureNotSubmitted,
  ShiftTypeNameTaken: ShiftType.ShiftTypeNameTaken,
  ShiftStartsWhenItEnds: ShiftType.ShiftStartsWhenItEnds,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { ParentAccountNotInCompany, ParentAccountIsLedger, RootAccountIsLedger, RootTypeMissing, RootTypeNotParents, AccountHasChildren, AccountNameTaken, AppraisedEmployeeNotInCompany, AppraisedEmployeeHasLeft, AppraisalCycleCompleted, AppraisalTemplateNotInCompany, AppraisalAlreadyExists, NotRatedManually, ScoresDontMatchKras, KraScoreOutOfRange, SelfRatingsDontMatchCriteria, SelfRatingOutOfRange, CycleEndsBeforeStart, AppraiseeNotInCompany, AppraiseeHasLeft, AppraiseeTemplateNotInCompany, AppraiseeListedTwice, CycleWithoutAppraisees, AppraisalsNotSubmitted, CycleNameTaken, TemplateWithoutKras, TemplateKraNotInCompany, TemplateCriteriaNotInCompany, TemplateLineRepeated, TemplateWeightageOutOfRange, KraWeightageNotHundred, CriteriaWeightageNotHundred, TemplateTitleTaken, AttendeeNotInCompany, AttendeeHasLeft, AttendanceBeforeJoining, AttendanceAlreadyMarked, AttendanceOnLeave, RequesterNotInCompany, RequesterHasLeft, RequestEndsBeforeStart, RequestBeforeJoining, AttendanceRequestOverlaps, KybNotApproved, BankAccountNameTaken, AccountClosed, CurrencyNotHeld, NothingToSend, AlreadyRecorded, BranchNameTaken, KybAlreadyStarted, KycAlreadyStarted, CompanyNameTaken, CompanyAbbrTaken, ParentCostCenterNotInCompany, ParentCostCenterIsLedger, RootCostCenterIsLedger, CostCenterNameTaken, DepartmentNameTaken, DesignationNameTaken, EmployeeAlreadyHired, DepartmentNotInCompany, DesignationNotInCompany, JoinedBeforeBorn, RelievedBeforeJoined, CriteriaNameTaken, EmployeeGradeNameTaken, FeedbackCycleCompleted, FeedbackForOneself, ReviewerNotInCompany, ReviewerHasLeft, FeedbackRatingsDontMatchCriteria, FeedbackRatingOutOfRange, PromotedEmployeeNotInCompany, PromotedEmployeeHasLeft, NewDesignationNotInCompany, DesignationUnchanged, PromotionNotYetDue, SeparatedEmployeeNotInCompany, SeparationAlreadyOpen, TransferredEmployeeNotInCompany, TransferredEmployeeHasLeft, NewDepartmentNotInCompany, DepartmentUnchanged, TransferNotYetDue, EmploymentTypeNameTaken, SanctionedOverClaimed, ExpenseTypeNotInCompany, ClaimNotDraft, ClaimantNotActive, EmployeeNotInCompany, ClaimHasNoExpenses, ExpenseTypeTaken, FiscalYearEndsBeforeStart, FiscalYearWrongLength, FiscalYearOverlaps, FiscalYearNameTaken, GoalCycleCompleted, GoalEmployeeNotInCompany, GoalOwnerHasLeft, GoalKraNotInAppraisal, ParentGoalMismatch, ProgressOutOfRange, GoalIsGroup, GoalNotGroup, ParentGoalNotGroup, HolidayDateTaken, HolidayOutsideList, HolidayListNameTaken, HolidayListEndsBeforeStart, ApplicantRejected, RoundNotInCompany, InterviewEndsBeforeStart, InterviewerNotInCompany, InterviewerHasLeft, InterviewAlreadyScheduled, FeedbackGiverNotInterviewer, FeedbackBeforeInterview, FeedbackAlreadyGiven, RoundNameTaken, RoundInterviewerNotInCompany, RoundInterviewerHasLeft, OpeningClosed, OfferNotAccepted, OfferDesignationNotInCompany, OfferAlreadyMade, OpeningWithoutVacancies, JournalEntryTooFewLines, LineAccountNotInCompany, LineAccountIsGroup, LineCostCenterNotInCompany, LineCostCenterIsGroup, LineWithoutAmount, LineDebitAndCredit, JournalEntryUnbalanced, PostingDateOutsideFiscalYear, KraTitleTaken, AllocateeNotInCompany, AllocateeHasLeft, AllocationTypeNotInCompany, AllocationEndsBeforeStart, AllocationOverlaps, LeaveWithoutPayNotAllocated, NoLeavesAllocated, AllocationExceedsPeriod, ApplicantNotInCompany, ApplicantHasLeft, ApplicationTypeNotInCompany, LeaveEndsBeforeStart, LeaveBeforeJoining, NoAllocationCovers, LeaveAllHolidays, InsufficientLeaveBalance, LeaveOverlaps, LeaveTooLong, LeaveDayAttended, LeaveTypeNameTaken, PayrollEndsBeforeStart, PayableAccountNotInCompany, PayableAccountIsGroup, PayableAccountHasType, PayrollCostCenterNotInCompany, PayrollCostCenterIsGroup, NoEmployeesFound, SalarySlipExists, NoAssignmentAtStart, AccrualOutsideFiscalYear, PayrollPeriodEndsBeforeStart, PayrollPeriodOverlaps, PayrollPeriodNameTaken, SafeAlreadyRecorded, FounderHasNoSafe, ComponentAccountNotInCompany, ComponentAccountIsGroup, SalaryComponentTaken, StructureWithoutEarnings, StructureComponentNotInCompany, StructureComponentWrongType, StructureLineWithoutAmount, StructureComponentRepeated, StructureNetPayNegative, StructureInUse, SalaryStructureNameTaken, AssignedEmployeeNotInCompany, AssignedEmployeeHasLeft, AssignmentExists, AssignmentBeforeJoining, AssignedStructureNotInCompany, AssignedStructureNotSubmitted, ShiftTypeNameTaken, ShiftStartsWhenItEnds, AccountNotGroup, AppraisalNotDraft, AppraisalCycleNotNotStarted, AppraisalTemplateNotActive, AttendanceNotMarked, AttendanceRequestNotDraft, BankAccountNotOpen, BankTransactionNotPending, BranchNotActive, BridgeBusinessNotStarted, BridgeIndividualNotStarted, CompanyNotActive, CostCenterNotGroup, DepartmentNotActive, DesignationNotActive, EmployeeNotActive, EmployeeFeedbackCriteriaNotActive, EmployeeGradeNotActive, EmployeePerformanceFeedbackNotDraft, EmployeePromotionNotDraft, EmployeeSeparationNotPending, EmployeeTransferNotDraft, EmploymentTypeNotActive, ExpenseNotActive, ExpenseClaimNotDraft, ExpenseClaimTypeNotActive, FiscalYearNotActive, GoalNotPending, HolidayNotActive, HolidayListNotActive, InterviewNotPending, InterviewFeedbackNotGiven, InterviewRoundNotActive, JobApplicantNotOpen, JobOfferNotAwaiting, JobOpeningNotOpen, JournalEntryNotDraft, KraNotActive, LeaveAllocationNotDraft, LeaveApplicationNotOpen, LeaveTypeNotActive, PayrollEntryNotDraft, PayrollPeriodNotActive, SafeNotCounterfactual, SalaryComponentNotActive, SalaryStructureNotDraft, SalaryStructureAssignmentNotDraft, ShiftTypeNotActive, AccountNotFound, AppraisalNotFound, AppraisalCycleNotFound, AppraisalTemplateNotFound, BankAccountNotFound, BankTransactionNotFound, BridgeBusinessNotFound, BridgeIndividualNotFound, CompanyNotFound, CostCenterNotFound, DepartmentNotFound, DesignationNotFound, EmployeeNotFound, ExpenseClaimTypeNotFound, InterviewNotFound, InterviewRoundNotFound, KraNotFound, LeaveTypeNotFound, SalaryStructureNotFound, NotAllowed, IdempotencyConflict };
