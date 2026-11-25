// #1045, the D1 store's half: a row a call read counts as read at its commit, as a list's rows do (#764). A handler judges rows it read (a payload's
// `refs.<field>`, or its own `Records.find`) and writes a row pointing at one. When another call changes a row it read before this one commits, the commit
// is a `conflict` and the call runs again, seeing the change. A row the call didn't read changing, or a row it read that nobody changed, leaves it on its
// first run. Every read counts, whatever its thing (with a machine or none, the thing the call writes or another), however the handler came to its id,
// however many it read, at whatever version, whether the call inserts or only updates, lists as well or not, and on every attempt. The in-memory half is
// language-effect's records/ref-race.test.ts, with the same cases; this runs the same handlers through `Handlers.serve` over `StoreD1`, in real workerd
// and real D1, so the build picks how D1 guards a read. The tables are test/migrations/0011_folders.sql. Written by the checks author for Goal 16; the
// builder never edits this file or that migration, and only removes lines from `expected-failing/`.
// Agreed with Goal 16 (25 November 2026): retry, not refuse (the rerun is the runtime's existing conflict-retry, with no budget or outcome of its own);
// the row's version is the guard, not its state; every read counts. Open, and judged by no check here, so a build may answer either way: a find that
// found nothing, then a row inserted with that id before the commit (a phantom); and whether the role check's own reads are guarded.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { env } from "cloudflare:workers";
import { Cause, Deferred, Effect, Exit, Fiber, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint, type Thing } from "orthograph";
import { ErrorNames, EventNames } from "orthograph/server";
import { BusyLive, Handlers, Records, Store, Unit, type Instance } from "@orthograph/language-effect";
import { Database } from "#modules/database/service.js";
import { StoreD1 } from "./service.ts";

const Folder = Blueprint.thing({ description: "Where notes are kept, until it's closed.", fields: { id: Blueprint.id("fld"), owner: Blueprint.text({ max: 20 }) } });
const Shelf = Blueprint.thing({ description: "A shelf, with no machine of its own.", fields: { id: Blueprint.id("shf"), label: Blueprint.text({ max: 20 }) } });
const Note = Blueprint.thing({
  description: "A note in a folder.", fields: { id: Blueprint.id("nte"), folder: Folder.fields.id, copy: Blueprint.optional(Folder.fields.id), label: Blueprint.text({ max: 20 }) },
});
const Closed = Blueprint.event({ folder: Folder.fields.id });
EventNames.name(Closed, "Closed");
const machine = Blueprint.machine(Folder, { states: ["open", "closed"], moves: { close: { from: ["open"], to: "closed", emits: Closed } }, notFrom: { exit: 40 } });
class Shut extends Blueprint.error({ what: Blueprint.text({ max: 60 }) }, { exit: 41 }) {}
ErrorNames.name(Shut, "Shut");
class FolderHasNotes extends Blueprint.error({ folder: Folder.fields.id }, { exit: 42 }) {}
ErrorNames.name(FolderHasNotes, "FolderHasNotes");
const file = Blueprint.operation(Note, {
  description: "File a note in an open folder: a new one, or one moved there.",
  payload: { id: Note.fields.id, folder: Note.fields.folder, copy: Note.fields.copy, plan: Blueprint.optional(Blueprint.text({ max: 600 })) },
  answer: { note: Note.fields.id }, errors: [Shut], allowed: [Blueprint.signedIn],
});
const close = Blueprint.operation(Folder, {
  description: "Close a folder with no notes in it.", payload: { id: Folder.fields.id }, answer: { folder: Folder.fields.id }, move: machine.moves.close, errors: [FolderHasNotes], allowed: [Blueprint.signedIn],
});
const ada = { kind: "person", person: "per_ada", via: "session" } as const;
const layer = Layer.mergeAll(BusyLive, StoreD1.layer({ tables: [[Folder, "folder"], [Shelf, "shelf"], [Note, "folder_note"]] }).pipe(Layer.provide(Database.d1(env.DB))));

/** What the handler reads besides its refs: a row by an id the plan names, a note and then the folder its field names, or a folder's notes (not judged). */
type Read = { readonly find: "folder" | "shelf" | "note"; readonly id: string } | { readonly via: string } | { readonly list: string };
/** `move`: the call only updates (it moves its note, `id`, into `folder`) instead of inserting one. */
type Plan = { readonly reads?: ReadonlyArray<Read>; readonly move?: boolean };
const things = { folder: Folder, shelf: Shelf, note: Note } as const;

