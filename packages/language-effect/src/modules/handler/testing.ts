// The scratch ledger the #1079 checks run on (CX-inner-operations): a pay run posts one journal entry by drafting it (`entry.draft`, which writes its
// line) and submitting it (`entry.submit`, which needs a line), each run through a step that declares it, `Blueprint.step.operation(entryDraft)`, as
// `steps.draft(payload)`. Served through `Handlers.serve` over `storeMemory`, as the generated server serves them: each inner operation on its own, and
// handed to the outer as `operations: { <step>: <the inner operation's Served> }`. Read by inner-operation.test.ts and inner-operation-rules.test.ts.
// Written by the checks author for Goal 16; the builder never edits it. The step kind and the `operations` wiring are reached through casts until they exist.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Cause, Effect, Exit, Layer, Tracer } from "effect";
import { Blueprint } from "orthograph";
import { ErrorNames, EventNames } from "orthograph/server";
import { storeMemory } from "#modules/records/service.js";
import { Records } from "#modules/records/types.js";
import { BusyLive } from "#modules/work/service.js";
import { Handlers } from "./service.ts";
// ---- the scratch ledger ----

export const Amount = Blueprint.value(Blueprint.uint(128));
export const Ref = Blueprint.value(Blueprint.text({ max: 20 }));
export const Person = Blueprint.thing({ description: "Someone.", fields: { id: Blueprint.id("per") } });
export const Book = Blueprint.thing({ description: "A set of books.", fields: { id: Blueprint.id("bok"), keeper: Person.fields.id, closed: Blueprint.value(Blueprint.bool()) } });
export const Entry = Blueprint.thing({ description: "A journal entry.", fields: { id: Blueprint.id("ent"), book: Book.fields.id, amount: Amount, ref: Ref } });
export const Line = Blueprint.thing({ description: "A journal entry's line.", fields: { id: Blueprint.id("lin"), entry: Entry.fields.id, amount: Amount } });
export const Run = Blueprint.thing({ description: "A pay run.", fields: { id: Blueprint.id("run"), book: Book.fields.id, amount: Amount, ref: Ref, posted: Blueprint.value(Blueprint.text({ max: 40 })) } });

export const EntryDrafted = Blueprint.event({ entry: Entry.fields.id, amount: Amount });
EventNames.name(EntryDrafted, "EntryDrafted");
export const EntrySubmitted = Blueprint.event({ entry: Entry.fields.id });
EventNames.name(EntrySubmitted, "EntrySubmitted");
export const RunPaid = Blueprint.event({ run: Run.fields.id, entry: Entry.fields.id });
EventNames.name(RunPaid, "RunPaid");
export const entryMachine = Blueprint.machine(Entry, {
  states: ["draft", "submitted"],
  moves: { draft: { from: [], to: "draft", emits: EntryDrafted }, submit: { from: ["draft"], to: "submitted", emits: EntrySubmitted } },
  notFrom: { exit: 40 },
});
export const runMachine = Blueprint.machine(Run, { states: ["open", "paid"], moves: { pay: { from: ["open"], to: "paid", emits: RunPaid } }, notFrom: { exit: 41 } });

export class BookClosed extends Blueprint.error({ book: Book.fields.id }, { exit: 50 }) {}
ErrorNames.name(BookClosed, "BookClosed");
export class EntryHasNoLines extends Blueprint.error({ entry: Entry.fields.id }, { exit: 51 }) {}
ErrorNames.name(EntryHasNoLines, "EntryHasNoLines");
export class EntryRefTaken extends Blueprint.error({ ref: Ref }, { exit: 52 }) {}
ErrorNames.name(EntryRefTaken, "EntryRefTaken");
export class RunTooLarge extends Blueprint.error({ run: Run.fields.id }, { exit: 53 }) {}
ErrorNames.name(RunTooLarge, "RunTooLarge");
export const oneRefPerBook = Blueprint.invariant.unique(Entry.fields.ref, { refuse: EntryRefTaken });
export const rules = [{ name: "entry.oneRefPerBook", rule: oneRefPerBook }];

