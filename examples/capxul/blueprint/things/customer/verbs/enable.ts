import { Blueprint } from "orthograph";
import { Customer } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// ERPNext sets `disabled` on the customer's form; here it is a move, refused by the machine from any state but disabled.
export default Blueprint.operation(Customer, {
  description: "Enable a disabled customer again.",
  payload: { customer: Customer.fields.id },
  answer: { customer: Customer.fields.id },
  move: machine.moves.enable,
  allowed: [owner.of("customer.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "100 millis" },
});
