import { Blueprint } from "orthograph";
import { Membership } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Membership, {
  description: "Make an overdue payment. The membership is active again.",
  payload: { membership: Membership.fields.id },
  answer: {},
  move: machine.moves.pay,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: {},
  budget: { p95: "150 millis" },
});
