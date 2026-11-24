import { Blueprint } from "orthograph";
import { ExpenseClaimType } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// ExpenseTypeTaken belongs to the rule in ../invariants.ts, and the runtime refuses it.
export default Blueprint.operation(ExpenseClaimType, {
  description: "Add a kind of expense a company pays back.",
  payload: { company: ExpenseClaimType.fields.company, expenseType: ExpenseClaimType.fields.expenseType },
  answer: { expenseClaimType: ExpenseClaimType.fields.id },
  move: machine.moves.create,
  allowed: [owner.of("company")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
