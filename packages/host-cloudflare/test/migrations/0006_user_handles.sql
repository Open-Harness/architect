-- G4 (S-04), Codex P2 on #118, kept under G5: a multiword thing's table is hyphenated (`user-handle`), and D1 words a broken unique index as
-- `UNIQUE constraint failed: user-handle.name`. Same shape as 0005's first rule, under that name and the rule's name.
CREATE TABLE "user-handle" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "user_handle_oneUserPerName" ON "user-handle" ("name") WHERE "state" IN ('claimed');
