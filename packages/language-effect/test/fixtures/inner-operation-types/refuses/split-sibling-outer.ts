// Refused. Fault: 'RunTooLarge'. run.pay also runs entry.draft (two deep), but run.pay's own refusal is not run.split's: sharing an inner shares nothing upward.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import type { Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit } from "../ledger.ts";

void [refusesWith, AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit];

export const split: Handler<typeof runSplit> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () { // ← the fault
    yield* steps.draft({ book, amount: amount / 2n });
    yield* steps.draft({ book, amount: amount - amount / 2n });
    if (amount === 5n) return yield* new RunTooLarge({ run });
    return { run };
  });
