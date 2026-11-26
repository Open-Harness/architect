import { Blueprint } from "orthograph";
import { Safe } from "./thing.ts";
import * as Events from "./events.ts";

// S1 records a Safe, and nothing is on chain: `counterfactual` is its only state. S3 adds `claimed` (a person's,
// deployed with their key in the bootstrap key's place) and `deployed` (a company's) (CX-safe, section 1).
export const machine = Blueprint.machine(Safe, {
  states: ["counterfactual"],
  moves: {
    record: { from: [], to: "counterfactual", emits: Events.PersonalSafeRecorded },
    recordCompany: { from: [], to: "counterfactual", emits: Events.CompanySafeRecorded },
  },
  notFrom: { exit: 40 },
});
