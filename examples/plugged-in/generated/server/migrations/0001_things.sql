-- Generated from the blueprint. Do not edit.
-- Stage one rebuilds the local database on every `ortho dev`; migrations between versions arrive in stage three.
CREATE TABLE "handle" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "handle_oneHolderPerName" ON "handle" ("name") WHERE "state" IN ('claimed');
CREATE UNIQUE INDEX "handle_oneNamePerPerson" ON "handle" ("owner") WHERE "state" IN ('claimed');
CREATE TABLE "link" (
  "id" TEXT PRIMARY KEY,
  "profile" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "profile" (
  "id" TEXT PRIMARY KEY,
  "handle" TEXT NOT NULL,
  "links" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "profile_onePagePerHandle" ON "profile" ("handle");
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
