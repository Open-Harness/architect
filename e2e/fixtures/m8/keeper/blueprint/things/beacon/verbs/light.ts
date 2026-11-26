import { Blueprint } from "orthograph";
import { Beacon } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Beacon, {
  description: "Light a beacon now, by the world's clock. The keeper pings it every hour from now.",
  payload: { name: Beacon.fields.name },
  answer: { beacon: Beacon.fields.id, litAt: Beacon.fields.litAt },
  move: machine.moves.light,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { insert: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
