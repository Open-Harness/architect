// Refused. Fault: 'EntryUnbalanced'. entry.draft runs no operation: its outer entry.post's refusal is not its own.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import type { Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit } from "../ledger.ts";

void [refusesWith, AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit];

export const draft: Handler<typeof entryDraft> = ({ book, amount }, { steps }) =>
  Effect.gen(function* () { // ← the fault
    if (amount === 0n) return yield* new BookClosed({ book });
    if (amount === 5n) return yield* new EntryUnbalanced({ short: amount });
    return yield* steps.save(Effect.never);
  });
