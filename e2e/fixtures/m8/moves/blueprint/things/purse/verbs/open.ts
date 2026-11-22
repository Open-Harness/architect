import { Blueprint } from "orthograph";
import { Purse } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Purse, {
  description: "Open a purse with a monthly limit.",
  payload: { limit: Purse.fields.limit },
  answer: { purse: Purse.fields.id },
  move: machine.moves.open,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