/** Whoever the book names as its keeper. */
export const keeper = Blueprint.role(Book, { rule: (b, who) => b.keeper === who.person });

/** `Blueprint.step.operation(op)`, the step that declares an inner operation; the step's literal until it exists, so this file loads on main. */
export const operationStep = (op: unknown): any => {
  const make = (Blueprint.step as { operation?: (o: unknown) => unknown }).operation;
  return make === undefined ? { kind: "step", type: "operation", operation: op } : make(op);
};

export const entryDraft = Blueprint.operation(Entry, {
  description: "Draft a journal entry with its line.",
  payload: { book: Entry.fields.book, amount: Entry.fields.amount, ref: Entry.fields.ref },
  // The amount too, a bigint: the outer is handed the inner's answer as code has it, never its wire form.
  answer: { entry: Entry.fields.id, amount: Entry.fields.amount },
  move: entryMachine.moves.draft,
  errors: [BookClosed],
  allowed: [keeper.of("book")],
  steps: { save: Blueprint.step.database({ writes: [Entry, Line] }) },
});
export const entrySubmit = Blueprint.operation(Entry, {
  description: "Submit a drafted journal entry.",
  payload: { entry: Entry.fields.id },
  answer: { entry: Entry.fields.id },
  move: entryMachine.moves.submit,
  errors: [EntryHasNoLines],
  allowed: [keeper.of("entry.book")],
});
// Anyone signed in may ask for a run to be paid: the entry's keeper rule, judged inside, is the one that says who may post.
export const runPay = Blueprint.operation(Run, {
  description: "Pay a run, posting its journal entry.",
  payload: { run: Run.fields.id },
  answer: { run: Run.fields.id, entry: Entry.fields.id },
  move: runMachine.moves.pay,
  errors: [RunTooLarge],
  allowed: [Blueprint.signedIn],
  steps: { load: Blueprint.step.database({ writes: [Run] }), draft: operationStep(entryDraft), submit: operationStep(entrySubmit) },
});
// Submit an entry already made, with no move of its own: where the entry's own machine refuses.
export const runRepost = Blueprint.operation(Run, {
  description: "Submit a run's entry again.",
  payload: { run: Run.fields.id, entry: Entry.fields.id },
  answer: { entry: Entry.fields.id },
  allowed: [Blueprint.signedIn],
  steps: { submit: operationStep(entrySubmit) },
});
// Check a book no role reads, so a missing one is BookNotFound; run by an outer open to anyone.
export const bookCheck = Blueprint.operation(Book, {
  description: "Check a book.", payload: { book: Book.fields.id }, answer: { book: Book.fields.id }, allowed: [Blueprint.signedIn],
});
export const runPeek = Blueprint.operation(Run, {
  description: "Peek at a book.", payload: { book: Book.fields.id }, answer: { book: Book.fields.id }, allowed: [Blueprint.anyone],
  steps: { check: operationStep(bookCheck) },
});
// Close a run by paying it: an inner operation that runs inner operations of its own.
export const runClose = Blueprint.operation(Run, {
  description: "Close a run by paying it.",
  payload: { run: Run.fields.id },
  answer: { run: Run.fields.id },
  allowed: [Blueprint.signedIn],
  steps: { pay: operationStep(runPay) },
});

// ---- the handlers ----

/** `steps.<key>(payload)`, the inner operation's runner. Until it is built, the step's runner is a database step's, which takes an Effect: named, not a TypeError. */
export const inner = (context: any, key: string, payload: unknown): Effect.Effect<any, any, any> =>
  Effect.suspend(() => context.steps[key](payload) as Effect.Effect<any, any, any>).pipe(
    Effect.catchDefect((defect) => Effect.die(defect instanceof TypeError && /pipe is not a function/.test(defect.message)
      ? new Error(`steps.${key} runs no operation: Blueprint.step.operation and its runner are not built (#1079)`)
      : defect)),
  );

