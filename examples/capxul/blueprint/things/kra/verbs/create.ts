import { Blueprint } from "orthograph";
import { Kra } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// No `errors:`: KraTitleTaken belongs to the rule in ../invariants.ts, and the runtime refuses it.
export default Blueprint.operation(Kra, {
  description: "Add a key result area to a company.",
  payload: { company: Kra.fields.company, title: Kra.fields.title },
  answer: { kra: Kra.fields.id },
  move: machine.moves.create,
  allowed: [owner.of("company")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
