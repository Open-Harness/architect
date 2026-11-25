// Must compile with no error and no cast. Every optional field of every kind left out, set, or set to its falsy value; a thing with no optional field;
// an insert with no state; an update of an optional field, a required field, or both.
import { Effect } from "effect";
import { Records } from "../../../src/modules/records/types.ts";
import { Account, Company, Gauge, company, gauge, id, maybeParent, maybeType, parent, tag } from "./thing.ts";

export const program = Effect.gen(function* () {
  const records = yield* Records;
  // Account: both optional fields left out (a root account with no type), one, the other, both set.
  yield* records.insert(Account, { id, company, accountName: "Assets", reportType: "Balance Sheet" }, "group");
  yield* records.insert(Account, { id, company, accountName: "Bank", parentAccount: parent, reportType: "Balance Sheet" }, "ledger");
  yield* records.insert(Account, { id, company, accountName: "Tax", reportType: "Balance Sheet", accountType: "Tax" }, "ledger");
  yield* records.insert(Account, { id, company, accountName: "Cash", parentAccount: parent, reportType: "Balance Sheet", accountType: "Cash" }, "ledger");
  // What account.create does (#1043): each optional field spread in only when the payload has it.
  yield* records.insert(Account, {
    id,
    company,
    accountName: "Any",
    reportType: "Balance Sheet",
    ...(maybeParent !== undefined ? { parentAccount: maybeParent } : {}),
    ...(maybeType !== undefined ? { accountType: maybeType } : {}),
  }, "ledger");
  // Gauge: every optional kind left out, and with no state; then every one set, to falsy values where the kind has them.
  yield* records.insert(Gauge, { id: gauge, label: "g" });
  yield* records.insert(Gauge, { id: gauge, label: "", count: 0n, on: false, shape: { a: 0 }, tags: [], tag });
  yield* records.insert(Gauge, { id: gauge, label: "g", count: 3n }, "on");
  // Company: no optional field, no state.
  yield* records.insert(Company, { id: company, name: "Acme" });
  // An update takes any subset: an optional field alone, a required one alone, both, one of every optional kind.
  yield* records.update(Account, "acc_1", { accountType: "Bank" });
  yield* records.update(Account, "acc_1", { accountName: "Renamed" });
  yield* records.update(Account, "acc_1", { accountName: "Renamed", parentAccount: parent });
  yield* records.update(Gauge, "gau_1", { count: 0n, on: false, tags: ["x"] });
  yield* records.update(Company, "co_1", { name: "Acme 2" });
});
