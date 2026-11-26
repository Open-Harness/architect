import { Blueprint } from "orthograph";
import { Supplier } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// ERPNext sets `disabled` on the supplier's form; here it is a move, refused by the machine from any state but disabled.
export default Blueprint.operation(Supplier, {
  description: "Enable a disabled supplier again.",
  payload: { supplier: Supplier.fields.id },
  answer: { supplier: Supplier.fields.id },
  move: machine.moves.enable,
  allowed: [owner.of("supplier.company")],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "100 millis" },
});
