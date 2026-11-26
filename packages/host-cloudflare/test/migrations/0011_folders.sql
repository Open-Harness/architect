-- #1045: things a handler reads by id and judges before it writes a row pointing at one (read-guard.test.ts). The tables are what the host's DDL makes for
-- a thing today: a column per field in its wire form, plus `state` and `version`. A build that needs more to guard a read makes it in a migration of its own.
CREATE TABLE "folder" (
  "id" TEXT PRIMARY KEY,
  "owner" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
-- A thing with no machine: its rows have no state.
CREATE TABLE "shelf" (
  "id" TEXT PRIMARY KEY,
  "label" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE "folder_note" (
  "id" TEXT PRIMARY KEY,
  "folder" TEXT NOT NULL,
  "copy" TEXT,
  "label" TEXT NOT NULL DEFAULT '',
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
