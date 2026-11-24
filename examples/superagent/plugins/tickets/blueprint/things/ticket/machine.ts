import { Blueprint } from "orthograph";
import { Ticket } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Ticket, {
  states: ["open", "ended", "stopped"],
  moves: {
    accept: { from: [], to: "open", emits: Events.TicketCreated },
    end: { from: ["open"], to: "ended", emits: Events.TicketEnded },
    resume: { from: ["ended"], to: "open", emits: Events.TicketResumed },
    stop: { from: ["open", "ended"], to: "stopped", emits: Events.TicketStopped },
  },
  notFrom: { exit: 90 },
});
