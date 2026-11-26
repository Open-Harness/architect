// Refused. Fault: 'NotFound'. The runtime refusals come with an inner step: entry.draft runs none, so its handler may not refuse with a NotFound itself.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import { NotAllowed } from "orthograph";
import { NotFound, NotFrom, type Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, entrySubmit, runClose, runPay, runSplit, someEntry, someRun } from "../ledger.ts";

void [refusesWith, NotAllowed, NotFound, NotFrom, AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, entrySubmit, runClose, runPay, runSplit, someEntry, someRun];

export const draft: Handler<typeof entryDraft> = ({ book, amount }, { steps }) =>
  Effect.gen(function* () { // ← the fault
    if (amount === 0n) return yield* new BookClosed({ book });
    if (amount === 5n) return yield* Effect.fail(new NotFound({ _tag: "BookNotFound", id: "bok_1" }));
    return yield* steps.save(Effect.never);
  });
