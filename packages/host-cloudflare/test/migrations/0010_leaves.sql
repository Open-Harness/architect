-- #764: a thing a handler lists (list-guard.test.ts). The table is what the host's DDL makes for a thing today: a column per field in its wire form, plus
-- `state` and `version`. A build that needs more to guard a list makes it in a migration of its own.
CREATE TABLE "leave" (
  "id" TEXT PRIMARY KEY,
  "employee" TEXT NOT NULL,
  "starts" TEXT NOT NULL,
  "ends" TEXT NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
-- Another thing a call may write after listing leave (list-guard.test.ts): a list's guard holds whatever the call writes.
CREATE TABLE "ask" (
  "id" TEXT PRIMARY KEY,
  "employee" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
