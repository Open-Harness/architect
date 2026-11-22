import { Blueprint } from "orthograph";
import { Membership } from "../thing.ts";
import { machine } from "../machine.ts";

// Called only by the keeper, fourteen days after the payment was missed.
export default Blueprint.operation(Membership, {
  description: "Let an overdue membership lapse.",
  payload: { membership: Membership.fields.id },
  answer: { at: Membership.fields.overdueAt },
  move: machine.moves.lapse,
  errors: [],
  allowed: [Blueprint.keeper],
  steps: {},
  budget: { p95: "150 millis" },
});