type Run = { id: string; read: ReadonlyArray<unknown> };
/** The same handler as the in-memory half: read, `between`, judge every row read (refuse `Shut` naming it), then insert or move its note. */
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

/**
 * Each test has rows of its own: the in-memory half's ids with a tag after the underscore (`fld_1` is `fld_<tag>1`), so `fld_10`'s id still starts with
 * `fld_1`'s and a guard matching ids by prefix reads it. `sym` maps a real id back, so the expectations read as the in-memory half's.
 */
let made = 0;
const fresh = () => {
  const tag = `${++made}${Math.random().toString(36).slice(2, 6)}q`;
  const real = (s: string) => s.replace("_", `_${tag}`);
  const sym = (x: unknown) => (typeof x === "string" ? x.replace(`_${tag}`, "_") : x);
  return { real, sym };
};
type Ids = ReturnType<typeof fresh>;
// The seeded rows, each at a version of its own: a guard on rows at version 0 alone, or on rows changed before, misses one.
const seed = ({ real }: Ids) => env.DB.batch([
  ...([["fld_1", 2], ["fld_2", 0], ["fld_10", 0], ["fld_3", 5]] as const).map(([id, v]) =>
    env.DB.prepare(`INSERT INTO "folder" ("id", "owner", "state", "version") VALUES (?, 'ada', 'open', ?)`).bind(real(id), v)),
  ...([["shf_1", "oak", 1], ["shf_2", "elm", 0]] as const).map(([id, l, v]) =>
    env.DB.prepare(`INSERT INTO "shelf" ("id", "label", "version") VALUES (?, ?, ?)`).bind(real(id), l, v)),
  ...([["nte_0", "fld_2", "none", 0], ["nte_9", "fld_3", "keep", 3]] as const).map(([id, f, l, v]) =>
    env.DB.prepare(`INSERT INTO "folder_note" ("id", "folder", "label", "version") VALUES (?, ?, ?, ?)`).bind(real(id), real(f), l, v)),
]);
const notesOf = ({ real, sym }: Ids) =>
  env.DB.prepare(`SELECT "id", "folder" FROM "folder_note" WHERE "id" LIKE ? ORDER BY rowid`).bind(`${real("nte_")}%`).all<{ id: string; folder: string }>()
    .then((r) => r.results.map((x) => `${sym(x.id)}@${sym(x.folder)}`));
const stateOf = (id: string) => env.DB.prepare(`SELECT "state" FROM "folder" WHERE "id" = ?`).bind(id).first<{ state: string }>().then((r) => r?.state);
const BASE = ["nte_0@fld_2", "nte_9@fld_3"];
/** A call that died (a build's defect) is not a refusal: name it before judging. Ids in an answer or a refusal read as the in-memory half's. */
const ended = (e: Exit.Exit<any, any>, { sym }: Ids) => {
  if (Exit.isSuccess(e)) return Object.fromEntries(Object.entries(e.value).map(([k, v]) => [k, sym(v)]));
  if (Cause.hasDies(e.cause)) return `died: ${String(Cause.squash(e.cause))}`;
  const r = Cause.squash(e.cause) as any;
  return { _tag: r?._tag, ...("what" in (r ?? {}) ? { what: sym(r.what) } : {}), ...("folder" in (r ?? {}) ? { folder: sym(r.folder) } : {}) };
};

