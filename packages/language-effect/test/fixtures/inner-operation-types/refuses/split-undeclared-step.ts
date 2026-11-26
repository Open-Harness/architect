// Refused. Fault: 'submit'. No step, no runner: run.split declares no submit step, so it has no runner for entry.submit.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import type { Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit } from "../ledger.ts";

void [refusesWith, AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, runPay, runSplit];

export const split: Handler<typeof runSplit> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () {
    yield* steps.draft({ book, amount });
    // Reached for, not run: running it would make the whole handler's type unknown, an error away from the fault.
    const submit = steps.submit; // ← the fault
    void submit;
    return { run };
  });
