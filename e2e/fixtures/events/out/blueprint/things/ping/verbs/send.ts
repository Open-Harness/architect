import { Blueprint } from "orthograph";
import { Ping } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Ping, {
  description: "Ping an address. The ping is announced from its own actor; the notifier delivers it.",
  payload: { to: Ping.fields.to },
  answer: { ping: Ping.fields.id },
  move: machine.moves.send,
  errors: [],
  allowed: [Blueprint.anyone],
  steps: { insert: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
