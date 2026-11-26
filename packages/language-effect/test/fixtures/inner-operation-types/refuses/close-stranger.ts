// Refused. Fault: 'Stranger'. Three deep, under a step key no other operation uses: an error no operation declares is still no refusal of run.close's.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import { NotAllowed } from "orthograph";
import { NotFound, NotFrom, type Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, entrySubmit, runClose, runPay, runSplit, someEntry, someRun } from "../ledger.ts";

void [refusesWith, NotAllowed, NotFound, NotFrom, AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, entrySubmit, runClose, runPay, runSplit, someEntry, someRun];

export const close: Handler<typeof runClose> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () { // ← the fault
    if (amount === 1n) return yield* new BookClosed({ book });
    if (amount === 5n) return yield* new Stranger({ note: "x" });
    yield* steps.wrapUp({ run, book, amount });
    return { run };
  });
