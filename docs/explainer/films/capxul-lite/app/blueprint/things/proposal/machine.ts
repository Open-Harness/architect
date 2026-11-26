import { Blueprint } from "orthograph";
import { Proposal } from "./thing.ts";
import { Treasury } from "../treasury/thing.ts";
import { owner } from "../treasury/roles.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Proposal, {
  states: ["open", "passed", "expired"],
  moves: {
    propose: { from: [], to: "open", emits: Events.ProposalOpened },
    approve: { from: ["open"], to: "open", emits: Events.ProposalApproved },
    // What an open proposal needs: enough owners to approve. The framework asks them.
    pass:    { from: ["open"], to: "passed", emits: Events.ProposalPassed,
               asks: Blueprint.atLeast(Treasury.fields.threshold, owner, "approve") }, // new
    expire:  { from: ["open"], to: "expired", emits: Events.ProposalExpired,
               by: Blueprint.time.after("openedAt", "7 days") },
  },
  notFrom: { exit: 42 },
});
