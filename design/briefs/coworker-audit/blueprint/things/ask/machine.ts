import { Blueprint } from "orthograph";
import { Ask } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Ask, {
  states: ["waiting", "answered", "passed", "lapsed"],
  moves: {
    raise: { from: [], to: "waiting", emits: Events.AskRaised },
    answer: { from: ["waiting"], to: "answered", emits: Events.AskAnswered }, // yes, no, an option, or their own words
    // "No deadline, reminder or stand-in" today; all three are agreed (screens.md, "Asking people").
    pass: { from: ["waiting"], to: "passed", emits: Events.AskPassed }, // to the stand-in, or the next person in `then`
    lapse: { from: ["waiting"], to: "lapsed", emits: Events.AskLapsed }, // the deadline went by. Never taken as yes for an approval
  },
});
// GAP clock-moves: `pass` and `lapse` are moves made by a clock. Declared here, not runnable (`world-clock-keeper`, spiked).
// GAP waiting-list: K46 leaves open "telling people a thing is waiting on them: a list per person and how it reaches them".
// Coworker's Inbox is exactly that list. Here it is a plain read over Ask by `to` and state.
// Approvals that any Owner may answer ("first answer wins") want K46's `asks: Blueprint.atLeast(1, owner, "answer")` // new
