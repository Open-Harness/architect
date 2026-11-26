// Check 13 (#1079, CX-inner-operations): a handler runs another operation of the same app inside its own commit, on Cloudflare's database.
//
// A scratch ledger is added to a copy of acme: a `book` with a keeper, a journal `entry` (`draft → submitted`, its ref unique) and its
// `line`, and a pay run, the `batch` (`open → paid`), which sorts before `entry`, so an outer is generated before its inner. `batch.pay`
// declares `file: Blueprint.step.operation(entrySubmit)` and `post: Blueprint.step.operation(entryDraft)`, keys and order against the
// operations' own, and runs them as `steps.post(payload)`; `batch.repost` runs only the submit. The real command generates the server,
// which wires each inner operation into its outer by its step's key; a world runs it over local D1, and ada (the book's keeper) and
// bob (signed in, nobody's keeper) call it over HTTP. Once the world has stopped, its D1 file is read: rows and the `_journal`.
//
// The contract judged, the same as language-effect's handler/inner-operation.test.ts over storeMemory:
//  - the outer and its inner operations commit together, in one batch: the run paid and naming the entry, the entry submitted, its line,
//    and EntryDrafted, EntrySubmitted and RunPaid journalled once each, in that order, each naming its own operation, on one trace;
//  - what an inner operation wrote is visible to the outer handler afterwards (it answers what it saw);
//  - an inner operation's refusal reaches the caller as that operation's declared error (422, its tag and fields), and nothing is written;
//    a refusal from the second inner operation undoes the first's writes;
//  - the inner operation's access rule is judged for the caller: the outer admits bob, the entry's keeper rule doesn't, so 403 and no write;
//  - the other thing's machine refuses with its own NotFrom (#972), and its G5 rule with its own refusal.
// Written by the checks author for Goal 16; a builder never edits this file and only removes lines from `expected-failing/13-inner-operations.txt`.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { Worlds } from "@orthograph/prove";
import { afterEach, describe, expect, it } from "vitest";
import { acme, copyOf, nothingRunning } from "../layer1/support.ts";
import { signUp } from "../layer2/support.ts";
import { run } from "./secrets-support.ts";

// ---- the scratch ledger ----

