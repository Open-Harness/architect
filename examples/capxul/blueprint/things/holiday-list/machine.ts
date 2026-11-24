import { Blueprint } from "orthograph";
import { HolidayList } from "./thing.ts";
import * as Events from "./events.ts";

// ERPNext's Holiday List has no lifecycle. Adding a weekly off changes its holidays and count, and leaves it active.
export const machine = Blueprint.machine(HolidayList, {
  states: ["active"],
  moves: {
    create: { from: [], to: "active", emits: Events.HolidayListCreated },
    addWeeklyOff: { from: ["active"], to: "active", emits: Events.WeeklyOffAdded },
  },
  notFrom: { exit: 40 },
});
