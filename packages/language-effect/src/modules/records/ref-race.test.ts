// #1045: a row a call read counts as read at its commit, as a list's rows do (#764). A handler judges rows it read (a payload's `refs.<field>`, or its own
// `Records.find`) and writes a row pointing at one. When another call changes a row it read before this one commits, the commit is a `conflict` and the
// call runs again, seeing the change: Capxul's `account.create` read its parent group, `account.make-ledger` made the parent a ledger, and the create
// committed a child under a ledger. A row the call didn't read changing, or a row it read that nobody changed, leaves it on its first run: a read is not a
// write, so two calls reading one folder both commit at once. Every read counts, whatever its thing (with a machine or none, the thing the call writes or
// another), however the handler came to its id (a payload ref, its own find, a field of another row), however many it read, at whatever version, whether
// the call inserts or only updates, lists as well or not, and on every attempt. Run through `Handlers.serve` over `storeMemory`, so the build picks how a
// store guards a read. The D1 half is host-cloudflare's store/read-guard.test.ts. Written by the checks author for Goal 16; the builder never edits this
// file, and only removes lines from `expected-failing/`.
// Agreed with Goal 16 (25 November 2026): retry, not refuse (the rerun is the runtime's existing conflict-retry, with no budget or outcome of its own);
// the row's version is the guard, not its state; every read counts. Open, and judged by no check here, so a build may answer either way: a find that
// found nothing, then a row inserted with that id before the commit (a phantom); and whether the role check's own reads are guarded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Cause, Deferred, Effect, Exit, Fiber, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint, type Thing } from "orthograph";
import { ErrorNames, EventNames } from "orthograph/server";
import { Handlers } from "#modules/handler/service.js";
import { BusyLive } from "#modules/work/service.js";
import { storeMemory, Unit } from "./service.ts";
import { Records, Store, type Instance } from "./types.ts";

const Folder = Blueprint.thing({ description: "Where notes are kept, until it's closed.", fields: { id: Blueprint.id("fld"), owner: Blueprint.text({ max: 20 }) } });
// A thing with no machine: its rows have no state, and a handler judges a field of it.
const Shelf = Blueprint.thing({ description: "A shelf, with no machine of its own.", fields: { id: Blueprint.id("shf"), label: Blueprint.text({ max: 20 }) } });
const Note = Blueprint.thing({
  description: "A note in a folder.", fields: { id: Blueprint.id("nte"), folder: Folder.fields.id, copy: Blueprint.optional(Folder.fields.id), label: Blueprint.text({ max: 20 }) },
});
const Closed = Blueprint.event({ folder: Folder.fields.id });
EventNames.name(Closed, "Closed");
const machine = Blueprint.machine(Folder, { states: ["open", "closed"], moves: { close: { from: ["open"], to: "closed", emits: Closed } }, notFrom: { exit: 40 } });
class Shut extends Blueprint.error({ what: Blueprint.text({ max: 40 }) }, { exit: 41 }) {}
ErrorNames.name(Shut, "Shut");
class FolderHasNotes extends Blueprint.error({ folder: Folder.fields.id }, { exit: 42 }) {}
ErrorNames.name(FolderHasNotes, "FolderHasNotes");
// The folders named by payload fields are read before the handler runs and handed in as `refs`; the plan says what else the handler reads.
const file = Blueprint.operation(Note, {
  description: "File a note in an open folder: a new one, or one moved there.",
  payload: { id: Note.fields.id, folder: Note.fields.folder, copy: Note.fields.copy, plan: Blueprint.optional(Blueprint.text({ max: 400 })) },
  answer: { note: Note.fields.id }, errors: [Shut], allowed: [Blueprint.signedIn],
});
const close = Blueprint.operation(Folder, {
  description: "Close a folder with no notes in it.", payload: { id: Folder.fields.id }, answer: { folder: Folder.fields.id }, move: machine.moves.close, errors: [FolderHasNotes], allowed: [Blueprint.signedIn],
});
const ada = { kind: "person", person: "per_ada", via: "session" } as const;

/** What the handler reads besides its refs: a row by an id the plan names, a note and then the folder its field names, or a folder's notes (not judged). */
type Read = { readonly find: "folder" | "shelf" | "note"; readonly id: string } | { readonly via: string } | { readonly list: string };
/** `move`: the call only updates (it moves its note, `id`, into `folder`) instead of inserting one. */
type Plan = { readonly reads?: ReadonlyArray<Read>; readonly move?: boolean };
const things = { folder: Folder, shelf: Shelf, note: Note } as const;

