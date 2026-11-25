// Must be a type error that names 'accountType': an optional field is left out, never passed as undefined (exactOptionalPropertyTypes; the store encodes an absent key, not undefined).
import { Effect } from "effect";
import { Records } from "../../../../src/modules/records/types.ts";
import { Account, company, id, parent } from "../thing.ts";

export const program = Effect.gen(function* () {
  const records = yield* Records;
  void parent;
  void company;
  yield* records.insert(Account, { id, company, accountName: "Bank", reportType: "Balance Sheet", accountType: undefined }, "ledger");
});
