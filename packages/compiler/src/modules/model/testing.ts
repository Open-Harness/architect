// The scratch ledger the #1079 compiler checks build (CX-inner-operations), as a project's files, and how they are compiled: a book with a keeper, a
// journal entry (`draft → submitted`, its ref unique) whose `draft` and `submit` a pay run runs through `Blueprint.step.operation`. Read by
// inner-operations.test.ts and inner-operations-refused.test.ts. Written by the checks author for Goal 16; the builder never edits it.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { afterAll } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { BlueprintInvalid } from "./types.ts";
import { Compiler } from "./service.ts";

// Under the package, so `orthograph` resolves from the temporary projects the way a project's own imports do.
// One folder for each test file that loads this: two files run at once, and each removes only its own.
const base = resolve(import.meta.dirname, "../../../.ortho/inner-operations");
mkdirSync(base, { recursive: true });
const scratch = mkdtempSync(join(base, "file-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

let n = 0;
const project = (files: Readonly<Record<string, string>>): string => {
  const root = mkdtempSync(join(scratch, `p${n++}-`));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, "blueprint", path)), { recursive: true });
    writeFileSync(join(root, "blueprint", path), text);
  }
  return root;
};
export const modelOf = (files: Readonly<Record<string, string>>) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(project(files))));
export const problemsOf = (exit: Exit.Exit<unknown, unknown>): ReadonlyArray<string> => {
  if (Exit.isSuccess(exit)) return [];
  const error = exit.cause.reasons.map((r) => (r as { error?: unknown }).error).find((e) => e instanceof BlueprintInvalid);
  return error instanceof BlueprintInvalid ? error.problems : [`not a refusal of the blueprint: ${String(exit.cause)}`];
};

// ---- the scratch ledger, as a project's files ----

