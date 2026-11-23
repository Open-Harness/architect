import { Blueprint } from "orthograph";
import { Input } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Input, {
  states: ["waiting", "routed", "delivered", "failed"],
  moves: {
    stored: { from: [], to: "waiting", emits: Events.InputStored },
    routed: { from: ["waiting"], to: "routed", emits: Events.InputRouted },
    requeued: { from: ["routed", "failed"], to: "waiting", emits: Events.InputStored },
    delivered: { from: ["routed"], to: "delivered", emits: Events.InputDelivered },
    failed: { from: ["routed"], to: "failed", emits: Events.InputFailed },
  },
  notFrom: { exit: 98 },
});
