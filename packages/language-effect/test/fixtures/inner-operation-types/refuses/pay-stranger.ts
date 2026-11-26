// Refused. Fault: 'Stranger'. An error no operation declares is no refusal of run.pay's, however deep its inner operations go.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import type { Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit } from "../ledger.ts";

void [refusesWith, AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit];

export const pay: Handler<typeof runPay> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () { // ← the fault
    if (amount > 10_000n) return yield* new RunTooLarge({ run });
    if (amount === 5n) return yield* new Stranger({ note: "x" });
    const { entry } = yield* steps.post({ book, amount });
    return { run, entry };
  });
