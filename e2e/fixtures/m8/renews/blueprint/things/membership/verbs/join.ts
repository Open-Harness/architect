import { Blueprint } from "orthograph";
import { Membership } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Membership, {
  description: "Join the club. The membership starts now, by the world's clock.",
  payload: { name: Membership.fields.name },
  answer: { membership: Membership.fields.id, startedAt: Membership.fields.startedAt },
  move: machine.moves.join,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
