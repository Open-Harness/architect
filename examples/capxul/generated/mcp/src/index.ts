// Generated from the blueprint. Do not edit.
import type { McpEntry } from "@orthograph/language-effect";
import { declaration as attendanceGet } from "../../api/src/attendance/get.ts";
import { declaration as attendanceList } from "../../api/src/attendance/list.ts";
import { declaration as attendanceMark } from "../../api/src/attendance/mark.ts";
import { declaration as attendanceRequestApprove } from "../../api/src/attendance-request/approve.ts";
import { declaration as attendanceRequestCreate } from "../../api/src/attendance-request/create.ts";
import { declaration as attendanceRequestGet } from "../../api/src/attendance-request/get.ts";
import { declaration as attendanceRequestReject } from "../../api/src/attendance-request/reject.ts";
import { declaration as bankAccountClose } from "../../api/src/bank-account/close.ts";
import { declaration as bankAccountGet } from "../../api/src/bank-account/get.ts";
import { declaration as bankAccountOpen } from "../../api/src/bank-account/open.ts";
import { declaration as bankTransactionFail } from "../../api/src/bank-transaction/fail.ts";
import { declaration as bankTransactionGet } from "../../api/src/bank-transaction/get.ts";
import { declaration as bankTransactionLand } from "../../api/src/bank-transaction/land.ts";
import { declaration as bankTransactionList } from "../../api/src/bank-transaction/list.ts";
import { declaration as bankTransactionSend } from "../../api/src/bank-transaction/send.ts";
import { declaration as bankTransactionSettle } from "../../api/src/bank-transaction/settle.ts";
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
import { declaration as employeePromotionCancel } from "../../api/src/employee-promotion/cancel.ts";
import { declaration as employeePromotionCreate } from "../../api/src/employee-promotion/create.ts";
import { declaration as employeePromotionGet } from "../../api/src/employee-promotion/get.ts";
import { declaration as employeePromotionSubmit } from "../../api/src/employee-promotion/submit.ts";
import { declaration as employeeSeparationBegin } from "../../api/src/employee-separation/begin.ts";
import { declaration as employeeSeparationComplete } from "../../api/src/employee-separation/complete.ts";
import { declaration as employeeSeparationCreate } from "../../api/src/employee-separation/create.ts";
import { declaration as employeeSeparationGet } from "../../api/src/employee-separation/get.ts";
import { declaration as employeeTransferCancel } from "../../api/src/employee-transfer/cancel.ts";
import { declaration as employeeTransferCreate } from "../../api/src/employee-transfer/create.ts";
import { declaration as employeeTransferGet } from "../../api/src/employee-transfer/get.ts";
import { declaration as employeeTransferSubmit } from "../../api/src/employee-transfer/submit.ts";
import { declaration as employmentTypeCreate } from "../../api/src/employment-type/create.ts";
import { declaration as employmentTypeGet } from "../../api/src/employment-type/get.ts";
import { declaration as expenseAdd } from "../../api/src/expense/add.ts";
import { declaration as expenseGet } from "../../api/src/expense/get.ts";
import { declaration as expenseClaimApprove } from "../../api/src/expense-claim/approve.ts";
import { declaration as expenseClaimCreate } from "../../api/src/expense-claim/create.ts";
import { declaration as expenseClaimGet } from "../../api/src/expense-claim/get.ts";
import { declaration as expenseClaimReject } from "../../api/src/expense-claim/reject.ts";
import { declaration as expenseClaimTypeCreate } from "../../api/src/expense-claim-type/create.ts";
import { declaration as expenseClaimTypeGet } from "../../api/src/expense-claim-type/get.ts";
import { declaration as holidayAdd } from "../../api/src/holiday/add.ts";
import { declaration as holidayGet } from "../../api/src/holiday/get.ts";
import { declaration as holidayListAddWeeklyOff } from "../../api/src/holiday-list/add-weekly-off.ts";
import { declaration as holidayListCreate } from "../../api/src/holiday-list/create.ts";
import { declaration as holidayListGet } from "../../api/src/holiday-list/get.ts";
import { declaration as interviewClear } from "../../api/src/interview/clear.ts";
import { declaration as interviewCreate } from "../../api/src/interview/create.ts";
import { declaration as interviewGet } from "../../api/src/interview/get.ts";
import { declaration as interviewReject } from "../../api/src/interview/reject.ts";
import { declaration as interviewFeedbackGet } from "../../api/src/interview-feedback/get.ts";
import { declaration as interviewFeedbackGive } from "../../api/src/interview-feedback/give.ts";
import { declaration as interviewRoundCreate } from "../../api/src/interview-round/create.ts";
import { declaration as interviewRoundGet } from "../../api/src/interview-round/get.ts";
import { declaration as jobApplicantAccept } from "../../api/src/job-applicant/accept.ts";
import { declaration as jobApplicantCreate } from "../../api/src/job-applicant/create.ts";
import { declaration as jobApplicantGet } from "../../api/src/job-applicant/get.ts";
import { declaration as jobApplicantHold } from "../../api/src/job-applicant/hold.ts";
import { declaration as jobApplicantReject } from "../../api/src/job-applicant/reject.ts";
import { declaration as jobOfferAccept } from "../../api/src/job-offer/accept.ts";
import { declaration as jobOfferCreate } from "../../api/src/job-offer/create.ts";
import { declaration as jobOfferGet } from "../../api/src/job-offer/get.ts";
import { declaration as jobOfferReject } from "../../api/src/job-offer/reject.ts";
import { declaration as jobOpeningClose } from "../../api/src/job-opening/close.ts";
import { declaration as jobOpeningCreate } from "../../api/src/job-opening/create.ts";
import { declaration as jobOpeningGet } from "../../api/src/job-opening/get.ts";
import { declaration as shiftTypeCreate } from "../../api/src/shift-type/create.ts";
import { declaration as shiftTypeGet } from "../../api/src/shift-type/get.ts";

