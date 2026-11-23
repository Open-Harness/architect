// Hand-written over the scaffold (proof/): GL Entry's JSON marks no field required, so the scaffold reads only its state.
import { Blueprint } from "orthograph";
import { GlEntry } from "../thing.ts";
import { accountsUser, accountsManager, auditor } from "../roles.ts";

export default Blueprint.read(GlEntry, { by: "id", fields: ["state", "account", "debit", "credit", "voucherNo", "postingDate", "company"], allowed: [accountsUser, accountsManager, auditor] });
