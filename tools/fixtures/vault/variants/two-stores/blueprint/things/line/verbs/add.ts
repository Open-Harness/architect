import { Blueprint } from "orthograph";
import { Line } from "../thing.js";
import { Memo } from "../../memo/thing.js";

// One call writing a line (the ledger) and a memo (the default store): two stores, so the compiler refuses it.
export default Blueprint.operation(Line, {
  description: "Add a line to the ledger, and a memo beside it.",
  payload: { amount: Line.fields.amount },
  answer: { line: Line.fields.id },
  allowed: [Blueprint.anyone],
  steps: { save: Blueprint.step.database({ writes: [Line, Memo] }) },
});
