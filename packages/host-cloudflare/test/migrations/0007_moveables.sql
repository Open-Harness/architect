-- S-19 / HAN-18 (G5 section 6, ST1.11): a table whose one rule (`handle.oneHolderPerName`) is a name held by one claimed row, so a call that moves a value between holders
-- meets D1's statement-by-statement index check. The index is what the host's DDL makes: partial, over the scope.
CREATE TABLE "moveable" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "owner" TEXT NOT NULL DEFAULT '',
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "moveable_oneHolderPerName" ON "moveable" ("name") WHERE "state" IN ('claimed');
