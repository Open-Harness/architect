// Refused. Fault: 'accountType'. An update leaves an optional field out, never sets it to undefined.
// The statement marked below is a shape accepts.ts holds, with only this fault; the error must be there and name the field (or point at it).
import { Effect } from "effect";
import { Records } from "../../../../src/modules/records/types.ts";
import { Account, Company, Gauge, company, gauge, id, parent, tag } from "../thing.ts";

export const program = Effect.gen(function* () {
  const records = yield* Records;
  void [Account, Company, Gauge, company, gauge, id, parent, tag];
  yield* records.update(Account, "acc_1", { accountType: undefined }); // ← the fault
});
