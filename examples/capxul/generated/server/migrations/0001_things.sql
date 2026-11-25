-- Generated from the blueprint. Do not edit.
-- Stage one rebuilds the local database on every `ortho dev`; migrations between versions arrive in stage three.
CREATE TABLE "attendance" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "employee" TEXT NOT NULL,
  "attendanceDate" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "attendance_oneAttendancePerDay" ON "attendance" ("employee", "attendanceDate");
CREATE TABLE "attendance-request" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "employee" TEXT NOT NULL,
  "fromDate" TEXT NOT NULL,
  "toDate" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "bank-account" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "business" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "routingNumber" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "bank-account_oneAccountPerNumber" ON "bank-account" ("accountNumber");
CREATE UNIQUE INDEX "bank-account_oneNamePerCompany" ON "bank-account" ("company", "accountName") WHERE "state" IN ('open');
CREATE TABLE "bank-transaction" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "account" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "deposit" TEXT NOT NULL,
  "withdrawal" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "party" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "bank-transaction_oneTransactionPerMovement" ON "bank-transaction" ("reference");
CREATE TABLE "branch" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "branchName" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "branch_oneNamePerCompany" ON "branch" ("company", "branchName");
CREATE TABLE "bridge-business" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "kybLink" TEXT NOT NULL,
  "tosLink" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "bridge-business_oneKybPerCompany" ON "bridge-business" ("company");
CREATE UNIQUE INDEX "bridge-business_oneKybPerForm" ON "bridge-business" ("kybLink");
CREATE TABLE "bridge-individual" (
  "id" TEXT PRIMARY KEY,
  "person" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "kycLink" TEXT NOT NULL,
  "tosLink" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "bridge-individual_oneKycPerForm" ON "bridge-individual" ("kycLink");
CREATE UNIQUE INDEX "bridge-individual_oneKycPerPerson" ON "bridge-individual" ("person");
CREATE TABLE "company" (
  "id" TEXT PRIMARY KEY,
  "companyName" TEXT NOT NULL,
  "abbr" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "defaultCurrency" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "company_oneAbbrPerOwner" ON "company" ("owner", "abbr");
CREATE UNIQUE INDEX "company_oneNamePerOwner" ON "company" ("owner", "companyName");
CREATE TABLE "department" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "departmentName" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "department_oneNamePerCompany" ON "department" ("company", "departmentName");
CREATE TABLE "designation" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "designationName" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "designation_oneNamePerCompany" ON "designation" ("company", "designationName");
CREATE TABLE "employee" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "person" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "gender" TEXT NOT NULL,
  "dateOfBirth" TEXT NOT NULL,
  "dateOfJoining" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "designation" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "employee_onePlacePerPerson" ON "employee" ("company", "person") WHERE "state" IN ('active');
CREATE TABLE "employee-grade" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "gradeName" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "employee-grade_oneNamePerCompany" ON "employee-grade" ("company", "gradeName");
CREATE TABLE "employee-promotion" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "employee" TEXT NOT NULL,
  "promotionDate" TEXT NOT NULL,
  "currentDesignation" TEXT NOT NULL,
  "newDesignation" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "employee-separation" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "employee" TEXT NOT NULL,
  "resignationLetterDate" TEXT NOT NULL,
  "boardingBeginsOn" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "employee-separation_oneOpenSeparationPerEmployee" ON "employee-separation" ("employee") WHERE "state" IN ('pending', 'inProcess');
CREATE TABLE "employee-transfer" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "employee" TEXT NOT NULL,
  "transferDate" TEXT NOT NULL,
  "currentDepartment" TEXT NOT NULL,
  "newDepartment" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "employment-type" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "employmentTypeName" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "employment-type_oneNamePerCompany" ON "employment-type" ("company", "employmentTypeName");
CREATE TABLE "expense" (
  "id" TEXT PRIMARY KEY,
  "expenseClaim" TEXT NOT NULL,
  "expenseDate" TEXT NOT NULL,
  "expenseType" TEXT NOT NULL,
  "amount" TEXT NOT NULL,
  "sanctionedAmount" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "expense-claim" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "employee" TEXT NOT NULL,
  "postingDate" TEXT NOT NULL,
  "totalClaimedAmount" TEXT NOT NULL,
  "totalSanctionedAmount" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "expense-claim-type" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "expenseType" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "expense-claim-type_oneNamePerCompany" ON "expense-claim-type" ("company", "expenseType");
CREATE TABLE "holiday" (
  "id" TEXT PRIMARY KEY,
  "holidayList" TEXT NOT NULL,
  "holidayDate" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "holiday_oneHolidayPerDay" ON "holiday" ("holidayList", "holidayDate");
CREATE TABLE "holiday-list" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "holidayListName" TEXT NOT NULL,
  "fromDate" TEXT NOT NULL,
  "toDate" TEXT NOT NULL,
  "totalHolidays" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "holiday-list_oneNamePerCompany" ON "holiday-list" ("company", "holidayListName");
CREATE TABLE "interview" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "jobApplicant" TEXT NOT NULL,
  "interviewRound" TEXT NOT NULL,
  "scheduledOn" TEXT NOT NULL,
  "fromTime" TEXT NOT NULL,
  "toTime" TEXT NOT NULL,
  "interviewers" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "interview_oneInterviewPerRound" ON "interview" ("jobApplicant", "interviewRound");
CREATE TABLE "interview-feedback" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "interview" TEXT NOT NULL,
  "interviewer" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "interview-feedback_oneFeedbackPerInterviewer" ON "interview-feedback" ("interview", "interviewer");
CREATE TABLE "interview-round" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "roundName" TEXT NOT NULL,
  "interviewers" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "interview-round_oneNamePerCompany" ON "interview-round" ("company", "roundName");
CREATE TABLE "job-applicant" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "jobOpening" TEXT NOT NULL,
  "applicantName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "job-offer" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "jobApplicant" TEXT NOT NULL,
  "designation" TEXT NOT NULL,
  "offerDate" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "job-offer_oneOfferPerApplicant" ON "job-offer" ("jobApplicant");
CREATE TABLE "job-opening" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "designation" TEXT NOT NULL,
  "jobTitle" TEXT NOT NULL,
  "vacancies" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "shift-type" (
  "id" TEXT PRIMARY KEY,
  "company" TEXT NOT NULL,
  "shiftTypeName" TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "shift-type_oneNamePerCompany" ON "shift-type" ("company", "shiftTypeName");
-- Every event a move emitted, with the trace of the call that made it (language-effect's Journal).
CREATE TABLE "_journal" (
  "seq" INTEGER PRIMARY KEY AUTOINCREMENT,
  "trace" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "move" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "fields" TEXT NOT NULL
);
CREATE INDEX "_journal_trace" ON "_journal" ("trace");
-- Each idempotent call's answer, under its operation, caller and request key, committed with the call itself.
CREATE TABLE "_requests" (
  "key" TEXT PRIMARY KEY,
  "answer" TEXT NOT NULL
);
