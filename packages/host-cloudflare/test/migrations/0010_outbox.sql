-- The event outbox (M5-reach-out Q1, GOAL17-pause): what the host generates beside `_journal` when a blueprint declares a hop. Same text as the generated migration.
CREATE TABLE "_outbox" (
  "event" TEXT NOT NULL,
  "to" TEXT NOT NULL,
  "seq" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "trace" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "claim" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "due" INTEGER NOT NULL,
  "hold" TEXT,
  "hold_by" TEXT,
  "outcome" TEXT,
  PRIMARY KEY ("event", "to")
);
CREATE INDEX "_outbox_order" ON "_outbox" ("to", "subject", "seq");
CREATE INDEX "_outbox_due" ON "_outbox" ("state", "due");
CREATE TABLE "_outbox_rules" ("hold" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "to" TEXT NOT NULL);
CREATE TABLE "_stats" ("key" TEXT PRIMARY KEY, "n" INTEGER NOT NULL);
-- The outbox tests' things: a ticket, and a switch whose `on` state parks what the ticket's hops hold.
CREATE TABLE "ticket" (
  "id" TEXT PRIMARY KEY,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "switch" (
  "id" TEXT PRIMARY KEY,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE VIEW "_hold_switched" AS SELECT "id" AS "key" FROM "switch" WHERE "state" IN ('on');