type Run = { id: string; read: ReadonlyArray<unknown> };
/**
 * The handler: read its folders and its plan's rows, `between`, then judge each row it read (a state other than open, a label `shut`, or a row missing
 * refuses `Shut` naming it) and insert or move its note. Each attempt is recorded in `runs`, with each row's state, or its label when it has no state.
 */
const filing = (runs: Array<Run>, between: (id: string, attempt: number) => Effect.Effect<void, any, any>) =>
  Handlers.serve({
    name: "note.file",
    operation: file,
    handler: (({ id, folder: f, copy, plan }: any, { refs }: any) => Effect.gen(function* () {
      const records = yield* Records;
      const p: Plan = plan === undefined ? {} : JSON.parse(plan);
      const rows: Array<Instance | undefined> = [refs.folder, ...(copy === undefined ? [] : [refs.copy])];
      for (const r of p.reads ?? []) {
        if ("list" in r) yield* records.list({ thing: Note, where: { folder: r.list }, state: undefined, order: "oldest", limit: 50, after: undefined });
        else if ("via" in r) {
          const note = yield* records.find(Note, r.via);
          rows.push(note, note === undefined ? undefined : yield* records.find(Folder, String(note["folder"])));
        } else rows.push(yield* records.find(things[r.find] as Thing, r.id));
      }
      runs.push({ id, read: rows.map((x) => x?.state ?? x?.["label"]) });
      yield* between(id, runs.filter((r) => r.id === id).length);
      const bad = rows.findIndex((x) => x === undefined || (x.state != null && x.state !== "open") || x["label"] === "shut");
      if (bad >= 0) return yield* Effect.fail(new Shut({ what: String(rows[bad]?.["id"] ?? "missing") }));
      if (p.move) yield* records.update(Note, id, { folder: f });
      else yield* records.insert(Note, { id, folder: f, ...(copy === undefined ? {} : { copy }), label: "none" } as never);
      return { note: id };
    })) as never,
  });
const closing = Handlers.serve({
  name: "folder.close",
  operation: close,
  handler: (({ id }: any, { move }: any) => Effect.gen(function* () {
    const { items } = yield* (yield* Records).list({ thing: Note, where: { folder: id }, state: undefined, order: "oldest", limit: 50, after: undefined });
    if (items.length > 0) return yield* Effect.fail(new FolderHasNotes({ folder: id }));
    yield* move();
    return { folder: id };
  })) as never,
});
/** A call that died (a build's defect) is not a refusal: name it before judging. */
const ended = (e: Exit.Exit<any, any>) => (Exit.isSuccess(e) ? e.value : Cause.hasDies(e.cause) ? `died: ${String(Cause.squash(e.cause))}` : Cause.squash(e.cause));

// The seeded rows, each at a version of its own: a guard on rows at version 0 alone, or on rows changed before, misses one. fld_10 shares fld_1's first
// characters: a guard matching ids by prefix reads it.
const SEED: ReadonlyArray<readonly [Thing, Instance, number]> = [
  [Folder, { id: "fld_1", owner: "ada", state: "open" }, 2],
  [Folder, { id: "fld_2", owner: "ada", state: "open" }, 0],
  [Folder, { id: "fld_10", owner: "ada", state: "open" }, 0],
  [Folder, { id: "fld_3", owner: "ada", state: "open" }, 5],
  [Shelf, { id: "shf_1", label: "oak" }, 1],
  [Shelf, { id: "shf_2", label: "elm" }, 0],
  [Note, { id: "nte_0", folder: "fld_2", label: "none" }, 0],
  [Note, { id: "nte_9", folder: "fld_3", label: "keep" }, 3],
];
const seeded = () => {
  const memory = storeMemory(SEED.map(([thing, instance]) => [thing, instance] as const));
  for (const [, instance, version] of SEED) memory.rows.find((r) => r.instance["id"] === instance["id"])!.version = version;
  return memory;
};
const notesOf = (memory: ReturnType<typeof seeded>) => memory.rows.filter((r) => r.thing === Note).map((r) => `${r.instance["id"]}@${r.instance["folder"]}`);
const BASE = ["nte_0@fld_2", "nte_9@fld_3"];

