import { Blueprint, Schema } from "orthograph";
import { Beacon } from "../thing.ts";
import { machine } from "../machine.ts";
import { BeaconDark } from "../errors.ts";

export default Blueprint.operation(Beacon, {
  description: "Light a beacon once the slow service has answered, or refuse when it says dark.",
  payload: { origin: Blueprint.text({ max: 200 }), mode: Blueprint.value(Schema.Literals(["ok", "refuse"])) },
  answer: { beacon: Beacon.fields.id },
  move: machine.moves.light,
  errors: [BeaconDark],
  allowed: [Blueprint.anyone],
  // `load` asks the slow service; `record` asks it again and then writes the beacon.
  steps: { load: Blueprint.step.wait(), record: Blueprint.step.database() },
});
