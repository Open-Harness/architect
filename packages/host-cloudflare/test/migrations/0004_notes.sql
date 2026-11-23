CREATE TABLE "note" (
  "id" TEXT PRIMARY KEY,
  "tags" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