describe("a create that reads its folder races the folder's close (#1045)", () => {
  /** `first` runs to its end while `second` waits between its read and its commit, then `second` goes on. */
  const race = (order: "close lands between" | "add lands between") => {
    const memory = seeded();
    const runs: Array<Run> = [];
    return Effect.runPromise(Effect.gen(function* () {
      const read = yield* Deferred.make<void>();
      const go = yield* Deferred.make<void>();
      const hold = (_id: string, attempt: number) => (attempt === 1 ? Effect.andThen(Deferred.succeed(read, undefined), Deferred.await(go)) : Effect.void);
      const addCall = (h: typeof hold) => filing(runs, h).run({ id: "nte_a", folder: "fld_1" } as never, ada);
      if (order === "close lands between") {
        const fiber = yield* Effect.forkChild(addCall(hold));
        yield* Effect.raceFirst(Deferred.await(read), Effect.andThen(Fiber.join(fiber), Effect.die(new Error("the add ended before it read its folder"))));
        const closed = yield* Effect.exit(closing.run({ id: "fld_1" } as never, ada));
        yield* Deferred.succeed(go, undefined);
        return { add: yield* Fiber.await(fiber), closed };
      }
      // The other order, already safe (#764): the close lists no notes, the add commits, so the close runs again and meets the note.
      const listed = yield* Deferred.make<void>();
      const watching = Layer.effect(Store, Effect.gen(function* () {
        const s = yield* Store;
        return Store.of({ ...s, list: (q) => Effect.tap(s.list(q), () => Deferred.succeed(listed, undefined)) });
      }));
      const fiber = yield* Effect.forkChild(Effect.exit(closing.run({ id: "fld_1" } as never, ada).pipe(Effect.provide(watching.pipe(Layer.provide(memory.layer))))));
      yield* Deferred.await(listed);
      const add = yield* Effect.exit(addCall(() => Effect.void));
      return { add, closed: yield* Fiber.join(fiber) };
    }).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))) as Effect.Effect<any>)
      .then((r) => ({ add: ended(r.add), closed: ended(r.closed), runs, notes: notesOf(memory), state: memory.rows.find((x) => x.instance["id"] === "fld_1")!.instance["state"] }));
  };

  it("the close lands between the add's read and its commit: the add runs again, sees the folder closed, and is refused", async () => {
    const r = await race("close lands between");
    expect(r.closed).toEqual({ folder: "fld_1" });
    expect(r.state).toBe("closed");
    expect(r.add).toMatchObject({ _tag: "Shut", what: "fld_1" });
    expect(r.runs).toEqual([{ id: "nte_a", read: ["open"] }, { id: "nte_a", read: ["closed"] }]);
    // A closed folder holds no note.
    expect(r.notes).toEqual(BASE);
  });

  it("control, the add lands between the close's list and its commit: the close runs again and is refused", async () => {
    const r = await race("add lands between");
    expect(r.add).toEqual({ note: "nte_a" });
    expect(r.closed).toMatchObject({ _tag: "FolderHasNotes", folder: "fld_1" });
    expect(r.state).toBe("open");
    expect(r.notes).toEqual([...BASE, "nte_a@fld_1"]);
  });

  it("control, two adds that read one folder: a read is not a write, so both commit on their first run", async () => {
    const memory = seeded();
    const runs: Array<Run> = [];
    const exits = await Effect.runPromise(Effect.gen(function* () {
      // A barrier: each first attempt waits until both have read, so each commits after the other read.
      const both = yield* Deferred.make<void>();
      let read = 0;
      const s = filing(runs, (_id, attempt) => (attempt > 1 ? Effect.void : Effect.suspend(() => (++read === 2 ? Deferred.succeed(both, undefined) : Deferred.await(both)))));
      const open = (e: Effect.Effect<any, any, any>) => Effect.ensuring(Effect.exit(e), Deferred.succeed(both, undefined));
      return yield* Effect.all([open(s.run({ id: "nte_a", folder: "fld_1" } as never, ada)), open(s.run({ id: "nte_b", folder: "fld_1" } as never, ada))], { concurrency: "unbounded" });
    }).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))) as unknown as Effect.Effect<Array<Exit.Exit<any, any>>>);
    expect(exits.map(ended)).toEqual([{ note: "nte_a" }, { note: "nte_b" }]);
    expect(runs.map((r) => r.id)).toEqual(["nte_a", "nte_b"]);
  });
});

