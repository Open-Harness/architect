import { Blueprint } from "orthograph";
import { OutgoingMessage } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(OutgoingMessage, {
  states: ["pending", "sent", "dropped"],
  moves: {
    queued: { from: [], to: "pending", emits: Events.ReplyQueued },
    requeued: { from: ["pending"], to: "pending", emits: Events.ReplyQueued },
    settled: { from: ["pending"], to: ["pending", "sent", "dropped"], emits: Events.ReplySettled },
    withdrawn: { from: ["pending"], to: "dropped", emits: Events.ReplyWithdrawn },
  },
  notFrom: { exit: 101 },
});