const FILES: Readonly<Record<string, string>> = {
  "blueprint/things/book/thing.ts": `import { Blueprint } from "orthograph";
export const Book = Blueprint.thing({ description: "A set of books.", fields: { id: Blueprint.id("bok"), keeper: Blueprint.id("per"), closed: Blueprint.bool() } });
`,
  "blueprint/things/book/roles.ts": `import { Blueprint } from "orthograph";
import { Book } from "./thing.ts";
export const keeper = Blueprint.role(Book, { rule: (b, who) => b.keeper === who.person });
`,
  "blueprint/things/book/verbs/open.ts": `import { Blueprint } from "orthograph";
import { Book } from "../thing.ts";
export default Blueprint.operation(Book, {
  description: "Open a set of books, kept by the caller, under the id it names.",
  payload: { book: Blueprint.id("bok"), closed: Book.fields.closed }, answer: { book: Book.fields.id }, allowed: [Blueprint.signedIn],
  steps: { save: Blueprint.step.database() },
});
`,
  "blueprint/things/entry/thing.ts": `import { Blueprint } from "orthograph";
import { Book } from "../book/thing.ts";
export const Entry = Blueprint.thing({ description: "A journal entry.", fields: { id: Blueprint.id("ent"), book: Book.fields.id, amount: Blueprint.uint(128), ref: Blueprint.text({ max: 20 }) } });
`,
  "blueprint/things/entry/events.ts": `import { Blueprint } from "orthograph";
import { Entry } from "./thing.ts";
export const EntryDrafted = Blueprint.event({ entry: Entry.fields.id, amount: Entry.fields.amount });
export const EntrySubmitted = Blueprint.event({ entry: Entry.fields.id });
`,
  "blueprint/things/entry/machine.ts": `import { Blueprint } from "orthograph";
import { Entry } from "./thing.ts";
import { EntryDrafted, EntrySubmitted } from "./events.ts";
export const machine = Blueprint.machine(Entry, {
  states: ["draft", "submitted"],
  moves: { draft: { from: [], to: "draft", emits: EntryDrafted }, submit: { from: ["draft"], to: "submitted", emits: EntrySubmitted } },
  notFrom: { exit: 70 },
});
`,
  "blueprint/things/entry/errors.ts": `import { Blueprint } from "orthograph";
import { Entry } from "./thing.ts";
import { Book } from "../book/thing.ts";
export class BookClosed extends Blueprint.error({ book: Book.fields.id }, { exit: 71 }) {}
export class EntryHasNoLines extends Blueprint.error({ entry: Entry.fields.id }, { exit: 72 }) {}
export class EntryRefTaken extends Blueprint.error({ ref: Entry.fields.ref }, { exit: 73 }) {}
`,
  "blueprint/things/entry/invariants.ts": `import { Blueprint } from "orthograph";
import { Entry } from "./thing.ts";
import { EntryRefTaken } from "./errors.ts";
export const oneRef = Blueprint.invariant.unique(Entry.fields.ref, { refuse: EntryRefTaken });
`,
  "blueprint/things/entry/verbs/draft.ts": `import { Blueprint } from "orthograph";
import { Entry } from "../thing.ts";
import { Line } from "../../line/thing.ts";
import { machine } from "../machine.ts";
import { BookClosed } from "../errors.ts";
import { keeper } from "../../book/roles.ts";
export default Blueprint.operation(Entry, {
  description: "Draft a journal entry with its line.",
  payload: { book: Entry.fields.book, amount: Entry.fields.amount, ref: Entry.fields.ref },
  answer: { entry: Entry.fields.id },
  move: machine.moves.draft,
  errors: [BookClosed],
  allowed: [keeper.of("book")],
  steps: { save: Blueprint.step.database({ writes: [Entry, Line] }) },
});
`,
  "blueprint/things/entry/verbs/submit.ts": `import { Blueprint } from "orthograph";
import { Entry } from "../thing.ts";
import { machine } from "../machine.ts";
import { EntryHasNoLines } from "../errors.ts";
import { keeper } from "../../book/roles.ts";
export default Blueprint.operation(Entry, {
  description: "Submit a drafted journal entry.",
  payload: { entry: Entry.fields.id }, answer: { entry: Entry.fields.id },
  move: machine.moves.submit, errors: [EntryHasNoLines], allowed: [keeper.of("entry.book")],
});
`,
  "blueprint/things/line/thing.ts": `import { Blueprint } from "orthograph";
import { Entry } from "../entry/thing.ts";
export const Line = Blueprint.thing({ description: "A journal entry's line.", fields: { id: Blueprint.id("lin"), entry: Entry.fields.id, amount: Blueprint.uint(128) } });
`,
  "blueprint/things/batch/thing.ts": `import { Blueprint } from "orthograph";
import { Book } from "../book/thing.ts";
export const Run = Blueprint.thing({ description: "A pay run.", fields: { id: Blueprint.id("run"), book: Book.fields.id, amount: Blueprint.uint(128), ref: Blueprint.text({ max: 20 }), posted: Blueprint.text({ max: 40 }) } });
`,
  "blueprint/things/batch/events.ts": `import { Blueprint } from "orthograph";
import { Run } from "./thing.ts";
export const RunOpened = Blueprint.event({ run: Run.fields.id });
export const RunPaid = Blueprint.event({ run: Run.fields.id });
`,
  "blueprint/things/batch/machine.ts": `import { Blueprint } from "orthograph";
import { Run } from "./thing.ts";
import { RunOpened, RunPaid } from "./events.ts";
export const machine = Blueprint.machine(Run, {
  states: ["open", "paid"],
  moves: { open: { from: [], to: "open", emits: RunOpened }, pay: { from: ["open"], to: "paid", emits: RunPaid } },
  notFrom: { exit: 74 },
});
`,
  "blueprint/things/batch/verbs/open.ts": `import { Blueprint } from "orthograph";
import { Run } from "../thing.ts";
import { machine } from "../machine.ts";
export default Blueprint.operation(Run, {
  description: "Open a pay run.",
  payload: { book: Run.fields.book, amount: Run.fields.amount, ref: Run.fields.ref }, answer: { run: Run.fields.id },
  move: machine.moves.open, allowed: [Blueprint.signedIn],
});
`,
  "blueprint/things/batch/verbs/pay.ts": `import { Blueprint } from "orthograph";
import { Run } from "../thing.ts";
import { machine } from "../machine.ts";
import entryDraft from "../../entry/verbs/draft.ts";
import entrySubmit from "../../entry/verbs/submit.ts";
export default Blueprint.operation(Run, {
  description: "Pay a run, posting its journal entry.",
  payload: { run: Run.fields.id },
  answer: { run: Run.fields.id, entry: Blueprint.id("ent"), seen: Blueprint.text({ max: 60 }) },
  move: machine.moves.pay,
  allowed: [Blueprint.signedIn],
  // Keyed against the operations' own order (file runs the submit, post the draft), and declared the same way: wiring by position is seen.
  steps: { file: Blueprint.step.operation(entrySubmit), post: Blueprint.step.operation(entryDraft), save: Blueprint.step.database() },
});
`,
  "blueprint/things/batch/verbs/repost.ts": `import { Blueprint } from "orthograph";
import { Run } from "../thing.ts";
import entrySubmit from "../../entry/verbs/submit.ts";
export default Blueprint.operation(Run, {
  description: "Submit a run's entry again.",
  payload: { run: Run.fields.id, entry: Blueprint.id("ent") }, answer: { entry: Blueprint.id("ent") },
  allowed: [Blueprint.signedIn],
  steps: { file: Blueprint.step.operation(entrySubmit) },
});
`,
};

