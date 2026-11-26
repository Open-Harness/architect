import { Blueprint } from "orthograph";
import { Supplier } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// ERPNext sets `disabled` on the supplier's form; here it is a move, refused by the machine from any state but active.
export default Blueprint.operation(Supplier, {
  description: "Disable a supplier: no payment to it can be submitted until it is enabled again.",
  payload: { supplier: Supplier.fields.id },
  answer: { supplier: Supplier.fields.id },
  move: machine.moves.disable,
  allowed: [owner.of("supplier.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "100 millis" },
});
