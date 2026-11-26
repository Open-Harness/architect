// The ledger the #1079 type check compiles (CX-inner-operations, "The handler's error channel"). A pay run posts a journal entry through
// `entry.post`, an inner operation that runs two of its own (`entry.draft`, `entry.submit`): refusals two deep. `run.split` runs one inner
// operation and declares no error of its own. `book.audit` is an operation of the app that no step names. `Stranger` is declared by none.
// Every error has a field no other has, and none has an `id` or a `state` text field: `_tag` is a `string` in the type, so an error is told
// apart from another (and from the runtime's `<Thing>NotFound` and `<Thing>Not<State>`) by its fields alone.
// Written by the checks author; the builder never edits it.
import { Blueprint, type InstanceOf } from "orthograph";

export const Amount = Blueprint.value(Blueprint.uint(128));
export const Person = Blueprint.thing({ description: "Someone.", fields: { id: Blueprint.id("per") } });
export const Book = Blueprint.thing({ description: "A set of books.", fields: { id: Blueprint.id("bok"), keeper: Person.fields.id } });
export const Entry = Blueprint.thing({ description: "A journal entry.", fields: { id: Blueprint.id("ent"), book: Book.fields.id, amount: Amount } });
export const Run = Blueprint.thing({ description: "A pay run.", fields: { id: Blueprint.id("run"), book: Book.fields.id, amount: Amount } });

/** `entry.draft`'s own refusal: two deep under `run.pay`. */
export class BookClosed extends Blueprint.error({ book: Book.fields.id }, { exit: 50 }) {}
/** `entry.submit`'s own refusal: two deep under `run.pay`. */
export class EntryHasNoLines extends Blueprint.error({ entry: Entry.fields.id }, { exit: 51 }) {}
/** `entry.post`'s own refusal: one deep under `run.pay`. */
export class EntryUnbalanced extends Blueprint.error({ short: Amount }, { exit: 52 }) {}
/** `run.pay`'s own refusal. */
export class RunTooLarge extends Blueprint.error({ run: Run.fields.id }, { exit: 53 }) {}
/** `book.audit`'s own refusal: an operation of the app that no step runs. */
export class AuditLate extends Blueprint.error({ late: Blueprint.value(Blueprint.bool()) }, { exit: 54 }) {}
/** Declared by no operation. */
export class Stranger extends Blueprint.error({ note: Blueprint.value(Blueprint.text({ max: 40 })) }, { exit: 55 }) {}

export const keeper = Blueprint.role(Book, { rule: (b, who) => b.keeper === who.person });

export const entryDraft = Blueprint.operation(Entry, {
  description: "Draft a journal entry.",
  payload: { book: Entry.fields.book, amount: Entry.fields.amount },
  answer: { entry: Entry.fields.id },
  errors: [BookClosed],
  allowed: [keeper.of("book")],
  steps: { save: Blueprint.step.database() },
});
export const entrySubmit = Blueprint.operation(Entry, {
  description: "Submit a drafted journal entry.",
  payload: { entry: Entry.fields.id },
  answer: { entry: Entry.fields.id },
  errors: [EntryHasNoLines],
  allowed: [Blueprint.signedIn],
});
/** An inner operation that runs inner operations of its own. */
export const entryPost = Blueprint.operation(Entry, {
  description: "Draft and submit a journal entry.",
  payload: { book: Entry.fields.book, amount: Entry.fields.amount },
  answer: { entry: Entry.fields.id },
  errors: [EntryUnbalanced],
  allowed: [Blueprint.signedIn],
  steps: { draft: Blueprint.step.operation(entryDraft), submit: Blueprint.step.operation(entrySubmit) },
});
export const runPay = Blueprint.operation(Run, {
  description: "Pay a run, posting its journal entry.",
  payload: { run: Run.fields.id, book: Run.fields.book, amount: Run.fields.amount },
  answer: { run: Run.fields.id, entry: Entry.fields.id },
  errors: [RunTooLarge],
  allowed: [Blueprint.signedIn],
  steps: { load: Blueprint.step.database(), post: Blueprint.step.operation(entryPost) },
});
/** One inner operation, and no declared error of its own. */
export const runSplit = Blueprint.operation(Run, {
  description: "Post a run as one draft.",
  payload: { run: Run.fields.id, book: Run.fields.book, amount: Run.fields.amount },
  answer: { run: Run.fields.id },
  allowed: [Blueprint.signedIn],
  steps: { draft: Blueprint.step.operation(entryDraft) },
});
/** Three deep, under a step key no other operation uses: `run.close` runs `run.pay`, which runs `entry.post`, which runs `entry.draft`. */
export const runClose = Blueprint.operation(Run, {
  description: "Close a run by paying it.",
  payload: { run: Run.fields.id, book: Run.fields.book, amount: Run.fields.amount },
  answer: { run: Run.fields.id },
  allowed: [Blueprint.signedIn],
  steps: { wrapUp: Blueprint.step.operation(runPay) },
});
/** An operation of the app that no step names. */
export const bookAudit = Blueprint.operation(Book, {
  description: "Audit a book.",
  payload: { book: Book.fields.id },
  answer: { book: Book.fields.id },
  errors: [AuditLate],
  allowed: [Blueprint.signedIn],
});

/** A run's id, for a handler that has none in its payload: declared, never made, since this ledger is only compiled. */
export declare const someRun: InstanceOf<typeof Run>["id"];
/** A journal entry's id, declared the same way. */
export declare const someEntry: InstanceOf<typeof Entry>["id"];
