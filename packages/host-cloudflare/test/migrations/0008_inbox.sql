-- The inbox: a door-enabled Worker's `_journal` also holds each accepted delivery, by a unique id, with the account that sent it.
ALTER TABLE "_journal" ADD COLUMN "id" TEXT;
ALTER TABLE "_journal" ADD COLUMN "actor" TEXT;
CREATE UNIQUE INDEX "_journal_id" ON "_journal" ("id");
