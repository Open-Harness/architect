// Must be a type error that names 'id': the id left out is still an error.
import { Effect } from "effect";
import { Records } from "../../../../src/modules/records/types.ts";
import { Account, company, id, parent } from "../thing.ts";

export const program = Effect.gen(function* () {
  const records = yield* Records;
  void parent;
  void company;
  yield* records.insert(Account, { company, accountName: "Bank", reportType: "Balance Sheet" }, "ledger");
});
