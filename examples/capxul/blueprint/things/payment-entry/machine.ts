import { Blueprint } from "orthograph";
import { PaymentEntry } from "./thing.ts";
import * as Events from "./events.ts";

// ERPNext's docstatus: a draft, then submitted (posting its two ledger lines), then cancelled (posting their
// reversals). A draft isn't cancelled, as in Frappe; amending and deleting a draft come later.
export const machine = Blueprint.machine(PaymentEntry, {
  states: ["draft", "submitted", "cancelled"],
  moves: {
    create: { from: [], to: "draft", emits: Events.PaymentEntryDrafted },
    submit: { from: ["draft"], to: "submitted", emits: Events.PaymentEntrySubmitted },
    cancel: { from: ["submitted"], to: "cancelled", emits: Events.PaymentEntryCancelled },
  },
  notFrom: { exit: 40 },
});
