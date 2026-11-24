import { Blueprint } from "orthograph";
import { Branch } from "./thing.ts";
import * as Events from "./events.ts";

// ERPNext's Branch has no lifecycle.
export const machine = Blueprint.machine(Branch, {
  states: ["active"],
  moves: {
    create: { from: [], to: "active", emits: Events.BranchCreated },
  },
  notFrom: { exit: 40 },
});
