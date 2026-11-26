// Refused. Fault: 'entry'. The handler answers the whole declared answer: entry left out is refused, inner steps or not.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import { NotAllowed } from "orthograph";
import { NotFound, NotFrom, type Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, entrySubmit, runClose, runPay, runSplit, someEntry, someRun } from "../ledger.ts";

void [refusesWith, NotAllowed, NotFound, NotFrom, AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, entrySubmit, runClose, runPay, runSplit, someEntry, someRun];

export const pay: Handler<typeof runPay> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () { // ← the fault
    if (amount > 10_000n) return yield* new RunTooLarge({ run });
    yield* steps.post({ book, amount });
    return { run };
  });
