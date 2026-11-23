import { Blueprint } from "orthograph";
import { Line } from "../thing.js";

export default Blueprint.operation(Line, {
  description: "Add a line to the ledger.",
  payload: { amount: Line.fields.amount },
  answer: { line: Line.fields.id },
  allowed: [Blueprint.anyone],
  steps: { save: Blueprint.step.database() },
});