describe("in D1, a create that reads its folder races the folder's close (#1045)", () => {
  const race = async (order: "close lands between" | "add lands between") => {
    const ids = fresh(), { real } = ids;
    await seed(ids);
    const runs: Array<Run> = [];
    const r = await Effect.runPromise(Effect.gen(function* () {
      const read = yield* Deferred.make<void>();
      const go = yield* Deferred.make<void>();
      const hold = (_id: string, attempt: number) => (attempt === 1 ? Effect.andThen(Deferred.succeed(read, undefined), Deferred.await(go)) : Effect.void);
      const addCall = (h: typeof hold) => filing(runs, h).run({ id: real("nte_a"), folder: real("fld_1") } as never, ada);
      if (order === "close lands between") {
        const fiber = yield* Effect.forkChild(addCall(hold));
        yield* Effect.raceFirst(Deferred.await(read), Effect.andThen(Fiber.join(fiber), Effect.die(new Error("the add ended before it read its folder"))));
        const closed = yield* Effect.exit(closing.run({ id: real("fld_1") } as never, ada));
        yield* Deferred.succeed(go, undefined);
        return { add: yield* Fiber.await(fiber), closed };
      }
      // The other order, already safe (#764): the close lists no notes, the add commits, so the close runs again and meets the note.
      const listed = yield* Deferred.make<void>();
      const holdList = yield* Deferred.make<void>();
      let lists = 0;
      const watching = Layer.effect(Store, Effect.gen(function* () {
        const s = yield* Store;
        return Store.of({ ...s, list: (q) => Effect.tap(s.list(q), () => (++lists === 1 ? Effect.andThen(Deferred.succeed(listed, undefined), Deferred.await(holdList)) : Effect.void)) });
      }));
      const fiber = yield* Effect.forkChild(Effect.exit(closing.run({ id: real("fld_1") } as never, ada).pipe(Effect.provide(watching.pipe(Layer.provide(layer))))));
      yield* Deferred.await(listed);
      const add = yield* Effect.exit(addCall(() => Effect.void));
      yield* Deferred.succeed(holdList, undefined);
      return { add, closed: yield* Fiber.join(fiber) };
    }).pipe(Effect.provide(layer)) as Effect.Effect<any>);
    return { add: ended(r.add, ids), closed: ended(r.closed, ids), runs: runs.map((x) => ({ id: ids.sym(x.id), read: x.read })), notes: await notesOf(ids), state: await stateOf(real("fld_1")) };
  };

  it("the close lands between the add's read and its commit: the add runs again, sees the folder closed, and is refused", { timeout: 15_000 }, async () => {
    const r = await race("close lands between");
    expect(r.closed).toEqual({ folder: "fld_1" });
    expect(r.state).toBe("closed");
    expect(r.add).toEqual({ _tag: "Shut", what: "fld_1" });
    expect(r.runs).toEqual([{ id: "nte_a", read: ["open"] }, { id: "nte_a", read: ["closed"] }]);
    expect(r.notes).toEqual(BASE);
  });

  it("control, the add lands between the close's list and its commit: the close runs again and is refused", { timeout: 15_000 }, async () => {
    const r = await race("add lands between");
    expect(r.add).toEqual({ note: "nte_a" });
    expect(r.closed).toEqual({ _tag: "FolderHasNotes", folder: "fld_1" });
    expect(r.state).toBe("open");
    expect(r.notes).toEqual([...BASE, "nte_a@fld_1"]);
  });

  it("control, two adds that read one folder: a read is not a write, so both commit on their first run", { timeout: 15_000 }, async () => {
    const ids = fresh(), { real } = ids;
    await seed(ids);
    const runs: Array<Run> = [];
    const exits = await Effect.runPromise(Effect.gen(function* () {
      const both = yield* Deferred.make<void>();
      let read = 0;
      const s = filing(runs, (_id, attempt) => (attempt > 1 ? Effect.void : Effect.suspend(() => (++read === 2 ? Deferred.succeed(both, undefined) : Deferred.await(both)))));
      const open = (e: Effect.Effect<any, any, any>) => Effect.ensuring(Effect.exit(e), Deferred.succeed(both, undefined));
      return yield* Effect.all([open(s.run({ id: real("nte_a"), folder: real("fld_1") } as never, ada)), open(s.run({ id: real("nte_b"), folder: real("fld_1") } as never, ada))], { concurrency: "unbounded" });
    }).pipe(Effect.provide(layer)) as unknown as Effect.Effect<Array<Exit.Exit<any, any>>>);
    expect(exits.map((e) => ended(e, ids))).toEqual([{ note: "nte_a" }, { note: "nte_b" }]);
    expect(runs.map((r) => ids.sym(r.id))).toEqual(["nte_a", "nte_b"]);
  });
});

