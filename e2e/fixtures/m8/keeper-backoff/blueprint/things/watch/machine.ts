import { Blueprint } from "orthograph";
import { Watch } from "./thing.ts";
import * as Events from "./events.ts";

// Like the Safe machines (CX-safe-machines, #1194), a move made by time at a field the machine's own moves rewrite; unlike them,
// this watch parks by leaving `watching`, where the Safe parks by clearing `nextCheckAt` (that case is `hush`).
export const machine = Blueprint.machine(Watch, {
  states: ["watching", "parked"],
  moves: {
    start: { from: [], to: "watching", emits: Events.WatchStarted },
    // A person's self-move that writes `nextCheckAt`: the keeper's row moves with it (CX-keeper call 5).
    snooze: { from: ["watching"], to: "watching", emits: Events.WatchSnoozed },
    // A self-move that clears `nextCheckAt`: an empty field arms nothing, so the keeper's row is dropped (CX-keeper call 5).
    hush: { from: ["watching"], to: "watching", emits: Events.WatchHushed },
    // Due at `nextCheckAt` itself. Each stay in `watching` writes it further out and so re-arms; parking drops the row.
    observe: { from: ["watching"], to: ["watching", "parked"], emits: Events.WatchObserved, by: Blueprint.time.after("nextCheckAt", "0 seconds") },
  },
  notFrom: { exit: 93 },
});
