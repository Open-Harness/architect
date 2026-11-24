import { Blueprint } from "orthograph";
import { Eval } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Eval, {
  states: ["queued", "delivered", "decided", "unavailable"],
  moves: {
    started: { from: [], to: "queued", emits: Events.EvalStarted },
    delivered: { from: ["queued"], to: "delivered", emits: Events.EvalDelivered },
    decided: { from: ["delivered"], to: "decided", emits: Events.EvalDecided },
    expired: { from: ["delivered"], to: "unavailable", emits: Events.EvalExpired },
  },
  notFrom: { exit: 85 },
});
