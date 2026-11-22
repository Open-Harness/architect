import { Blueprint } from "orthograph";
import { Membership } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Membership, {
  description: "Mark a membership's payment missed. It lapses fourteen days later unless the payment is made.",
  payload: { membership: Membership.fields.id },
  answer: { overdueAt: Membership.fields.overdueAt },
  move: machine.moves.miss,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
