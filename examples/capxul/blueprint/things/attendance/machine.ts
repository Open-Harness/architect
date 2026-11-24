import { Blueprint } from "orthograph";
import { Attendance } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS submits an attendance as it is marked; cancelling and amending it come later. An approved attendance request
// marks days too, and may change the status of one already marked (`create_or_update_attendance`), with no move.
export const machine = Blueprint.machine(Attendance, {
  states: ["marked"],
  moves: {
    mark: { from: [], to: "marked", emits: Events.AttendanceMarked },
  },
  notFrom: { exit: 40 },
});
