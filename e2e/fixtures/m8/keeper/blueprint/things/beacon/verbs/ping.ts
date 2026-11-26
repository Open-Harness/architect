import { Blueprint } from "orthograph";
import { Beacon } from "../thing.ts";
import { machine } from "../machine.ts";

// Called only by the keeper, each hour from the moment the beacon was lit.
export default Blueprint.operation(Beacon, {
  description: "Ping a lit beacon once more.",
  payload: { beacon: Beacon.fields.id },
  answer: { pings: Beacon.fields.pings, at: Beacon.fields.litAt },
  move: machine.moves.ping,
  errors: [],
  allowed: [Blueprint.keeper],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