describe("a row the call read, changed before its commit (#1045)", () => {
  type Change = (unit: any) => Effect.Effect<void, any, any>;
  type Shape = { readonly copy?: string; readonly plan?: Plan };
  /**
   * The call reads its rows, then before its commit `changes[attempt - 1]` commit, one commit each, then it goes on. Answers how each change committed,
   * how the call ended, what each run read, and the notes stored.
   */
  const around = (shape: Shape, changes: ReadonlyArray<ReadonlyArray<Change>>) => {
    const memory = seeded();
    const runs: Array<Run> = [];
    const changed: Array<unknown> = [];
    return Effect.runPromise(Effect.gen(function* () {
      const store = yield* Store;
      const between = (_id: string, attempt: number) => Effect.forEach(changes[attempt - 1] ?? [], (change) => Effect.gen(function* () {
        const unit: any = yield* Unit.make(store);
        yield* change(unit);
        changed.push(yield* store.commit({ writes: yield* unit.writes, entries: [] }));
      }), { discard: true });
      const payload = {
        id: shape.plan?.move ? "nte_0" : "nte_a", folder: "fld_1",
        ...(shape.copy === undefined ? {} : { copy: shape.copy }), ...(shape.plan === undefined ? {} : { plan: JSON.stringify(shape.plan) }),
      };
      return yield* Effect.exit(filing(runs, between).run(payload as never, ada));
    }).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))) as Effect.Effect<any>)
      .then((exit) => ({ changed, add: ended(exit), runs: runs.map((x) => x.read), notes: notesOf(memory) }));
  };
  const shut = (id: string): Change => (u) => u.setState(Folder, id, "closed");
  const owner = (id: string, to: string): Change => (u) => u.records.update(Folder, id, { owner: to });
  const label = (thing: Thing, id: string, to: string): Change => (u) => u.records.update(thing, id, { label: to });
  const find = (thing: "folder" | "shelf" | "note", id: string): Read => ({ find: thing, id });
  const committed = (changes: ReadonlyArray<ReadonlyArray<Change>>) => changes.flat().map(() => "committed");

  // [what, shape, changes, the row it is refused naming, what each run read]
  const refused: ReadonlyArray<readonly [string, Shape, ReadonlyArray<ReadonlyArray<Change>>, string, ReadonlyArray<ReadonlyArray<unknown>>]> = [
    ["the folder it was handed in refs, closed", {}, [[shut("fld_1")]], "fld_1", [["open"], ["closed"]]],
    ["a folder its handler found, closed", { plan: { reads: [find("folder", "fld_3")] } }, [[shut("fld_3")]], "fld_3", [["open", "open"], ["open", "closed"]]],
    ["the second folder it was handed, closed", { copy: "fld_10" }, [[shut("fld_10")]], "fld_10", [["open", "open"], ["open", "closed"]]],
    // A guard on the first reads alone misses the last.
    ["the third folder it read, closed", { copy: "fld_10", plan: { reads: [find("folder", "fld_3")] } }, [[shut("fld_3")]], "fld_3", [["open", "open", "open"], ["open", "open", "closed"]]],
    // A thing with no machine: a guard on rows with a state alone misses it.
    ["a shelf it found, which has no machine, labelled shut", { plan: { reads: [find("shelf", "shf_1")] } }, [[label(Shelf, "shf_1", "shut")]], "shf_1", [["open", "oak"], ["open", "shut"]]],
    // The thing the call writes: a guard on other things alone misses it.
    ["another note it found, of the thing it writes, labelled shut", { plan: { reads: [find("note", "nte_9")] } }, [[label(Note, "nte_9", "shut")]], "nte_9", [["open", "keep"], ["open", "shut"]]],
    // Its id is a field of another row, in neither the payload nor the plan.
    ["a folder found by an id another row holds, closed", { plan: { reads: [{ via: "nte_9" }] } }, [[shut("fld_3")]], "fld_3", [["open", "keep", "open"], ["open", "keep", "closed"]]],
    // The call lists as well: a read guard skipped when the commit guards a list misses it.
    ["the folder in refs closed, the call listing notes too", { plan: { reads: [{ list: "fld_2" }] } }, [[shut("fld_1")]], "fld_1", [["open"], ["closed"]]],
    // The call only updates: a read guard kept for inserts alone misses it.
    ["the folder in refs closed, the call only moving a note", { plan: { move: true } }, [[shut("fld_1")]], "fld_1", [["open"], ["closed"]]],
    // A change before each attempt's commit: a guard on the first attempt alone lets the second commit.
    ["the folder in refs changed before its first commit, then closed before its second", {}, [[owner("fld_1", "bob")], [shut("fld_1")]], "fld_1", [["open"], ["open"], ["closed"]]],
  ];
  for (const [what, shape, changes, which, reads] of refused) {
    it(`${what}: the call runs again, sees it, and is refused`, async () => {
      const r = await around(shape, changes);
      expect(r.changed).toEqual(committed(changes));
      expect(r.add).toMatchObject({ _tag: "Shut", what: which });
      expect(r.runs).toEqual(reads);
      expect(r.notes).toEqual(BASE);
    });
  }

  // [what, shape, changes, what each run read, the notes stored]: a change that isn't a state's still makes it run again, then it commits.
  const again: ReadonlyArray<readonly [string, Shape, ReadonlyArray<ReadonlyArray<Change>>, ReadonlyArray<ReadonlyArray<unknown>>, ReadonlyArray<string>]> = [
    ["the folder it was handed in refs, given another owner", {}, [[owner("fld_1", "bob")]], [["open"], ["open"]], [...BASE, "nte_a@fld_1"]],
    ["a folder its handler found, given another owner", { plan: { reads: [find("folder", "fld_3")] } }, [[owner("fld_3", "bob")]], [["open", "open"], ["open", "open"]], [...BASE, "nte_a@fld_1"]],
    // Its fields are as the call read them again, but its version moved on.
    ["the folder in refs given another owner and then its own back", {}, [[owner("fld_1", "bob"), owner("fld_1", "ada")]], [["open"], ["open"]], [...BASE, "nte_a@fld_1"]],
    ["a shelf it found, given another label", { plan: { reads: [find("shelf", "shf_1")] } }, [[label(Shelf, "shf_1", "pine")]], [["open", "oak"], ["open", "pine"]], [...BASE, "nte_a@fld_1"]],
    ["the folder in refs given another owner, the call only moving a note", { plan: { move: true } }, [[owner("fld_1", "bob")]], [["open"], ["open"]], ["nte_0@fld_1", "nte_9@fld_3"]],
  ];
  for (const [what, shape, changes, reads, notes] of again) {
    it(`${what}: the call runs again, then commits`, async () => {
      const r = await around(shape, changes);
      expect(r.changed).toEqual(committed(changes));
      expect(r.add).toEqual({ note: shape.plan?.move ? "nte_0" : "nte_a" });
      expect(r.runs).toEqual(reads);
      expect(r.notes).toEqual(notes);
    });
  }

  // Controls: a change to a row the call didn't read leaves it on its first run, so a build can't pass by running every call again.
  const unread: ReadonlyArray<readonly [string, Shape, ReadonlyArray<ReadonlyArray<Change>>, ReadonlyArray<ReadonlyArray<unknown>>, ReadonlyArray<string>]> = [
    ["another folder closed, its id starting with the read one's", {}, [[shut("fld_10")]], [["open"]], [...BASE, "nte_a@fld_1"]],
    ["another folder closed, the handler finding a folder of its own", { plan: { reads: [find("folder", "fld_3")] } }, [[shut("fld_10")]], [["open", "open"]], [...BASE, "nte_a@fld_1"]],
    ["another folder given another owner", {}, [[owner("fld_2", "bob")]], [["open"]], [...BASE, "nte_a@fld_1"]],
    ["another shelf labelled shut, the handler finding a shelf", { plan: { reads: [find("shelf", "shf_1")] } }, [[label(Shelf, "shf_2", "shut")]], [["open", "oak"]], [...BASE, "nte_a@fld_1"]],
    ["another note given another label, the handler finding a note", { plan: { reads: [find("note", "nte_9")] } }, [[label(Note, "nte_0", "other")]], [["open", "keep"]], [...BASE, "nte_a@fld_1"]],
    // The read folder's notes, not the folder: the call listed none of them, so a guard on the table it writes, or the rows pointing at it, is too wide.
    ["a new note in the folder it read", {}, [[(u) => u.records.insert(Note, { id: "nte_b", folder: "fld_1", label: "none" })]], [["open"]], [...BASE, "nte_b@fld_1", "nte_a@fld_1"]],
    ["another folder's note moved into the folder it read", {}, [[(u) => u.records.update(Note, "nte_0", { folder: "fld_1" })]], [["open"]], ["nte_0@fld_1", "nte_9@fld_3", "nte_a@fld_1"]],
    ["another folder closed, the call listing notes too", { plan: { reads: [{ list: "fld_2" }] } }, [[shut("fld_10")]], [["open"]], [...BASE, "nte_a@fld_1"]],
    ["another folder closed, the call only moving a note", { plan: { move: true } }, [[shut("fld_10")]], [["open"]], ["nte_0@fld_1", "nte_9@fld_3"]],
  ];
  for (const [what, shape, changes, reads, notes] of unread) {
    it(`control, ${what}: the call commits on its first run`, async () => {
      const r = await around(shape, changes);
      expect(r.changed).toEqual(committed(changes));
      expect(r.add).toEqual({ note: shape.plan?.move ? "nte_0" : "nte_a" });
      expect(r.runs).toEqual(reads);
      expect(r.notes).toEqual(notes);
    });
  }
});
