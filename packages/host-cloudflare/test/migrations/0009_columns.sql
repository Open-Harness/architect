-- What a thing's columns hold (store.test.ts, "a row's values"): a boolean as INTEGER, an optional or nullable field as a column that may be NULL,
-- an unknown or a union of structs as JSON text. The same shapes `ortho generate` writes for a model.
CREATE TABLE "gadget" (
  "id" TEXT PRIMARY KEY,
  "on" INTEGER NOT NULL,
  "note" TEXT,
  "payload" TEXT NOT NULL,
  "either" TEXT NOT NULL,
  "maybe" TEXT,
  "count" TEXT NOT NULL,
  "state" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0
);
