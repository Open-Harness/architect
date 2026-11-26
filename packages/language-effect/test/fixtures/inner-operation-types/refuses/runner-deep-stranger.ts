// Refused. Fault: 'Stranger'. The runner under the step key wrapUp fails with run.pay's refusals at every depth, and with nothing no operation declares.
// The handler below is one accepts.ts holds, with only this fault; its errors must all be on the line marked below, and one must name the fault.
import { Effect } from "effect";
import { NotAllowed } from "orthograph";
import { NotFound, NotFrom, type Handler } from "../../../../src/modules/handler/types.ts";
import { refusesWith } from "../accepts.ts";
import { AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, entrySubmit, runClose, runPay, runSplit, someEntry, someRun } from "../ledger.ts";

void [refusesWith, NotAllowed, NotFound, NotFrom, AuditLate, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, Stranger, entryDraft, entryPost, entrySubmit, runClose, runPay, runSplit, someEntry, someRun];

export const close: Handler<typeof runClose> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () {
    yield* refusesWith(steps.wrapUp({ run, book, amount }), new Stranger({ note: "x" })); // ← the fault
    return { run };
  });
