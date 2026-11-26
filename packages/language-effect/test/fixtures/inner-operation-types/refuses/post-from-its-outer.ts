// Refused. Fault: 'RunTooLarge'. Refusals go up, never down: entry.post runs under run.pay, but run.pay's refusal is not entry.post's.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import type { Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit, someRun } from "../ledger.ts";

void [refusesWith, AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit];

export const post: Handler<typeof entryPost> = ({ book, amount }, { steps }) =>
  Effect.gen(function* () { // ← the fault
    if (amount === 0n) return yield* new EntryUnbalanced({ short: amount });
    const { entry } = yield* steps.draft({ book, amount });
    yield* steps.submit({ entry });
    if (amount === 5n) return yield* new RunTooLarge({ run: someRun });
    return { entry };
  });
