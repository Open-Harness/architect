import { Blueprint } from "orthograph";
import { CustomerGroup } from "./thing.ts";
import * as Events from "./events.ts";

// A customer group is a group, which other customer groups sit under, or a ledger, which customers are put in (ERPNext's `is_group`).
// It is made as either; turning one into the other comes later.
export const machine = Blueprint.machine(CustomerGroup, {
  states: ["group", "ledger"],
  moves: { create: { from: [], to: ["group", "ledger"], emits: Events.CustomerGroupCreated } },
  notFrom: { exit: 40 },
});
