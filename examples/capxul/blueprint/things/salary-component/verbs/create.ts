import { Blueprint } from "orthograph";
import { SalaryComponent } from "../thing.ts";
import { machine } from "../machine.ts";
import { ComponentAccountIsGroup, ComponentAccountNotInCompany } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts): ComponentAccountNotInCompany, ComponentAccountIsGroup; then the runtime's
// SalaryComponentTaken.
export default Blueprint.operation(SalaryComponent, {
  description: "Add a part of pay, an earning or a deduction, with its default amount and the ledger it is booked to.",
  payload: {
    company: SalaryComponent.fields.company,
    salaryComponent: SalaryComponent.fields.salaryComponent,
    type: SalaryComponent.fields.type,
    amount: SalaryComponent.fields.amount,
    account: SalaryComponent.fields.account,
  },
  answer: { salaryComponent: SalaryComponent.fields.id },
  move: machine.moves.create,
  errors: [ComponentAccountNotInCompany, ComponentAccountIsGroup],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
