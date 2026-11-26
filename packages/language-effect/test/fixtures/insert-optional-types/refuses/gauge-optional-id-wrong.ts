// Refused. Fault: 'tag'. An optional id keeps its own brand when set.
// The statement marked below is a shape accepts.ts holds, with only this fault; the error must be there and name the field (or point at it).
import { Effect } from "effect";
import { Records } from "../../../../src/modules/records/types.ts";
import { Account, Company, Gauge, company, gauge, id, parent, tag } from "../thing.ts";

export const program = Effect.gen(function* () {
  const records = yield* Records;
  void [Account, Company, Gauge, company, gauge, id, parent, tag];
  yield* records.insert(Gauge, { id: gauge, label: "g", tag: gauge }); // ← the fault
});
