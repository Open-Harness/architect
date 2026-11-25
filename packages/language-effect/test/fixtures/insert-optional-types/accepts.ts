// Must compile with no error and no cast: an optional field left out, set, or both; an update of an optional field alone.
import { Effect } from "effect";
import { Records } from "../../../src/modules/records/types.ts";
import { Account, company, id, maybeParent, maybeType, parent } from "./thing.ts";

export const program = Effect.gen(function* () {
  const records = yield* Records;
  // Both optional fields left out: what account.create does for a root account with no type.
  yield* records.insert(Account, { id, company, accountName: "Assets", reportType: "Balance Sheet" }, "group");
  // One left out, one set.
  yield* records.insert(Account, { id, company, accountName: "Bank", parentAccount: parent, reportType: "Balance Sheet" }, "ledger");
  yield* records.insert(Account, { id, company, accountName: "Tax", reportType: "Balance Sheet", accountType: "Tax" }, "ledger");
  // Both set.
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
  // An update still takes any subset, an optional field alone included.
  yield* records.update(Account, "acc_1", { accountType: "Bank" });
});