export const BOOK = `import { Blueprint } from "orthograph";
export const Book = Blueprint.thing({ description: "A set of books.", fields: { id: Blueprint.id("bok"), keeper: Blueprint.id("per"), closed: Blueprint.bool() }, code: "BK" });
`;
export const BOOK_ROLES = `import { Blueprint } from "orthograph";
import { Book } from "./thing.ts";
export const keeper = Blueprint.role(Book, { rule: (b, who) => b.keeper === who.person });
`;
export const ENTRY = (lives = "") => `import { Blueprint } from "orthograph";
${lives === "" ? "" : `import ledger from "../../stores/ledger.ts";\n`}import { Book } from "../book/thing.ts";
export const Entry = Blueprint.thing({ description: "A journal entry.", fields: { id: Blueprint.id("ent"), book: Book.fields.id, amount: Blueprint.uint(128), ref: Blueprint.text({ max: 20 }) }${lives === "" ? "" : `, lives: ${lives}`}, code: "EN" });
`;
export const ENTRY_EVENTS = `import { Blueprint } from "orthograph";
import { Entry } from "./thing.ts";
export const EntryDrafted = Blueprint.event({ entry: Entry.fields.id, amount: Entry.fields.amount });
export const EntrySubmitted = Blueprint.event({ entry: Entry.fields.id });
`;
export const ENTRY_MACHINE = `import { Blueprint } from "orthograph";
import { Entry } from "./thing.ts";
import { EntryDrafted, EntrySubmitted } from "./events.ts";
export const machine = Blueprint.machine(Entry, {
  states: ["draft", "submitted"],
  moves: { draft: { from: [], to: "draft", emits: EntryDrafted }, submit: { from: ["draft"], to: "submitted", emits: EntrySubmitted } },
  notFrom: { exit: 40 },
});
`;
export const ENTRY_ERRORS = `import { Blueprint } from "orthograph";
import { Entry } from "./thing.ts";
import { Book } from "../book/thing.ts";
export class BookClosed extends Blueprint.error({ book: Book.fields.id }, { exit: 50 }) {}
export class EntryHasNoLines extends Blueprint.error({ entry: Entry.fields.id }, { exit: 51 }) {}
export class EntryRefTaken extends Blueprint.error({ ref: Entry.fields.ref }, { exit: 52 }) {}
`;
export const ENTRY_INVARIANTS = `import { Blueprint } from "orthograph";
import { Entry } from "./thing.ts";
import { EntryRefTaken } from "./errors.ts";
export const oneRefPerBook = Blueprint.invariant.unique(Entry.fields.ref, { refuse: EntryRefTaken });
`;
export const ENTRY_DRAFT = `import { Blueprint } from "orthograph";
import { Entry } from "../thing.ts";
import { machine } from "../machine.ts";
import { BookClosed } from "../errors.ts";
import { keeper } from "../../book/roles.ts";
export default Blueprint.operation(Entry, {
  description: "Draft a journal entry.",
  payload: { book: Entry.fields.book, amount: Entry.fields.amount, ref: Entry.fields.ref },
  answer: { entry: Entry.fields.id },
  move: machine.moves.draft,
  errors: [BookClosed],
  allowed: [keeper.of("book")],
});
`;
export const ENTRY_SUBMIT = `import { Blueprint } from "orthograph";
import { Entry } from "../thing.ts";
import { machine } from "../machine.ts";
import { EntryHasNoLines } from "../errors.ts";
import { keeper } from "../../book/roles.ts";
export default Blueprint.operation(Entry, {
  description: "Submit a drafted journal entry.",
  payload: { entry: Entry.fields.id },
  answer: { entry: Entry.fields.id },
  move: machine.moves.submit,
  errors: [EntryHasNoLines],
  allowed: [keeper.of("entry.book")],
});
`;
export const RUN = `import { Blueprint } from "orthograph";
import { Book } from "../book/thing.ts";
export const Run = Blueprint.thing({ description: "A pay run.", fields: { id: Blueprint.id("run"), book: Book.fields.id, amount: Blueprint.uint(128) }, code: "RN" });
`;
export const RUN_EVENTS = `import { Blueprint } from "orthograph";
import { Run } from "./thing.ts";
export const RunPaid = Blueprint.event({ run: Run.fields.id });
`;
export const RUN_MACHINE = `import { Blueprint } from "orthograph";
import { Run } from "./thing.ts";
import { RunPaid } from "./events.ts";
export const machine = Blueprint.machine(Run, { states: ["open", "paid"], moves: { pay: { from: ["open"], to: "paid", emits: RunPaid } }, notFrom: { exit: 41 } });
`;
export const RUN_ERRORS = (extra = "") => `import { Blueprint } from "orthograph";
import { Run } from "./thing.ts";
export class RunTooLarge extends Blueprint.error({ run: Run.fields.id }, { exit: 53 }) {}
${extra}`;
/** `run.pay`: its own error, then a step per inner operation. `imports` and `errors` change what it declares. */
export const RUN_PAY = ({ steps = `draft: Blueprint.step.operation(entryDraft), submit: Blueprint.step.operation(entrySubmit)`, imports = "", errors = "RunTooLarge" } = {}) => `import { Blueprint } from "orthograph";
import { Run } from "../thing.ts";
import { machine } from "../machine.ts";
import { ${errors} } from "../errors.ts";
import entryDraft from "../../entry/verbs/draft.ts";
import entrySubmit from "../../entry/verbs/submit.ts";
${imports}
export default Blueprint.operation(Run, {
  description: "Pay a run, posting its journal entry.",
  payload: { run: Run.fields.id },
  answer: { run: Run.fields.id, entry: Blueprint.id("ent") },
  move: machine.moves.pay,
  errors: [${errors}],
  allowed: [Blueprint.signedIn],
  steps: { load: Blueprint.step.database(), ${steps} },
});
`;

export const LEDGER = {
  "things/book/thing.ts": BOOK,
  "things/book/roles.ts": BOOK_ROLES,
  "things/entry/thing.ts": ENTRY(),
  "things/entry/events.ts": ENTRY_EVENTS,
  "things/entry/machine.ts": ENTRY_MACHINE,
  "things/entry/errors.ts": ENTRY_ERRORS,
  "things/entry/invariants.ts": ENTRY_INVARIANTS,
  "things/entry/verbs/draft.ts": ENTRY_DRAFT,
  "things/entry/verbs/submit.ts": ENTRY_SUBMIT,
  "things/run/thing.ts": RUN,
  "things/run/events.ts": RUN_EVENTS,
  "things/run/machine.ts": RUN_MACHINE,
  "things/run/errors.ts": RUN_ERRORS(),
  "things/run/verbs/pay.ts": RUN_PAY(),
};