// The handlers, typed loosely so the check does not pin the generated types; each answers what it was asked to.
const HANDLERS: Readonly<Record<string, string>> = {
  "src/book/open.ts": `import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Book } from "../../blueprint/things/book/thing.ts";
export default ((payload: any, context: any) => Effect.gen(function* () {
  const records = yield* Records;
  yield* context.steps.save(records.insert(Book, { id: payload.book, keeper: context.principal.person, closed: payload.closed } as never));
  return { book: payload.book };
})) as never;
`,
  "src/batch/open.ts": `import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Run } from "../../blueprint/things/batch/thing.ts";
export default ((payload: any, context: any) => Effect.gen(function* () {
  const records = yield* Records;
  yield* records.insert(Run, { id: context.id, book: payload.book, amount: payload.amount, ref: payload.ref, posted: "-" } as never);
  yield* context.move();
  return { run: context.id };
})) as never;
`,
  "src/entry/draft.ts": `import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Line } from "../../blueprint/things/line/thing.ts";
import { BookClosed } from "../../blueprint/things/entry/errors.ts";
export default ((payload: any, context: any) => Effect.gen(function* () {
  if (context.refs.book?.closed === true) return yield* Effect.fail(new BookClosed({ book: payload.book }));
  const records = yield* Records;
  // A line of 0 is left out: an entry of 0 has none, and its submit refuses.
  if (payload.amount > 0n) yield* context.steps.save(records.insert(Line, { id: "lin_" + String(context.id).slice(4), entry: context.id, amount: payload.amount } as never));
  yield* context.move();
  return { entry: context.id };
})) as never;
`,
  "src/entry/submit.ts": `import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Line } from "../../blueprint/things/line/thing.ts";
import { EntryHasNoLines } from "../../blueprint/things/entry/errors.ts";
export default ((payload: any, context: any) => Effect.gen(function* () {
  const records = yield* Records;
  const { items } = yield* records.list({ thing: Line, where: { entry: payload.entry }, state: undefined, order: "oldest", limit: 10, after: undefined });
  if (items.length === 0) return yield* Effect.fail(new EntryHasNoLines({ entry: payload.entry }));
  yield* context.move();
  return { entry: payload.entry };
})) as never;
`,
  "src/batch/pay.ts": `import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Entry } from "../../blueprint/things/entry/thing.ts";
import { Line } from "../../blueprint/things/line/thing.ts";
import { Run } from "../../blueprint/things/batch/thing.ts";
export default ((_payload: any, context: any) => Effect.gen(function* () {
  const run = context.subject;
  const records = yield* Records;
  const drafted: any = yield* context.steps.post({ book: run.book, amount: run.amount, ref: run.ref });
  const afterDraft: any = yield* records.find(Entry, drafted.entry);
  const lines = yield* records.list({ thing: Line, where: { entry: drafted.entry }, state: undefined, order: "oldest", limit: 10, after: undefined });
  yield* context.steps.file({ entry: drafted.entry });
  const afterSubmit: any = yield* records.find(Entry, drafted.entry);
  yield* context.steps.save(records.update(Run, run.id, { posted: drafted.entry } as never));
  yield* context.move();
  return { run: run.id, entry: drafted.entry, seen: String(afterDraft?.state) + "/" + String(lines.items.length) + "/" + String(afterSubmit?.state) };
})) as never;
`,
  "src/batch/repost.ts": `import { Effect } from "effect";
export default ((payload: any, context: any) => context.steps.file({ entry: payload.entry })) as never;
`,
};

