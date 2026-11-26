// Must compile with no error, no cast, no `any` and no `as`. Each handler is written as the scaffold writes it (`const pay: Handler = (payload,
// { steps }) => Effect.gen(...)`), runs its inner operations as `yield* steps.<key>(payload)`, and lets their refusals through its own error
// channel: one deep (`run.split` runs `entry.draft`) and two deep (`run.pay` runs `entry.post`, which runs `entry.draft` and `entry.submit`).
// Every refusal an operation can make is its own (CX-inner-operations, call 2), so a handler may also refuse with one itself, at any depth,
// and the runner of an inner step says it may fail with every refusal of the operation it runs, its inners' too.
import { Effect } from "effect";
import { NotAllowed } from "orthograph";
import { NotFound, NotFrom, type Handler } from "../../../src/modules/handler/types.ts";
import { someEntry, BookClosed, EntryHasNoLines, EntryUnbalanced, RunTooLarge, entryDraft, entryPost, entrySubmit, runClose, runPay, runSplit } from "./ledger.ts";

/** Hands back `run` unchanged; compiles only when each refusal given is one `run` says it may fail with (the refusals never widen what it says). */
export const refusesWith = <A, E, R>(run: Effect.Effect<A, E, R>, ..._refusals: ReadonlyArray<NoInfer<E>>): Effect.Effect<A, E, R> => run;

/** Two deep: the scaffold's own shape, an inner refusal from `entry.post` or from its inners goes through as the call's. */
export const pay: Handler<typeof runPay> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () {
    if (amount > 10_000n) return yield* new RunTooLarge({ run });
    const { entry } = yield* steps.post({ book, amount });
    return { run, entry };
  });

/** One deep, and an outer that declares no error of its own. */
export const split: Handler<typeof runSplit> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () {
    yield* steps.draft({ book, amount: amount / 2n });
    yield* steps.draft({ book, amount: amount - amount / 2n });
    return { run };
  });

/** The middle operation, an inner that runs inners: its own refusal and both of its inners'. */
export const post: Handler<typeof entryPost> = ({ book, amount }, { steps }) =>
  Effect.gen(function* () {
    if (amount === 0n) return yield* new EntryUnbalanced({ short: amount });
    const { entry } = yield* steps.draft({ book, amount });
    yield* steps.submit({ entry });
    return { entry };
  });

/** An operation with no inner operation: its own refusal, and its database step as before. */
export const draft: Handler<typeof entryDraft> = ({ book, amount }, { steps }) =>
  Effect.gen(function* () {
    if (amount === 0n) return yield* new BookClosed({ book });
    return yield* steps.save(Effect.never);
  });

/** Each refusal `run.pay` can make, its own and its inners' at every depth, refused by the handler itself: all of them are the outer's. */
export const payRefuses: Handler<typeof runPay> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () {
    if (amount === 1n) return yield* new BookClosed({ book });
    if (amount === 2n) return yield* new EntryUnbalanced({ short: amount });
    const { entry } = yield* steps.post({ book, amount });
    if (amount === 3n) return yield* new EntryHasNoLines({ entry });
    if (amount === 4n) return yield* new RunTooLarge({ run });
    return { run, entry };
  });

/** The runner of each inner step fails with every refusal of the operation it runs, its inners' too. */
export const runners: Handler<typeof runPay> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () {
    const { entry } = yield* refusesWith(steps.post({ book, amount }), new BookClosed({ book }), new EntryUnbalanced({ short: amount }));
    yield* refusesWith(steps.post({ book, amount }), new EntryHasNoLines({ entry }));
    return { run, entry };
  });

/** In the middle operation, each sibling runner by its own operation's refusals. */
export const postRunners: Handler<typeof entryPost> = ({ book, amount }, { steps }) =>
  Effect.gen(function* () {
    const { entry } = yield* refusesWith(steps.draft({ book, amount }), new BookClosed({ book }));
    yield* refusesWith(steps.submit({ entry }), new EntryHasNoLines({ entry }));
    return { entry };
  });

export const splitRunner: Handler<typeof runSplit> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () {
    yield* refusesWith(steps.draft({ book, amount }), new BookClosed({ book }));
    // `entry.draft` runs no inner step, so its runtime refusals reach this runner only as its own, never through an inner's.
    yield* refusesWith(steps.draft({ book, amount }), new NotAllowed(), new NotFrom({ _tag: "EntryNotDraft", state: "x" }), new NotFound({ _tag: "BookNotFound", id: "bok_1" }));
    return { run };
  });

/** Three deep, under a step key no other operation uses: `entry.draft`'s refusal is `run.close`'s, and its runner says so. */
export const close: Handler<typeof runClose> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () {
    if (amount === 1n) return yield* new BookClosed({ book });
    yield* refusesWith(steps.wrapUp({ run, book, amount }), new BookClosed({ book }), new EntryHasNoLines({ entry: someEntry }), new RunTooLarge({ run }));
    return { run };
  });

/** An operation with no step at all: its own refusal only. */
export const submit: Handler<typeof entrySubmit> = ({ entry }) =>
  Effect.gen(function* () {
    if (entry === someEntry) return yield* new EntryHasNoLines({ entry });
    return { entry };
  });

/** A runner fails with the runtime's refusals of the operation it runs too: its access, its from-check, what its payload names. */
export const runtimeRefusals: Handler<typeof runPay> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () {
    const { entry } = yield* refusesWith(steps.post({ book, amount }), new NotAllowed(), new NotFrom({ _tag: "EntryNotDraft", state: "submitted" }), new NotFound({ _tag: "BookNotFound", id: "bok_1" }));
    return { run, entry };
  });

/** The runner's answer is the inner's declared answer, typed field by field. */
export const answered: Handler<typeof runPay> = ({ run, book, amount }, { steps }) =>
  Effect.gen(function* () {
    const posted = yield* steps.post({ book, amount });
    const entry: typeof someEntry = posted.entry;
    return { run, entry };
  });
