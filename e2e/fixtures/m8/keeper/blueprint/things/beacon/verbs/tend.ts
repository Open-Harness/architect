import { Blueprint } from "orthograph";
import { Beacon } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Beacon, {
  description: "Tend a lit beacon. It keeps burning, and its pings keep their hours.",
  payload: { beacon: Beacon.fields.id },
  answer: {},
  move: machine.moves.tend,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: {},
  budget: { p95: "150 millis" },
});
