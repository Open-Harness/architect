import { Blueprint } from "orthograph";
import { Beacon } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Beacon, {
  description: "Douse a lit beacon: the keeper pings it no more.",
  payload: { beacon: Beacon.fields.id },
  answer: {},
  move: machine.moves.douse,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: {},
  budget: { p95: "150 millis" },
});
