// Refused. Fault: 'RunTooLarge'. The runner of entry.post can't fail with run.pay's own refusal: the outer's refusals never reach down into its inner's runner.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import type { Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit } from "../ledger.ts";

void [refusesWith, AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit];

export const runners: Handler<typeof runPay> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () {
    const { entry } = yield* refusesWith(steps.post({ book, amount }), new BookClosed({ book }), new EntryUnbalanced({ short: amount }));
    yield* refusesWith(steps.post({ book, amount }), new RunTooLarge({ run })); // ← the fault
    return { run, entry };
  });
