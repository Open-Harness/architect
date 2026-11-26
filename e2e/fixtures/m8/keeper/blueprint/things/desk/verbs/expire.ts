import { Blueprint } from "orthograph";
import { Desk } from "../thing.ts";
import { machine } from "../machine.ts";

// Called only by the keeper, an hour after the desk was held.
export default Blueprint.operation(Desk, {
  description: "Expire a desk held for an hour.",
  payload: { desk: Desk.fields.id },
  answer: { at: Desk.fields.heldAt },
  move: machine.moves.expire,
  errors: [],
  allowed: [Blueprint.keeper],
  steps: {},
  budget: { p95: "150 millis" },
});
