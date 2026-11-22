import { Blueprint } from "orthograph";
import { Budget } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Budget, {
  description: "Open a budget. It resets on the 25th and is reported on the last day of each month, in London.",
  payload: { title: Budget.fields.title },
  answer: { budget: Budget.fields.id, openedAt: Budget.fields.openedAt },
  move: machine.moves.open,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
