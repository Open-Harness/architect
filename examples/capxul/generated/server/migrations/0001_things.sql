-- Generated from the blueprint. Do not edit.
-- Stage one rebuilds the local database on every `ortho dev`; migrations between versions arrive in stage three.
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
