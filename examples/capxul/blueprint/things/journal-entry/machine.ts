import { Blueprint } from "orthograph";
import { JournalEntry } from "./thing.ts";
import * as Events from "./events.ts";

// ERPNext's docstatus: a draft, then submitted (posting its ledger lines), then cancelled (posting their reversals). A
// draft isn't cancelled, as in Frappe; amending and deleting a draft come later.
export const machine = Blueprint.machine(JournalEntry, {
  states: ["draft", "submitted", "cancelled"],
  moves: {
    create: { from: [], to: "draft", emits: Events.JournalEntryDrafted },
    submit: { from: ["draft"], to: "submitted", emits: Events.JournalEntrySubmitted },
    cancel: { from: ["submitted"], to: "cancelled", emits: Events.JournalEntryCancelled },
  },
  notFrom: { exit: 40 },
});
