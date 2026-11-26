import { Blueprint } from "orthograph";
import { Spend } from "../thing.ts";
import { machine } from "../machine.ts";
import { holder } from "../../budget/roles.ts";
import { Reason } from "../../../values/money.ts";
import { SealMismatch } from "../errors.ts";

export default Blueprint.operation(Spend, {
  description: "Give the reason for a payment that arrived without one. It has to match the seal.",
  payload: { spend: Spend.fields.id, reason: Blueprint.sealed(Reason) }, // new
  move: machine.moves.explain,
  allowed: [holder.of("budget")],
  errors: [SealMismatch],
  steps: { record: Blueprint.step.database() },
});