export const LIMIT = 10_000n;
/** What a test changes and watches: each handler's runs, what the pay handler saw, and a hook between the inner steps and the outer's own writes. */
export interface Hooks {
  readonly ran: Array<string>;
  readonly seen: Array<Record<string, unknown>>;
  /** The subject each `entry.submit` was handed: the entry its from-check read. */
  readonly subjects: Array<unknown>;
  /** Called once per attempt of `run.pay`, after both inner steps and before the run is written. */
  between?: (attempt: number) => Effect.Effect<void, never, any>;
  /** What `run.repost` was handed under `steps.draft`, a step it never declared. */
  undeclared?: unknown;
  /** `entry.draft` answers this instead of its entry (an answer outside its declaration). */
  draftAnswer?: unknown;
}

export const draftHandler = (hooks: Hooks) => ({ amount }: any, context: any) => Effect.gen(function* () {
  hooks.ran.push("entry.draft");
  const book = context.refs?.book;
  if (book?.closed === true) {
    // The log that decided the refusal: on the inner operation's span, as `refusal.log`.
    yield* Effect.logInfo("the book is closed");
    return yield* Effect.fail(new BookClosed({ book: book.id }));
  }
  const records = yield* Records;
  // A line of 0 is left out, as HRMS's `if amt`: an entry of 0 has none, and its submit refuses.
  if (amount > 0n) yield* records.insert(Line, { id: `lin_${String(context.id).slice(4)}` as never, entry: context.id, amount });
  yield* context.move();
  return hooks.draftAnswer ?? { entry: context.id, amount };
});
export const submitHandler = (hooks: Hooks) => ({ entry }: any, context: any) => Effect.gen(function* () {
  hooks.ran.push("entry.submit");
  hooks.subjects.push(context.subject);
  const records = yield* Records;
  const { items } = yield* records.list({ thing: Line, where: { entry }, state: undefined, order: "oldest", limit: 10, after: undefined });
  if (items.length === 0) return yield* Effect.fail(new EntryHasNoLines({ entry }));
  yield* context.move();
  return { entry };
});
export const payHandler = (hooks: Hooks) => (_payload: any, context: any) => Effect.gen(function* () {
  hooks.ran.push("run.pay");
  const run = context.subject;
  const records = yield* Records;
  const drafted: any = yield* inner(context, "draft", { book: run.book, amount: run.amount, ref: run.ref });
  hooks.ran.push("run.pay after draft");
  const afterDraft = yield* records.find(Entry, drafted.entry);
  const lines = yield* records.list({ thing: Line, where: { entry: drafted.entry }, state: undefined, order: "oldest", limit: 10, after: undefined });
  yield* inner(context, "submit", { entry: drafted.entry });
  const afterSubmit = yield* records.find(Entry, drafted.entry);
  hooks.seen.push({ afterDraft, lines: lines.items, afterSubmit, answered: typeof drafted.amount });
  if (hooks.between !== undefined) yield* hooks.between(hooks.ran.filter((r) => r === "run.pay").length);
  if (run.amount > LIMIT) return yield* Effect.fail(new RunTooLarge({ run: run.id }));
  // In the outer's own database step: the inner steps sit beside the others, never in their place.
  yield* context.steps.load(records.update(Run, run.id, { posted: drafted.entry }));
  yield* context.move();
  return { run: run.id, entry: drafted.entry };
});
export const repostHandler = (hooks: Hooks) => ({ entry }: any, context: any) => Effect.gen(function* () {
  hooks.ran.push("run.repost");
  hooks.undeclared = context.steps.draft;
  return yield* inner(context, "submit", { entry });
});

export const closeHandler = (hooks: Hooks) => ({ run }: any, context: any) => Effect.gen(function* () {
  hooks.ran.push("run.close");
  yield* inner(context, "pay", { run });
  return { run };
});

