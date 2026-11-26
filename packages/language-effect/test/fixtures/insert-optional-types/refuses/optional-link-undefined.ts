// Refused. Fault: 'parentAccount'. An optional link is left out, never passed as undefined.
// The statement marked below is a shape accepts.ts holds, with only this fault; the error must be there and name the field (or point at it).
import { Effect } from "effect";
import { Records } from "../../../../src/modules/records/types.ts";
import { Account, Company, Gauge, company, gauge, id, parent, tag } from "../thing.ts";

export const program = Effect.gen(function* () {
  const records = yield* Records;
  void [Account, Company, Gauge, company, gauge, id, parent, tag];
  yield* records.insert(Account, { id, company, accountName: "Bank", reportType: "Balance Sheet", parentAccount: undefined }, "ledger"); // ← the fault
});
