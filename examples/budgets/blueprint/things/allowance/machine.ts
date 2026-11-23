import { Blueprint } from "orthograph";
import { Allowance } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Allowance, {
  states: ["active", "exhausted", "revoked"], // numbered 1, 2, 3 on chain; 0 is a row that is not there (M6-chain item 2)
  moves: {
    grant: { from: [], to: "active", emits: Events.AllowanceGranted },
    spend: { from: ["active"], to: ["active", "exhausted"], emits: Events.AllowanceSpent }, // two outcomes
    revoke: { from: ["active", "exhausted"], to: "revoked", emits: Events.AllowanceRevoked },
  },
  notFrom: { exit: 40 }, // generates AllowanceNotActive, carrying the state it was in
});
