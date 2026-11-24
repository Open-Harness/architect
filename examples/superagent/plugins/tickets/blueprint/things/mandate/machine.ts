import { Blueprint } from "orthograph";
import { Mandate } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Mandate, {
  states: ["held", "withdrawn", "revoked"],
  moves: {
    hold: { from: [], to: "held", emits: Events.MandateHeld },
    withdraw: { from: ["held"], to: "withdrawn", emits: Events.MandateWithdrawn },
    revalidate: { from: ["withdrawn", "held"], to: ["held", "revoked"], emits: Events.MandateRevalidated },
  },
  notFrom: { exit: 91 },
});
