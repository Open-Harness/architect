import { Blueprint } from "orthograph";
import { Watch } from "./thing.ts";
import * as Events from "./events.ts";

// The Safe machines' shape (CX-safe-machines, #1194): a move made by time at a field the machine's own moves rewrite.
export const machine = Blueprint.machine(Watch, {
  states: ["watching", "parked"],
  moves: {
    start: { from: [], to: "watching", emits: Events.WatchStarted },
    // A person's self-move that writes `nextCheckAt`: the keeper's row moves with it (CX-keeper call 5).
    snooze: { from: ["watching"], to: "watching", emits: Events.WatchSnoozed },
    // Due at `nextCheckAt` itself. Each stay in `watching` writes it further out and so re-arms; parking drops the row.
    observe: { from: ["watching"], to: ["watching", "parked"], emits: Events.WatchObserved, by: Blueprint.time.after("nextCheckAt", "0 seconds") },
  },
  notFrom: { exit: 93 },
});
