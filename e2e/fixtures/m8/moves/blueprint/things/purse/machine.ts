import { Blueprint } from "orthograph";
import { Purse } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Purse, {
  states: ["active"],
  moves: {
    open: { from: [], to: "active", emits: Events.PurseOpened },
    spend: { from: ["active"], to: "active", emits: Events.PurseSpent },
    // Lazy (K23 section 3): the keeper never fires it; it is worked out at the purse's next use.
    refill: { from: ["active"], to: "active", emits: Events.PurseRefilled, by: Blueprint.time.every("1 month", { from: "openedAt" }), lazy: true },
  },
  notFrom: { exit: 82 },
});
