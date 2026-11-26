// Refused. Fault: 'save'. A handler gets its own steps' runners only: save is entry.draft's database step, never entry.post's.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import { NotAllowed } from "orthograph";
import { NotFound, NotFrom, type Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, entrySubmit, runClose, runPay, runSplit, someEntry, someRun } from "../ledger.ts";

void [refusesWith, NotAllowed, NotFound, NotFrom, AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, entrySubmit, runClose, runPay, runSplit, someEntry, someRun];

export const post: Handler<typeof entryPost> = ({ book, amount }, { steps }) =>
  Effect.gen(function* () {
    if (amount === 0n) return yield* new EntryUnbalanced({ short: amount });
    const { entry } = yield* steps.draft({ book, amount });
    yield* steps.submit({ entry });
    // Reached for, not run: running it would make the whole handler's type unknown, an error away from the fault.
    const save = steps.save; // ← the fault
    void save;
    return { entry };
  });
