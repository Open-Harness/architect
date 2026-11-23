-- Generated from the blueprint. Do not edit.
-- Stage one rebuilds the local database on every `ortho dev`; migrations between versions arrive in stage three.
CREATE TABLE "account" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "external" TEXT NOT NULL,
  "login" TEXT NOT NULL,
  "bot" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "account_oneAccountPerExternalId" ON "account" ("superagent", "source", "external");
CREATE TABLE "assignment" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "ticket" TEXT NOT NULL,
  "agent" TEXT NOT NULL,
  "input" TEXT NOT NULL,
  "why" TEXT NOT NULL,
  "seat" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "assignment_oneHolderPerSeat" ON "assignment" ("superagent", "seat") WHERE "state" IN ('running', 'closing');
CREATE UNIQUE INDEX "assignment_oneLivePerExecutor" ON "assignment" ("agent") WHERE "state" IN ('pending', 'running', 'closing');
CREATE TABLE "attention" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "ticket" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "correlation" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "thread" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "decision" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "eval" TEXT NOT NULL,
  "items" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "eval" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "thread" TEXT NOT NULL,
  "triggers" TEXT NOT NULL,
  "activeAtStart" TEXT NOT NULL,
  "timeoutMs" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "input" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "ticket" TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "seq" TEXT NOT NULL,
  "retryAt" TEXT NOT NULL,
  "refusals" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "mandate" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "ticket" TEXT NOT NULL,
  "account" TEXT NOT NULL,
  "policy" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "outgoing-message" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "ticket" TEXT NOT NULL,
  "conversation" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "failures" TEXT NOT NULL,
  "notBefore" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "policy" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "revision" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "allowed" TEXT NOT NULL,
  "bots" TEXT NOT NULL,
  "admission" TEXT NOT NULL,
  "rules" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "prompt-set" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "revision" TEXT NOT NULL,
  "sections" TEXT NOT NULL,
  "skills" TEXT NOT NULL,
  "overrides" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "proposal" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "changes" TEXT NOT NULL,
  "why" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "report" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "ticket" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "seq" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "settings" (
  "id" TEXT PRIMARY KEY,
  "revision" TEXT NOT NULL,
  "variables" TEXT NOT NULL,
  "blocked" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "source" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "config" TEXT NOT NULL,
  "position" TEXT NOT NULL,
  "failures" TEXT NOT NULL,
  "failAfter" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "subscription" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "ticket" TEXT NOT NULL,
  "thread" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "subscription_oneFollowPerThread" ON "subscription" ("ticket", "thread") WHERE "state" IN ('live');
CREATE TABLE "superagent" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "connections" TEXT NOT NULL,
  "playbook" TEXT NOT NULL,
  "slots" TEXT NOT NULL,
  "main" TEXT NOT NULL,
  "pausedFrom" TEXT NOT NULL,
  "pausedAt" TEXT NOT NULL,
  "pausedFor" TEXT NOT NULL,
  "passGen" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "thread" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "ticket" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "agent" TEXT NOT NULL,
  "seq" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "trigger" (
  "id" TEXT PRIMARY KEY,
  "superagent" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "thread" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
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
