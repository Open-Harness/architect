import { Blueprint } from "orthograph";
import { Budget } from "../thing.ts";
import { machine } from "../machine.ts";
import { owners } from "../../treasury/roles.ts";

export default Blueprint.operation(Budget, {
  description: "Let someone spend from the treasury each month, up to a limit.",
  payload: { treasury: Budget.fields.treasury, holder: Budget.fields.holder, limit: Budget.fields.limit },
  answer: { budget: Budget.fields.id },
  move: machine.moves.grant,
  allowed: [owners.of("treasury")], // new: enough owners, together
  budget: { p95: "5 seconds" },
});