describe("in D1, a row the call read, changed before its commit (#1045)", () => {
  type Change = (unit: any, real: (s: string) => string) => Effect.Effect<void, any, any>;
  type Shape = { readonly copy?: string; readonly plan?: Plan };
  const realPlan = (plan: Plan, real: (s: string) => string): Plan => ({
    ...plan,
    ...(plan.reads === undefined ? {} : {
      reads: plan.reads.map((r) => ("list" in r ? { list: real(r.list) } : "via" in r ? { via: real(r.via) } : { find: r.find, id: real(r.id) })),
    }),
  });
  /** The call reads its rows, then before its commit `changes[attempt - 1]` commit, one commit each, then it goes on. */
  const around = async (shape: Shape, changes: ReadonlyArray<ReadonlyArray<Change>>) => {
    const ids = fresh(), { real } = ids;
    await seed(ids);
    const runs: Array<Run> = [];
    const changed: Array<unknown> = [];
    const exit = await Effect.runPromise(Effect.gen(function* () {
      const store = yield* Store;
      const between = (_id: string, attempt: number) => Effect.forEach(changes[attempt - 1] ?? [], (change) => Effect.gen(function* () {
        const unit: any = yield* Unit.make(store);
        yield* change(unit, real);
        changed.push(yield* store.commit({ writes: yield* unit.writes, entries: [] }));
      }), { discard: true });
      const payload = {
        id: real(shape.plan?.move ? "nte_0" : "nte_a"), folder: real("fld_1"),
        ...(shape.copy === undefined ? {} : { copy: real(shape.copy) }), ...(shape.plan === undefined ? {} : { plan: JSON.stringify(realPlan(shape.plan, real)) }),
      };
      return yield* Effect.exit(filing(runs, between).run(payload as never, ada));
    }).pipe(Effect.provide(layer)) as Effect.Effect<any>);
    return { changed, add: ended(exit, ids), runs: runs.map((x) => x.read), notes: await notesOf(ids) };
  };
  const shut = (id: string): Change => (u, real) => u.setState(Folder, real(id), "closed");
  const owner = (id: string, to: string): Change => (u, real) => u.records.update(Folder, real(id), { owner: to });
  const label = (thing: Thing, id: string, to: string): Change => (u, real) => u.records.update(thing, real(id), { label: to });
  const find = (thing: "folder" | "shelf" | "note", id: string): Read => ({ find: thing, id });
  const committed = (changes: ReadonlyArray<ReadonlyArray<Change>>) => changes.flat().map(() => "committed");

  const refused: ReadonlyArray<readonly [string, Shape, ReadonlyArray<ReadonlyArray<Change>>, string, ReadonlyArray<ReadonlyArray<unknown>>]> = [
    ["the folder it was handed in refs, closed", {}, [[shut("fld_1")]], "fld_1", [["open"], ["closed"]]],
    ["a folder its handler found, closed", { plan: { reads: [find("folder", "fld_3")] } }, [[shut("fld_3")]], "fld_3", [["open", "open"], ["open", "closed"]]],
    ["the second folder it was handed, closed", { copy: "fld_10" }, [[shut("fld_10")]], "fld_10", [["open", "open"], ["open", "closed"]]],
    ["the third folder it read, closed", { copy: "fld_10", plan: { reads: [find("folder", "fld_3")] } }, [[shut("fld_3")]], "fld_3", [["open", "open", "open"], ["open", "open", "closed"]]],
    ["a shelf it found, which has no machine, labelled shut", { plan: { reads: [find("shelf", "shf_1")] } }, [[label(Shelf, "shf_1", "shut")]], "shf_1", [["open", "oak"], ["open", "shut"]]],
    ["another note it found, of the thing it writes, labelled shut", { plan: { reads: [find("note", "nte_9")] } }, [[label(Note, "nte_9", "shut")]], "nte_9", [["open", "keep"], ["open", "shut"]]],
    ["a folder found by an id another row holds, closed", { plan: { reads: [{ via: "nte_9" }] } }, [[shut("fld_3")]], "fld_3", [["open", "keep", "open"], ["open", "keep", "closed"]]],
    ["the folder in refs closed, the call listing notes too", { plan: { reads: [{ list: "fld_2" }] } }, [[shut("fld_1")]], "fld_1", [["open"], ["closed"]]],
    ["the folder in refs closed, the call only moving a note", { plan: { move: true } }, [[shut("fld_1")]], "fld_1", [["open"], ["closed"]]],
    ["the folder in refs changed before its first commit, then closed before its second", {}, [[owner("fld_1", "bob")], [shut("fld_1")]], "fld_1", [["open"], ["open"], ["closed"]]],
  ];
  for (const [what, shape, changes, which, reads] of refused) {
    it(`${what}: the call runs again, sees it, and is refused`, { timeout: 15_000 }, async () => {
      const r = await around(shape, changes);
      expect(r.changed).toEqual(committed(changes));
      expect(r.add).toEqual({ _tag: "Shut", what: which });
      expect(r.runs).toEqual(reads);
      expect(r.notes).toEqual(BASE);
    });
  }

  const again: ReadonlyArray<readonly [string, Shape, ReadonlyArray<ReadonlyArray<Change>>, ReadonlyArray<ReadonlyArray<unknown>>, ReadonlyArray<string>]> = [
    ["the folder it was handed in refs, given another owner", {}, [[owner("fld_1", "bob")]], [["open"], ["open"]], [...BASE, "nte_a@fld_1"]],
    ["a folder its handler found, given another owner", { plan: { reads: [find("folder", "fld_3")] } }, [[owner("fld_3", "bob")]], [["open", "open"], ["open", "open"]], [...BASE, "nte_a@fld_1"]],
    ["the folder in refs given another owner and then its own back", {}, [[owner("fld_1", "bob"), owner("fld_1", "ada")]], [["open"], ["open"]], [...BASE, "nte_a@fld_1"]],
    ["a shelf it found, given another label", { plan: { reads: [find("shelf", "shf_1")] } }, [[label(Shelf, "shf_1", "pine")]], [["open", "oak"], ["open", "pine"]], [...BASE, "nte_a@fld_1"]],
    ["the folder in refs given another owner, the call only moving a note", { plan: { move: true } }, [[owner("fld_1", "bob")]], [["open"], ["open"]], ["nte_0@fld_1", "nte_9@fld_3"]],
  ];
  for (const [what, shape, changes, reads, notes] of again) {
    it(`${what}: the call runs again, then commits`, { timeout: 15_000 }, async () => {
      const r = await around(shape, changes);
      expect(r.changed).toEqual(committed(changes));
      expect(r.add).toEqual({ note: shape.plan?.move ? "nte_0" : "nte_a" });
      expect(r.runs).toEqual(reads);
      expect(r.notes).toEqual(notes);
    });
  }

  const unread: ReadonlyArray<readonly [string, Shape, ReadonlyArray<ReadonlyArray<Change>>, ReadonlyArray<ReadonlyArray<unknown>>, ReadonlyArray<string>]> = [
    ["another folder closed, its id starting with the read one's", {}, [[shut("fld_10")]], [["open"]], [...BASE, "nte_a@fld_1"]],
    ["another folder closed, the handler finding a folder of its own", { plan: { reads: [find("folder", "fld_3")] } }, [[shut("fld_10")]], [["open", "open"]], [...BASE, "nte_a@fld_1"]],
    ["another folder given another owner", {}, [[owner("fld_2", "bob")]], [["open"]], [...BASE, "nte_a@fld_1"]],
    ["another shelf labelled shut, the handler finding a shelf", { plan: { reads: [find("shelf", "shf_1")] } }, [[label(Shelf, "shf_2", "shut")]], [["open", "oak"]], [...BASE, "nte_a@fld_1"]],
    ["another note given another label, the handler finding a note", { plan: { reads: [find("note", "nte_9")] } }, [[label(Note, "nte_0", "other")]], [["open", "keep"]], [...BASE, "nte_a@fld_1"]],
    ["a new note in the folder it read", {}, [[(u, real) => u.records.insert(Note, { id: real("nte_b"), folder: real("fld_1"), label: "none" })]], [["open"]], [...BASE, "nte_b@fld_1", "nte_a@fld_1"]],
    ["another folder's note moved into the folder it read", {}, [[(u, real) => u.records.update(Note, real("nte_0"), { folder: real("fld_1") })]], [["open"]], ["nte_0@fld_1", "nte_9@fld_3", "nte_a@fld_1"]],
    ["another folder closed, the call listing notes too", { plan: { reads: [{ list: "fld_2" }] } }, [[shut("fld_10")]], [["open"]], [...BASE, "nte_a@fld_1"]],
    ["another folder closed, the call only moving a note", { plan: { move: true } }, [[shut("fld_10")]], [["open"]], ["nte_0@fld_1", "nte_9@fld_3"]],
  ];
  for (const [what, shape, changes, reads, notes] of unread) {
    it(`control, ${what}: the call commits on its first run`, { timeout: 15_000 }, async () => {
      const r = await around(shape, changes);
      expect(r.changed).toEqual(committed(changes));
      expect(r.add).toEqual({ note: shape.plan?.move ? "nte_0" : "nte_a" });
      expect(r.runs).toEqual(reads);
      expect(r.notes).toEqual(notes);
    });
  }
});
