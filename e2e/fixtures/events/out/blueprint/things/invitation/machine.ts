import { Blueprint } from "orthograph";
import { Invitation } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Invitation, {
  states: ["sent"],
  moves: {
    send: { from: [], to: "sent", emits: Events.InvitationSent },
  },
  notFrom: { exit: 80 }, // generates InvitationNotSent
});
