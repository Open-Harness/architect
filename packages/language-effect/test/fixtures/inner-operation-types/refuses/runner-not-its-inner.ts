// Refused. Fault: 'BookClosed'. Under entry.post, the runner of entry.submit fails with entry.submit's refusals only: entry.draft's is its sibling's, not its own.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import type { Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit } from "../ledger.ts";

void [refusesWith, AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit];

export const postRunners: Handler<typeof entryPost> = ({ book, amount }, { steps }) =>
  Effect.gen(function* () {
    const { entry } = yield* refusesWith(steps.draft({ book, amount }), new BookClosed({ book }));
    yield* refusesWith(steps.submit({ entry }), new BookClosed({ book })); // ← the fault
    return { entry };
  });
