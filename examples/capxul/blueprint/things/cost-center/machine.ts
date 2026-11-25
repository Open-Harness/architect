import { Blueprint } from "orthograph";
import { CostCenter } from "./thing.ts";
import * as Events from "./events.ts";

// A cost center is a group or a ledger (ERPNext's `is_group`), made as either. Turning one into the other comes later.
export const machine = Blueprint.machine(CostCenter, {
  states: ["group", "ledger"],
  moves: { create: { from: [], to: ["group", "ledger"], emits: Events.CostCenterCreated } },
  notFrom: { exit: 40 },
});
