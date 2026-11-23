-- G5 (ST1.13; replaces G4's): a thing with rules. The indexes are what the host's DDL makes from the model's invariants: one partial unique
-- index per rule, named after the rule (`<table>_<rule>`), over the rule's key and scope. A name in a state outside the scope is free to be
-- held again; a rule with no `while` holds in every state.
CREATE TABLE "handle" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "owner" TEXT NOT NULL DEFAULT '',
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "handle_oneHolderPerName" ON "handle" ("name") WHERE "state" IN ('claimed');
CREATE UNIQUE INDEX "handle_oneNamePerPerson" ON "handle" ("owner") WHERE "state" IN ('claimed') AND "owner" <> '';
