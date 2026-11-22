import { Blueprint } from "orthograph";
import { Purse } from "../thing.ts";
import { machine } from "../machine.ts";
import { PurseExceeded } from "../errors.ts";
import { Count } from "../../../values/counts.ts";

export default Blueprint.operation(Purse, {
  description: "Spend from a purse, up to what is left this month.",
  payload: { purse: Purse.fields.id, amount: Count },
  answer: { left: Count },
  move: machine.moves.spend,
  errors: [PurseExceeded],
  allowed: [Blueprint.anyone],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
