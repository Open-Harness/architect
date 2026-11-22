import { Blueprint } from "orthograph";
import { Payment } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Payment, {
  states: ["pending", "settled"],
  moves: {
    start: { from: [], to: "pending", emits: Events.PaymentStarted },
    settle: { from: ["pending"], to: "settled", emits: Events.PaymentSettled },
  },
  notFrom: { exit: 80 }, // generates PaymentNotPending
});
