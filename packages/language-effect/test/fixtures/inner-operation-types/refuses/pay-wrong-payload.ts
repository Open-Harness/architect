// Refused. Fault: 'amount'. The runner takes the inner operation's payload: an amount that is text is refused.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import type { Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit } from "../ledger.ts";

void [refusesWith, AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit];

export const pay: Handler<typeof runPay> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () {
    if (amount > 10_000n) return yield* new RunTooLarge({ run });
    const { entry } = yield* steps.post({ book, amount: "1" }); // ← the fault
    return { run, entry };
  });
