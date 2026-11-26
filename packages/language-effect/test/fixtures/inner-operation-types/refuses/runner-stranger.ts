// Refused. Fault: 'Stranger'. The runner of entry.post fails with entry.post's refusals and its inners', never with one no operation declares.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import type { Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit } from "../ledger.ts";

void [refusesWith, AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit];

export const runners: Handler<typeof runPay> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () {
    const { entry } = yield* refusesWith(steps.post({ book, amount }), new BookClosed({ book }), new EntryUnbalanced({ short: amount }));
    yield* refusesWith(steps.post({ book, amount }), new Stranger({ note: "x" })); // ← the fault
    return { run, entry };
  });