/** The five operations served as the generated server serves them: each inner one on its own, and handed to the outer by its step's key. */
export const serve = (hooks: Hooks): Record<"draft" | "submit" | "pay" | "repost" | "close" | "peek", any> => {
  const draft = Handlers.serve({ name: "entry.draft", operation: entryDraft, handler: draftHandler(hooks), invariants: { EntryRefTaken: "entry.oneRefPerBook" } } as never);
  const submit = Handlers.serve({ name: "entry.submit", operation: entrySubmit, handler: submitHandler(hooks), notFrom: "EntryNotDraft" } as never);
  const pay = Handlers.serve({ name: "run.pay", operation: runPay, handler: payHandler(hooks), notFrom: "RunNotOpen", operations: { draft, submit } } as never);
  // Wired with the draft too, which it doesn't declare: no step, no runner.
  const repost = Handlers.serve({ name: "run.repost", operation: runRepost, handler: repostHandler(hooks), operations: { draft, submit } } as never);
  const close = Handlers.serve({ name: "run.close", operation: runClose, handler: closeHandler(hooks), operations: { pay } } as never);
  const check = Handlers.serve({ name: "book.check", operation: bookCheck, handler: (({ book }: any) => Effect.succeed({ book })) as never, notFound: { book: "BookNotFound" } } as never);
  const peek = Handlers.serve({ name: "run.peek", operation: runPeek, handler: ((payload: any, context: any) => inner(context, "check", payload)) as never, operations: { check } } as never);
  return { draft, submit, pay, repost, close, peek };
};

// ---- the world ----

export const ada = { kind: "person", person: "per_ada", via: "session" } as const;
export const bob = { kind: "person", person: "per_bob", via: "session" } as const;
export const seed = () => [
  [Person, { id: "per_ada" }], [Person, { id: "per_bob" }],
  [Book, { id: "bok_open", keeper: "per_ada", closed: false }],
  [Book, { id: "bok_shut", keeper: "per_ada", closed: true }],
  [Run, { id: "run_1", book: "bok_open", amount: 500n, ref: "R-1", posted: "", state: "open" }],
  [Run, { id: "run_shut", book: "bok_shut", amount: 500n, ref: "R-2", posted: "", state: "open" }],
  [Run, { id: "run_zero", book: "bok_open", amount: 0n, ref: "R-3", posted: "", state: "open" }],
  [Run, { id: "run_big", book: "bok_open", amount: 20_000n, ref: "R-4", posted: "", state: "open" }],
  [Run, { id: "run_dup", book: "bok_open", amount: 500n, ref: "R-9", posted: "", state: "open" }],
  // An entry already submitted, holding the ref R-9.
  [Entry, { id: "ent_done", book: "bok_open", amount: 70n, ref: "R-9", state: "submitted" }],
  [Line, { id: "lin_done", entry: "ent_done", amount: 70n }],
] as ReadonlyArray<readonly [any, any]>;

export const world = () => {
  const memory = storeMemory(seed(), rules);
  const spans: Array<Tracer.NativeSpan> = [];
  const tracer = Tracer.make({ span: (options) => { const s = new Tracer.NativeSpan(options); spans.push(s); return s; } });
  const layer = Layer.mergeAll(BusyLive, memory.layer, Layer.succeed(Tracer.Tracer, tracer));
  return { memory, spans, layer };
};
export type World = ReturnType<typeof world>;
export const call = (w: World, served: any, payload: unknown, who: unknown = ada): Promise<Exit.Exit<unknown, unknown>> =>
  Effect.runPromiseExit((served.call(payload, who) as Effect.Effect<unknown, unknown, never>).pipe(Effect.provide(w.layer)));
export const refusalOf = (exit: Exit.Exit<unknown, unknown>) => (Exit.isFailure(exit) && !Cause.hasDies(exit.cause) ? Cause.squash(exit.cause) : undefined);
/** What a call that should have answered or refused instead died of, so a failure says it. */
export const deathOf = (exit: Exit.Exit<unknown, unknown>) => (Exit.isFailure(exit) && Cause.hasDies(exit.cause) ? Cause.pretty(exit.cause) : "no defect");

/** The rows as the seed had them, every one at version 0: what a call that wrote nothing leaves. */
export const untouched = () => seed().map(([thing, instance]) => ({ thing, instance, version: 0 }));
export const rowsOf = (w: World, thing: unknown) => w.memory.rows.filter((r) => r.thing === thing);
export const hooks = (): Hooks => ({ ran: [], seen: [], subjects: [] });
