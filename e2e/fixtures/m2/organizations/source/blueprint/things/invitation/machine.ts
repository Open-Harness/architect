import { Blueprint } from "orthograph";
import { Invitation } from "./thing.js";
import * as Events from "./events.js";

export const machine = Blueprint.machine(Invitation, {
  states: ["pending", "accepted", "revoked"],
  moves: {
    send: { from: [], to: "pending", emits: Events.InvitationSent },
    accept: { from: ["pending"], to: "accepted", emits: Events.InvitationAccepted },
    revoke: { from: ["pending"], to: "revoked", emits: Events.InvitationRevoked },
  },
  notFrom: { exit: 40 }, // generates InvitationNotPending
});