/** One tool per operation and read, named as the operation is. */
export const catalog = {
  "attendance.get": { description: "Read one attendance by its id: company, employee, attendanceDate, status, state.", operation: attendanceGet, states: ["marked"] },
  "attendance.list": { description: "List attendances, oldest first, 50 to a page, filtered by employee, attendanceDate.", operation: attendanceList, states: ["marked"] },
  "attendance.mark": { description: "Mark whether an employee was at work on a day. Refuses AttendanceAlreadyMarked when another attendance holds this employee and attendance date.", operation: attendanceMark, states: ["marked"], move: {"key":"mark","from":[],"to":["marked"],"emits":"AttendanceMarked"} },
  "attendance-request.approve": { description: "Approve a request, marking each of its days. Refuses AttendanceAlreadyMarked when another attendance holds this employee and attendance date.", operation: attendanceRequestApprove, states: ["draft","approved","rejected"], move: {"key":"approve","from":["draft"],"to":["approved"],"emits":"AttendanceRequestApproved"} },
  "attendance-request.create": { description: "Ask for an employee to be marked at work, from one day to another, and why.", operation: attendanceRequestCreate, states: ["draft","approved","rejected"], move: {"key":"create","from":[],"to":["draft"],"emits":"AttendanceRequested"} },
  "attendance-request.get": { description: "Read one attendance-request by its id: company, employee, fromDate, toDate, reason, state.", operation: attendanceRequestGet, states: ["draft","approved","rejected"] },
  "attendance-request.reject": { description: "Reject a request, marking none of its days.", operation: attendanceRequestReject, states: ["draft","approved","rejected"], move: {"key":"reject","from":["draft"],"to":["rejected"],"emits":"AttendanceRequestRejected"} },
  "bank-account.close": { description: "Close a company's bank account; it takes no more deposits.", operation: bankAccountClose, states: ["open","closed"], move: {"key":"close","from":["open"],"to":["closed"],"emits":"BankAccountClosed"} },
  "bank-account.get": { description: "Read one bank-account by its id: company, business, accountName, currency, bankName, accountNumber, routingNumber, state.", operation: bankAccountGet, states: ["open","closed"] },
  "bank-account.open": { description: "Open a bank account for a company whose KYB Bridge approved: answers where to send deposits. Refuses BankAccountNameTaken when another open bank account holds this company and account name.", operation: bankAccountOpen, states: ["open","closed"], move: {"key":"open","from":[],"to":["open"],"emits":"BankAccountOpened"} },
  "bank-transaction.fail": { description: "Record that Bridge couldn't pay a transfer out, and how it ended. Refuses AlreadyRecorded when another bank transaction holds this reference.", operation: bankTransactionFail, states: ["pending","settled","failed"], move: {"key":"fail","from":["pending"],"to":["failed"],"emits":"TransferFailed"} },
  "bank-transaction.get": { description: "Read one bank-transaction by its id: company, account, date, deposit, withdrawal, currency, reference, party, state.", operation: bankTransactionGet, states: ["pending","settled","failed"] },
  "bank-transaction.land": { description: "Record a deposit Bridge landed on a company's bank account. Refuses AlreadyRecorded when another bank transaction holds this reference.", operation: bankTransactionLand, states: ["pending","settled","failed"], move: {"key":"land","from":[],"to":["settled"],"emits":"DepositLanded"} },
  "bank-transaction.list": { description: "List bank-transactions, oldest first, 50 to a page, filtered by account.", operation: bankTransactionList, states: ["pending","settled","failed"] },
  "bank-transaction.send": { description: "Send money out of a company's bank account to a payee, through Bridge. Refuses AlreadyRecorded when another bank transaction holds this reference.", operation: bankTransactionSend, states: ["pending","settled","failed"], move: {"key":"send","from":[],"to":["pending"],"emits":"TransferSent"} },
  "bank-transaction.settle": { description: "Record that Bridge paid a transfer out. Refuses AlreadyRecorded when another bank transaction holds this reference.", operation: bankTransactionSettle, states: ["pending","settled","failed"], move: {"key":"settle","from":["pending"],"to":["settled"],"emits":"TransferSettled"} },
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
  "employee-promotion.cancel": { description: "Cancel a submitted promotion, putting back the job title it replaced. Refuses EmployeeAlreadyHired when another active employee holds this company and person.", operation: employeePromotionCancel, states: ["draft","submitted","cancelled"], move: {"key":"cancel","from":["submitted"],"to":["cancelled"],"emits":"EmployeePromotionCancelled"} },
  "employee-promotion.create": { description: "Draft a promotion: an employee's new job title, from a day.", operation: employeePromotionCreate, states: ["draft","submitted","cancelled"], move: {"key":"create","from":[],"to":["draft"],"emits":"EmployeePromotionDrafted"} },
  "employee-promotion.get": { description: "Read one employee-promotion by its id: company, employee, promotionDate, currentDesignation, newDesignation, state.", operation: employeePromotionGet, states: ["draft","submitted","cancelled"] },
  "employee-promotion.submit": { description: "Submit a promotion on or after its day, giving the employee the new job title. Refuses EmployeeAlreadyHired when another active employee holds this company and person.", operation: employeePromotionSubmit, states: ["draft","submitted","cancelled"], move: {"key":"submit","from":["draft"],"to":["submitted"],"emits":"EmployeePromoted"} },
  "employee-separation.begin": { description: "Mark a separation in process. Refuses SeparationAlreadyOpen when another pending or inProcess employee separation holds this employee.", operation: employeeSeparationBegin, states: ["pending","inProcess","completed"], move: {"key":"begin","from":["pending"],"to":["inProcess"],"emits":"EmployeeSeparationBegun"} },
  "employee-separation.complete": { description: "Mark a separation completed. The employee is relieved by its own call.", operation: employeeSeparationComplete, states: ["pending","inProcess","completed"], move: {"key":"complete","from":["pending","inProcess"],"to":["completed"],"emits":"EmployeeSeparationCompleted"} },
  "employee-separation.create": { description: "Start an employee's separation, from their resignation letter. Refuses SeparationAlreadyOpen when another pending or inProcess employee separation holds this employee.", operation: employeeSeparationCreate, states: ["pending","inProcess","completed"], move: {"key":"create","from":[],"to":["pending"],"emits":"EmployeeSeparationStarted"} },
  "employee-separation.get": { description: "Read one employee-separation by its id: company, employee, resignationLetterDate, boardingBeginsOn, state.", operation: employeeSeparationGet, states: ["pending","inProcess","completed"] },
  "employee-transfer.cancel": { description: "Cancel a submitted transfer, putting back the department it replaced. Refuses EmployeeAlreadyHired when another active employee holds this company and person.", operation: employeeTransferCancel, states: ["draft","submitted","cancelled"], move: {"key":"cancel","from":["submitted"],"to":["cancelled"],"emits":"EmployeeTransferCancelled"} },
  "employee-transfer.create": { description: "Draft a transfer: an employee's new department, from a day.", operation: employeeTransferCreate, states: ["draft","submitted","cancelled"], move: {"key":"create","from":[],"to":["draft"],"emits":"EmployeeTransferDrafted"} },
  "employee-transfer.get": { description: "Read one employee-transfer by its id: company, employee, transferDate, currentDepartment, newDepartment, state.", operation: employeeTransferGet, states: ["draft","submitted","cancelled"] },
  "employee-transfer.submit": { description: "Submit a transfer on or after its day, giving the employee the new department. Refuses EmployeeAlreadyHired when another active employee holds this company and person.", operation: employeeTransferSubmit, states: ["draft","submitted","cancelled"], move: {"key":"submit","from":["draft"],"to":["submitted"],"emits":"EmployeeTransferred"} },
  "employment-type.create": { description: "Add a way a company employs people. Refuses EmploymentTypeNameTaken when another employment type holds this company and employment type name.", operation: employmentTypeCreate, states: ["active"], move: {"key":"create","from":[],"to":["active"],"emits":"EmploymentTypeCreated"} },
  "employment-type.get": { description: "Read one employment-type by its id: company, employmentTypeName, state.", operation: employmentTypeGet, states: ["active"] },
  "expense.add": { description: "Add one expense to a claim still in draft.", operation: expenseAdd, states: ["active"], move: {"key":"add","from":[],"to":["active"],"emits":"ExpenseAdded"} },
  "expense.get": { description: "Read one expense by its id: expenseClaim, expenseDate, expenseType, amount, sanctionedAmount, state.", operation: expenseGet, states: ["active"] },
  "expense-claim.approve": { description: "Approve a claim, owing the employee what was sanctioned.", operation: expenseClaimApprove, states: ["draft","approved","rejected"], move: {"key":"approve","from":["draft"],"to":["approved"],"emits":"ExpenseClaimApproved"} },
  "expense-claim.create": { description: "Start an employee's claim for expenses the company pays back.", operation: expenseClaimCreate, states: ["draft","approved","rejected"], move: {"key":"create","from":[],"to":["draft"],"emits":"ExpenseClaimCreated"} },
  "expense-claim.get": { description: "Read one expense-claim by its id: company, employee, postingDate, totalClaimedAmount, totalSanctionedAmount, state.", operation: expenseClaimGet, states: ["draft","approved","rejected"] },
  "expense-claim.reject": { description: "Reject a claim, so nothing of it is paid back.", operation: expenseClaimReject, states: ["draft","approved","rejected"], move: {"key":"reject","from":["draft"],"to":["rejected"],"emits":"ExpenseClaimRejected"} },
  "expense-claim-type.create": { description: "Add a kind of expense a company pays back. Refuses ExpenseTypeTaken when another expense claim type holds this company and expense type.", operation: expenseClaimTypeCreate, states: ["active"], move: {"key":"create","from":[],"to":["active"],"emits":"ExpenseClaimTypeCreated"} },
  "expense-claim-type.get": { description: "Read one expense-claim-type by its id: company, expenseType, state.", operation: expenseClaimTypeGet, states: ["active"] },
  "holiday.add": { description: "Add one day off to a holiday list. Refuses HolidayDateTaken when another holiday holds this holiday list and holiday date. Refuses HolidayListNameTaken when another holiday list holds this company and holiday list name.", operation: holidayAdd, states: ["active"], move: {"key":"add","from":[],"to":["active"],"emits":"HolidayAdded"} },
  "holiday.get": { description: "Read one holiday by its id: holidayList, holidayDate, description, state.", operation: holidayGet, states: ["active"] },
  "holiday-list.add-weekly-off": { description: "Make every given weekday in a holiday list a day off. Refuses HolidayDateTaken when another holiday holds this holiday list and holiday date. Refuses HolidayListNameTaken when another holiday list holds this company and holiday list name.", operation: holidayListAddWeeklyOff, states: ["active"], move: {"key":"addWeeklyOff","from":["active"],"to":["active"],"emits":"WeeklyOffAdded"} },
  "holiday-list.create": { description: "Start a company's list of days off, between two days. Refuses HolidayListNameTaken when another holiday list holds this company and holiday list name.", operation: holidayListCreate, states: ["active"], move: {"key":"create","from":[],"to":["active"],"emits":"HolidayListCreated"} },
  "holiday-list.get": { description: "Read one holiday-list by its id: company, holidayListName, fromDate, toDate, totalHolidays, state.", operation: holidayListGet, states: ["active"] },
  "interview.clear": { description: "Mark an interview cleared. Refuses InterviewAlreadyScheduled when another interview holds this job applicant and interview round.", operation: interviewClear, states: ["pending","cleared","rejected"], move: {"key":"clear","from":["pending"],"to":["cleared"],"emits":"InterviewCleared"} },
  "interview.create": { description: "Schedule an applicant's interview at a round, on a day, with the employees who interview. Refuses InterviewAlreadyScheduled when another interview holds this job applicant and interview round.", operation: interviewCreate, states: ["pending","cleared","rejected"], move: {"key":"create","from":[],"to":["pending"],"emits":"InterviewScheduled"} },
  "interview.get": { description: "Read one interview by its id: company, jobApplicant, interviewRound, scheduledOn, fromTime, toTime, interviewers, state.", operation: interviewGet, states: ["pending","cleared","rejected"] },
  "interview.reject": { description: "Mark an interview rejected. Refuses InterviewAlreadyScheduled when another interview holds this job applicant and interview round.", operation: interviewReject, states: ["pending","cleared","rejected"], move: {"key":"reject","from":["pending"],"to":["rejected"],"emits":"InterviewRejected"} },
  "interview-feedback.get": { description: "Read one interview-feedback by its id: company, interview, interviewer, result, state.", operation: interviewFeedbackGet, states: ["given"] },
  "interview-feedback.give": { description: "Give an interviewer's feedback on an interview: cleared or rejected. Refuses FeedbackAlreadyGiven when another interview feedback holds this interview and interviewer.", operation: interviewFeedbackGive, states: ["given"], move: {"key":"give","from":[],"to":["given"],"emits":"InterviewFeedbackGiven"} },
  "interview-round.create": { description: "Add a stage of hiring to a company, with the employees who interview at it. Refuses RoundNameTaken when another interview round holds this company and round name.", operation: interviewRoundCreate, states: ["active"], move: {"key":"create","from":[],"to":["active"],"emits":"InterviewRoundCreated"} },
  "interview-round.get": { description: "Read one interview-round by its id: company, roundName, interviewers, state.", operation: interviewRoundGet, states: ["active"] },
  "job-applicant.accept": { description: "Mark an applicant accepted, once they have accepted their job offer.", operation: jobApplicantAccept, states: ["open","hold","rejected","accepted"], move: {"key":"accept","from":["open","hold"],"to":["accepted"],"emits":"JobApplicantAccepted"} },
  "job-applicant.create": { description: "Add a person who applied for a job opening.", operation: jobApplicantCreate, states: ["open","hold","rejected","accepted"], move: {"key":"create","from":[],"to":["open"],"emits":"JobApplicantCreated"} },
  "job-applicant.get": { description: "Read one job-applicant by its id: company, jobOpening, applicantName, email, state.", operation: jobApplicantGet, states: ["open","hold","rejected","accepted"] },
  "job-applicant.hold": { description: "Put an applicant on hold.", operation: jobApplicantHold, states: ["open","hold","rejected","accepted"], move: {"key":"hold","from":["open"],"to":["hold"],"emits":"JobApplicantHeld"} },
  "job-applicant.reject": { description: "Turn an applicant down.", operation: jobApplicantReject, states: ["open","hold","rejected","accepted"], move: {"key":"reject","from":["open","hold"],"to":["rejected"],"emits":"JobApplicantRejected"} },
  "job-offer.accept": { description: "Record that the applicant accepted the offer. Refuses OfferAlreadyMade when another job offer holds this job applicant.", operation: jobOfferAccept, states: ["awaiting","accepted","rejected"], move: {"key":"accept","from":["awaiting"],"to":["accepted"],"emits":"JobOfferAccepted"} },
  "job-offer.create": { description: "Offer an applicant a job, under one of the company's job titles. Refuses OfferAlreadyMade when another job offer holds this job applicant.", operation: jobOfferCreate, states: ["awaiting","accepted","rejected"], move: {"key":"create","from":[],"to":["awaiting"],"emits":"JobOfferMade"} },
  "job-offer.get": { description: "Read one job-offer by its id: company, jobApplicant, designation, offerDate, state.", operation: jobOfferGet, states: ["awaiting","accepted","rejected"] },
  "job-offer.reject": { description: "Record that the applicant rejected the offer. Refuses OfferAlreadyMade when another job offer holds this job applicant.", operation: jobOfferReject, states: ["awaiting","accepted","rejected"], move: {"key":"reject","from":["awaiting"],"to":["rejected"],"emits":"JobOfferRejected"} },
  "job-opening.close": { description: "Close a job opening to new applicants.", operation: jobOpeningClose, states: ["open","closed"], move: {"key":"close","from":["open"],"to":["closed"],"emits":"JobOpeningClosed"} },
  "job-opening.create": { description: "Open a job under one of a company's job titles, for some number of people.", operation: jobOpeningCreate, states: ["open","closed"], move: {"key":"create","from":[],"to":["open"],"emits":"JobOpeningCreated"} },
  "job-opening.get": { description: "Read one job-opening by its id: company, designation, jobTitle, vacancies, state.", operation: jobOpeningGet, states: ["open","closed"] },
  "shift-type.create": { description: "Add a working shift to a company, from its start time to its end time. Refuses ShiftTypeNameTaken when another shift type holds this company and shift type name.", operation: shiftTypeCreate, states: ["active"], move: {"key":"create","from":[],"to":["active"],"emits":"ShiftTypeCreated"} },
  "shift-type.get": { description: "Read one shift-type by its id: company, shiftTypeName, startTime, endTime, state.", operation: shiftTypeGet, states: ["active"] },
} as const satisfies { readonly [name: string]: McpEntry };
