import { Blueprint } from "orthograph";
import { Lamp } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Lamp, {
  states: ["lit"],
  moves: { glow: { from: [], to: "lit", emits: Events.LampLit } },
  notFrom: { exit: 60 },
});
