import { Blueprint } from "orthograph";
import { Supplier } from "./thing.ts";
import * as Events from "./events.ts";

// ERPNext's `disabled` check, as a state: a supplier is made active, and can be disabled and enabled again. A disabled one
// can't be paid or pay (`validate_party_frozen_disabled`, judged on a payment's submit). Freezing comes later.
export const machine = Blueprint.machine(Supplier, {
  states: ["active", "disabled"],
  moves: {
    create: { from: [], to: "active", emits: Events.SupplierCreated },
    disable: { from: ["active"], to: "disabled", emits: Events.SupplierDisabled },
    enable: { from: ["disabled"], to: "active", emits: Events.SupplierEnabled },
  },
  notFrom: { exit: 40 },
});
