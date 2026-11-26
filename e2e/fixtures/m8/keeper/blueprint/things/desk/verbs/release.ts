import { Blueprint } from "orthograph";
import { Desk } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Desk, {
  description: "Release a held desk.",
  payload: { desk: Desk.fields.id },
  answer: {},
  move: machine.moves.release,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: {},
  budget: { p95: "150 millis" },
});
