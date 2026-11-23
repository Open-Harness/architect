import { Blueprint } from "orthograph";

// Lives in the default store: no `lives`, so the project's own.
export const Memo = Blueprint.thing({
  description: "A note kept beside the ledger, in the default store.",
  fields: { id: Blueprint.id("mem") },
  code: "MX",
});
