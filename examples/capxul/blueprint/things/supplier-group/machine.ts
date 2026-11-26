import { Blueprint } from "orthograph";
import { SupplierGroup } from "./thing.ts";
import * as Events from "./events.ts";

// A supplier group is a group, which other supplier groups sit under, or a ledger, which suppliers are put in (ERPNext's `is_group`).
// It is made as either; turning one into the other comes later.
export const machine = Blueprint.machine(SupplierGroup, {
  states: ["group", "ledger"],
  moves: { create: { from: [], to: ["group", "ledger"], emits: Events.SupplierGroupCreated } },
  notFrom: { exit: 40 },
});
