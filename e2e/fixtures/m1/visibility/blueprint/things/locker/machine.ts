import { Blueprint } from "orthograph";
import { Locker } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Locker, {
  states: ["closed", "opened"],
  moves: {
    install: { from: [], to: "closed", emits: Events.LockerInstalled },
    open: { from: ["closed", "opened"], to: "opened", emits: Events.LockerOpened },
  },
  notFrom: { exit: 60 },
});
