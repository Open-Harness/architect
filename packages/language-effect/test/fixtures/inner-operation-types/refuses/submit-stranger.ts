// Refused. Fault: 'Stranger'. An operation with no step at all keeps its own declared errors and nothing else.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import { NotAllowed } from "orthograph";
import { NotFound, NotFrom, type Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, entrySubmit, runClose, runPay, runSplit, someEntry, someRun } from "../ledger.ts";

void [refusesWith, NotAllowed, NotFound, NotFrom, AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, entrySubmit, runClose, runPay, runSplit, someEntry, someRun];

export const submit: Handler<typeof entrySubmit> = ({ entry }) =>
  Effect.gen(function* () { // ← the fault
    if (entry === someEntry) return yield* new EntryHasNoLines({ entry });
    if (entry !== someEntry) return yield* new Stranger({ note: "x" });
    return { entry };
  });
