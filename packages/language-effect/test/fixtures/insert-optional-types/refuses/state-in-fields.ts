// Must be a type error that names 'state': the state is the third argument to insert, never a field.
import { Effect } from "effect";
import { Records } from "../../../../src/modules/records/types.ts";
import { Account, company, id, parent } from "../thing.ts";

export const program = Effect.gen(function* () {
  const records = yield* Records;
  void parent;
  void company;
  yield* records.insert(Account, { id, company, accountName: "Bank", reportType: "Balance Sheet", state: "ledger" }, "ledger");
});
