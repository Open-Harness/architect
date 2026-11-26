import { Blueprint } from "orthograph";
import { Budget } from "../thing.ts";
import { machine } from "../machine.ts";
import { ProposalPassed } from "../../proposal/events.ts";

// Nobody calls this. A proposal that passes makes it, in the same transaction.
export default Blueprint.operation(Budget, {
  description: "Let someone spend from the treasury each month, up to a limit.",
  payload: { treasury: Budget.fields.treasury, holder: Budget.fields.holder, limit: Budget.fields.limit },
  answer: { budget: Budget.fields.id },
  move: machine.moves.grant,
  allowed: [Blueprint.system],
  on: [Blueprint.on(ProposalPassed, (e) => ({ treasury: e.treasury, holder: e.holder, limit: e.limit }))],
});