interface App { readonly root: string; readonly remove: () => void }
const apps: Array<App> = [];
afterEach(() => { for (const app of apps.splice(0)) app.remove(); });

const ortho = (root: string, ...args: ReadonlyArray<string>) => {
  const said = run(root, ...args);
  expect(said.status, `ortho ${args.join(" ")}:\n${said.out}`).toBe(0);
  return said;
};
const write = (root: string, files: Readonly<Record<string, string>>) => {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), text);
  }
};
/** A copy of acme with the scratch ledger, generated, its handlers written, and generated again. */
const app = (): App => {
  const copy = copyOf(acme);
  apps.push(copy);
  write(copy.root, FILES);
  ortho(copy.root, "generate");
  write(copy.root, HANDLERS);
  ortho(copy.root, "generate");
  return copy;
};

type Who = { readonly token: string; readonly person: string };
const post = async (url: string, path: string, who: Who, body: unknown) => {
  const response = await fetch(`${url}/${path}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${who.token}`, connection: "close" }, body: JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, body: (text.startsWith("{") ? JSON.parse(text) : text) as Record<string, unknown> };
};
const idOf = (said: { status: number; body: Record<string, unknown> }, field: string) => {
  expect(said.status, JSON.stringify(said.body)).toBe(200);
  return String(said.body[field]);
};

/** The world's one D1 file: the sqlite file under its state that holds the journal. */
const databaseOf = (root: string, name: string): string => {
  const walk = (dir: string): ReadonlyArray<string> => readdirSync(dir).flatMap((e) => {
    const path = join(dir, e);
    return statSync(path).isDirectory() ? walk(path) : e.endsWith(".sqlite") ? [path] : [];
  });
  const found = walk(join(root, ".ortho", name)).filter((path) => {
    const db = new DatabaseSync(path, { readOnly: true });
    try { return db.prepare(`SELECT name FROM sqlite_master WHERE name = '_journal'`).all().length > 0; } finally { db.close(); }
  });
  expect(found, "one D1 file holds the journal").toHaveLength(1);
  return found[0]!;
};
type Row = Record<string, unknown>;
const read = (file: string) => {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const all = (sql: string): ReadonlyArray<Row> => db.prepare(sql).all() as ReadonlyArray<Row>;
    return {
      entries: all(`SELECT "id", "book", "amount", "ref", "state" FROM "entry" ORDER BY rowid`),
      lines: all(`SELECT "id", "entry", "amount" FROM "line" ORDER BY rowid`),
      runs: all(`SELECT "id", "posted", "state" FROM "batch" ORDER BY rowid`),
      journal: all(`SELECT "trace", "operation", "move", "subject", "event", "fields" FROM "_journal" WHERE "operation" LIKE 'entry.%' OR "operation" LIKE 'batch.%' ORDER BY rowid`),
    };
  } finally { db.close(); }
};

