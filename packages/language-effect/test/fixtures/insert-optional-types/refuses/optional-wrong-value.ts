// Must be a type error that names 'accountType': an optional value keeps its own type when set.
import { Effect } from "effect";
import { Records } from "../../../../src/modules/records/types.ts";
import { Account, company, id, parent } from "../thing.ts";

export const program = Effect.gen(function* () {
  const records = yield* Records;
  void parent;
  void company;
  yield* records.insert(Account, { id, company, accountName: "Bank", reportType: "Balance Sheet", accountType: "Nonsense" }, "ledger");
});
