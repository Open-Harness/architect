import { Blueprint } from "orthograph";
import { Account } from "./thing.ts";
import * as Events from "./events.ts";

// An account is a group, which other accounts sit under, or a ledger, which takes entries (ERPNext's `is_group`). It is
// made as either. A group with nothing under it can be turned into a ledger (ERPNext's `convert_group_to_ledger`); the
// way back, `convert_ledger_to_group`, comes later (`decisions/CX-ledger.md`).
export const machine = Blueprint.machine(Account, {
  states: ["group", "ledger"],
  moves: {
    create: { from: [], to: ["group", "ledger"], emits: Events.AccountCreated },
    makeLedger: { from: ["group"], to: "ledger", emits: Events.AccountMadeLedger },
  },
  notFrom: { exit: 40 },
});
