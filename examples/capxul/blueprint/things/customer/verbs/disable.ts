import { Blueprint } from "orthograph";
import { Customer } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// ERPNext sets `disabled` on the customer's form; here it is a move, refused by the machine from any state but active.
export default Blueprint.operation(Customer, {
  description: "Disable a customer: no payment from it can be submitted until it is enabled again.",
  payload: { customer: Customer.fields.id },
  answer: { customer: Customer.fields.id },
  move: machine.moves.disable,
  allowed: [owner.of("customer.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "100 millis" },
});
