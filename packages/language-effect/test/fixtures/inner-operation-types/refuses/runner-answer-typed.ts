// Refused. Fault: 'number'. The runner's answer keeps each field's type: entry is an entry's id, never a number (nor any).
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import { NotAllowed } from "orthograph";
import { NotFound, NotFrom, type Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, entrySubmit, runClose, runPay, runSplit, someEntry, someRun } from "../ledger.ts";

void [refusesWith, NotAllowed, NotFound, NotFrom, AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, entrySubmit, runClose, runPay, runSplit, someEntry, someRun];

export const answered: Handler<typeof runPay> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () {
    const posted = yield* steps.post({ book, amount });
    const wrong: number = posted.entry; // ← the fault
    void wrong;
    return { run, entry: posted.entry };
  });