describe("13 a handler runs another operation of the app inside its commit, on D1", () => {
  it("commits together or not at all, judges the inner operations' rules for the caller, and refuses as the inner operation declared", { timeout: 600_000 }, async () => {
    const { root } = app();
    const name = "m2-13-inner";
    const got = await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const world = yield* Worlds.start({ root, port: 0, name });
      return yield* Effect.promise(async () => {
        const url = world.url;
        const ada = signUp(root, url, "ada");
        const bob = signUp(root, url, "bob");
        const open = idOf(await post(url, "book/open", ada, { book: "bok_open", closed: false }), "book");
        const shut = idOf(await post(url, "book/open", ada, { book: "bok_shut", closed: true }), "book");
        const runOf = async (book: string, amount: string, ref: string) => idOf(await post(url, "batch/open", ada, { book, amount, ref }), "run");
        const runs = {
          paid: await runOf(open, "500", "R-1"),
          bobs: await runOf(open, "500", "R-2"),
          shut: await runOf(shut, "500", "R-3"),
          zero: await runOf(open, "0", "R-4"),
          dup: await runOf(open, "500", "R-1"),
        };
        const paid = await post(url, "batch/pay", ada, { run: runs.paid });
        const byBob = await post(url, "batch/pay", bob, { run: runs.bobs });
        const closed = await post(url, "batch/pay", ada, { run: runs.shut });
        const zero = await post(url, "batch/pay", ada, { run: runs.zero });
        const dup = await post(url, "batch/pay", ada, { run: runs.dup });
        const entry = String(paid.body["entry"]);
        const repost = await post(url, "batch/repost", ada, { run: runs.paid, entry });
        const repostByBob = await post(url, "batch/repost", bob, { run: runs.paid, entry });
        return { ada, runs, paid, byBob, closed, zero, dup, repost, repostByBob, entry };
      });
    })));
    nothingRunning(root);
    const { runs, entry } = got;

    // The pay answered, and the outer saw what the inner operations wrote: the entry drafted with its one line, then submitted.
    expect(got.paid, JSON.stringify(got.paid.body)).toEqual({ status: 200, body: { run: runs.paid, entry, seen: "draft/1/submitted" } });
    expect(entry).toMatch(/^ent_[0-9a-z]+$/);
    // Each inner refusal is the inner operation's declared error, on the wire as the outer's.
    expect(got.byBob.status, JSON.stringify(got.byBob.body)).toBe(403);
    expect(got.byBob.body["_tag"]).toBe("NotAllowed");
    expect(got.closed, JSON.stringify(got.closed.body)).toMatchObject({ status: 422, body: { _tag: "BookClosed" } });
    expect(got.zero, JSON.stringify(got.zero.body)).toMatchObject({ status: 422, body: { _tag: "EntryHasNoLines" } });
    expect(String(got.zero.body["entry"])).toMatch(/^ent_[0-9a-z]+$/);
    expect(got.dup, JSON.stringify(got.dup.body)).toMatchObject({ status: 422, body: { _tag: "EntryRefTaken", ref: "R-1" } });
    expect(got.repost, JSON.stringify(got.repost.body)).toMatchObject({ status: 409, body: { _tag: "EntryNotDraft", state: "submitted" } });
    expect(got.repostByBob.status, JSON.stringify(got.repostByBob.body)).toBe(403);

    const stored = read(databaseOf(root, name));
    // One entry and one line: the paid run's. No refused call left a row.
    expect(stored.entries).toEqual([{ id: entry, book: "bok_open", amount: "500", ref: "R-1", state: "submitted" }]);
    expect(stored.lines).toEqual([{ id: `lin_${entry.slice(4)}`, entry, amount: "500" }]);
    expect(stored.runs).toEqual([
      { id: runs.paid, posted: entry, state: "paid" },
      { id: runs.bobs, posted: "-", state: "open" },
      { id: runs.shut, posted: "-", state: "open" },
      { id: runs.zero, posted: "-", state: "open" },
      { id: runs.dup, posted: "-", state: "open" },
    ]);
    // The journal: five RunOpened, then the pay's three events in the order their moves were made, on one trace; nothing for a refused call.
    const pay = stored.journal.filter((j) => j["event"] !== "RunOpened");
    expect(stored.journal.filter((j) => j["event"] === "RunOpened")).toHaveLength(5);
    expect(pay.map(({ operation, move, subject, event, fields }) => ({ operation, move, subject, event, fields: JSON.parse(String(fields)) }))).toEqual([
      { operation: "entry.draft", move: "draft", subject: entry, event: "EntryDrafted", fields: { entry, amount: "500" } },
      { operation: "entry.submit", move: "submit", subject: entry, event: "EntrySubmitted", fields: { entry } },
      { operation: "batch.pay", move: "pay", subject: runs.paid, event: "RunPaid", fields: { run: runs.paid } },
    ]);
    expect(new Set(pay.map((j) => j["trace"])).size, "one trace").toBe(1);
    expect(String(pay[0]?.["trace"])).toMatch(/^[0-9a-f]{32}$/);
  });
});
