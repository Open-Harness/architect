import { Blueprint } from "orthograph";
import { Membership } from "../thing.ts";
import { machine } from "../machine.ts";

// Called only by the keeper, when the move's time comes (K23 section 3).
export default Blueprint.operation(Membership, {
  description: "Renew a membership for one more month.",
  payload: { membership: Membership.fields.id },
  answer: { period: Membership.fields.period, at: Membership.fields.startedAt },
  move: machine.moves.renew,
  errors: [],
  allowed: [Blueprint.keeper],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
