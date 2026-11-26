import { Blueprint } from "orthograph";
import { Desk } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Desk, {
  description: "Hold a desk now, by the world's clock. It expires an hour later unless it is released.",
  payload: { name: Desk.fields.name },
  answer: { desk: Desk.fields.id, heldAt: Desk.fields.heldAt },
  move: machine.moves.hold,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { insert: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
