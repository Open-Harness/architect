-- Generated from the blueprint. Do not edit.
-- Stage one rebuilds the local database on every `ortho dev`; migrations between versions arrive in stage three.
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
CREATE UNIQUE INDEX "company_oneAbbr" ON "company" ("abbr");
CREATE UNIQUE INDEX "company_oneName" ON "company" ("companyName");
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
