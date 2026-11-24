import { Blueprint } from "orthograph";
import { BankAccount } from "./thing.ts";
import * as Events from "./events.ts";

// A Bridge virtual account is `activated` or `deactivated`; ERPNext's Bank Account has `disabled`. Closing deactivates
// it at Bridge (`POST .../virtual_accounts/{id}/deactivate`). Reopening comes with the move that needs it.
export const machine = Blueprint.machine(BankAccount, {
  states: ["open", "closed"],
  moves: {
    open: { from: [], to: "open", emits: Events.BankAccountOpened },
    close: { from: ["open"], to: "closed", emits: Events.BankAccountClosed },
  },
  notFrom: { exit: 40 },
});
