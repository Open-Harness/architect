// #976: an optional reference in an operation's payload (`Blueprint.optional(Shift.fields.id)`, as Capxul's attendance
// names its shift), at the runtime. Left out, nothing is read for it: the handler runs, `refs` has no key for it, and
// the store is never asked for a shift. Given an id of a shift that exists, the handler gets that shift in `refs`, under
// the payload's key, whatever the key is. Given an id that names nothing, the call is refused `ShiftNotFound` carrying
// the id, or `NotAllowed` where a role check reads the field, as for a required reference; the handler never runs. A role
// check that reads the field (the role on its own, or `.of("shift")` on an operation with a subject that stores a shift)
// refuses a call that leaves it out, whatever its rule says of an empty shift: no shift, no role on it. The `notFound`
// map is the one the compiler writes for these operations (compiler's `model/optional-ref-payload.test.ts`). Green when
// written, on main with #974: a guard. Its rows come from a hostile pass as well as the issue.
import { Cause, Effect, Exit, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { EventNames } from "orthograph/server";
import { storeMemory } from "#modules/records/service.js";
import { Store } from "#modules/records/types.js";
import { BusyLive } from "#modules/work/service.js";
import { Handlers } from "./service.ts";

const Shift = Blueprint.thing({ description: "A shift.", fields: { id: Blueprint.id("shf"), lead: Blueprint.id("per") } });
const Attendance = Blueprint.thing({ description: "Someone was there.", fields: { id: Blueprint.id("att"), shift: Blueprint.optional(Shift.fields.id), backup: Shift.fields.id, who: Blueprint.text() } });
const Marked = Blueprint.event({ attendance: Attendance.fields.id });
EventNames.name(Marked, "Marked");
const machine = Blueprint.machine(Attendance, {
  states: ["marked"],
  moves: { mark: { from: [], to: "marked", emits: Marked }, edit: { from: ["marked"], to: "marked", emits: Marked } },
  notFrom: { exit: 40 },
});
const lead = Blueprint.role(Shift, { rule: (s, who) => s.lead === who.person });
// True of an empty shift: a role check that decides on no shift at all would let the call in.
const notLead = Blueprint.role(Shift, { rule: (s, who) => s.lead !== who.person });
const marking = (allowed: ReadonlyArray<unknown>, payload: object = { shift: Attendance.fields.shift, who: Attendance.fields.who }) => Blueprint.operation(Attendance, {
  description: "Mark who was there.", payload: payload as never, answer: { attendance: Attendance.fields.id },
  move: machine.moves.mark, allowed: allowed as never,
});
const editing = Blueprint.operation(Attendance, {
  description: "Move an attendance to a shift.", payload: { id: Attendance.fields.id, shift: Attendance.fields.shift }, answer: { attendance: Attendance.fields.id },
  move: machine.moves.edit, allowed: [lead.of("shift")] as never,
});
// [operation, the compiler's notFound for it]: signed in reads no shift; every role here reads it.
const OPS = {
  mark: [marking([Blueprint.signedIn]), { shift: "ShiftNotFound" }],
  at: [marking([Blueprint.signedIn], { at: Attendance.fields.shift, who: Attendance.fields.who }), { at: "ShiftNotFound" }],
  whoFirst: [marking([Blueprint.signedIn], { who: Attendance.fields.who, shift: Attendance.fields.shift }), { shift: "ShiftNotFound" }],
  lead: [marking([lead]), {}],
  notLead: [marking([notLead]), {}],
  via: [marking([lead.via("session")]), {}],
  // A second field naming a shift: the role reads `shift`, the first, so a given `backup` never stands in for it.
  backup: [marking([lead], { shift: Attendance.fields.shift, backup: Attendance.fields.backup, who: Attendance.fields.who }), { backup: "ShiftNotFound" }],
  edit: [editing, {}],
} as const;

const ada = { kind: "person", person: "per_ada", via: "session" } as const;
const ADAS = { id: "shf_1", lead: "per_ada" };
const BOS = { id: "shf_2", lead: "per_bo" };

/** How a call ended, the refs each run of the handler was given, and each shift the store was asked for. */
const called = async (op: keyof typeof OPS, payload: Readonly<Record<string, unknown>>) => {
  const [operation, notFound] = OPS[op];
  const stocked = storeMemory([[Shift, ADAS], [Shift, BOS], [Attendance, { id: "att_1", shift: "shf_1", who: "bo", state: "marked" }]]);
  const asked: Array<unknown> = [];
  const counted = Layer.effect(Store, Effect.gen(function* () {
    const s = yield* Store;
    return Store.of({ ...s, find: (thing, id) => { if (thing === Shift) asked.push(id); return s.find(thing, id); } });
  })).pipe(Layer.provide(stocked.layer));
  const refs: Array<Readonly<Record<string, unknown>>> = [];
  const handler = (_payload: unknown, context: { readonly refs: Readonly<Record<string, unknown>>; readonly id?: string; readonly move: () => Effect.Effect<void> }) =>
    Effect.sync(() => void refs.push({ ...context.refs })).pipe(Effect.andThen(context.move()), Effect.as({ attendance: context.id ?? "att_1" }));
  const served = Handlers.serve({ name: `attendance.${op}`, operation, handler, notFound } as never);
  const exit = await Effect.runPromiseExit(served.call(payload, ada).pipe(Effect.provide(Layer.mergeAll(BusyLive, counted))) as never);
  return { ended: Exit.isSuccess(exit) ? "answered" : Cause.squash(exit.cause), refs, asked };
};

describe("An optional reference in the payload, where no role check reads it", () => {
  for (const [op, key] of [["mark", "shift"], ["at", "at"], ["whoFirst", "shift"]] as const) {
    describe(`under the payload key ${key}`, () => {
      it("left out: the handler runs, refs has no key for it, and no shift is read", async () => {
        const r = await called(op, { who: "bo" });
        expect(r.ended).toBe("answered");
        expect(r.refs.map((x) => Object.keys(x))).toEqual([[]]);
        expect(r.asked).toEqual([]);
      });

      it("given a shift that exists: the handler gets it under that key (the control)", async () => {
        const r = await called(op, { who: "bo", [key]: "shf_1" });
        expect(r.ended).toBe("answered");
        expect(r.refs.map((x) => x[key])).toEqual([expect.objectContaining(ADAS)]);
      });

      it("given an id that names nothing: refused ShiftNotFound carrying the id, and the handler never runs", async () => {
        const r = await called(op, { who: "bo", [key]: "shf_gone" });
        expect(r.ended).toMatchObject({ _tag: "ShiftNotFound", id: "shf_gone" });
        expect(r.refs).toEqual([]);
      });
    });
  }
});

describe("An optional reference in the payload, where a role check reads it", () => {
  it("given the lead's shift: the handler runs and gets it (the control)", async () => {
    const r = await called("lead", { who: "bo", shift: "shf_1" });
    expect(r.ended).toBe("answered");
    expect(r.refs.map((x) => x["shift"])).toEqual([expect.objectContaining(ADAS)]);
  });

  it("the lead's role, left out or naming nothing: NotAllowed, and the handler never runs", async () => {
    for (const payload of [{ who: "bo" }, { who: "bo", shift: "shf_gone" }]) {
      const r = await called("lead", payload);
      expect(r.ended, JSON.stringify(payload)).toMatchObject({ _tag: "NotAllowed" });
      expect(r.refs).toEqual([]);
    }
  });

  it("a role true of an empty shift, left out or naming nothing: NotAllowed; given a shift it holds of, the call runs (the control)", async () => {
    for (const payload of [{ who: "bo" }, { who: "bo", shift: "shf_gone" }]) {
      const out = await called("notLead", payload);
      expect(out.ended, JSON.stringify(payload)).toMatchObject({ _tag: "NotAllowed" });
      expect(out.refs).toEqual([]);
    }
    expect((await called("notLead", { who: "bo", shift: "shf_2" })).ended).toBe("answered");
  });

  it("lead.of(\"shift\") on an attendance that stores a shift: left out, NotAllowed, never the stored shift's lead", async () => {
    const out = await called("edit", { id: "att_1" });
    expect(out.ended).toMatchObject({ _tag: "NotAllowed" });
    expect(out.refs).toEqual([]);
    expect((await called("edit", { id: "att_1", shift: "shf_1" })).ended, "given the lead's shift (the control)").toBe("answered");
    expect((await called("edit", { id: "att_1", shift: "shf_2" })).ended, "given another's shift").toMatchObject({ _tag: "NotAllowed" });
  });

  it("lead.via(\"session\"), left out or another's shift: NotAllowed; the lead's shift, by session, runs (the control)", async () => {
    for (const payload of [{ who: "bo" }, { who: "bo", shift: "shf_2" }]) {
      const r = await called("via", payload);
      expect(r.ended, JSON.stringify(payload)).toMatchObject({ _tag: "NotAllowed" });
      expect(r.refs).toEqual([]);
    }
    expect((await called("via", { who: "bo", shift: "shf_1" })).ended).toBe("answered");
  });

  it("another field naming a shift never stands in for the one left out: NotAllowed", async () => {
    const out = await called("backup", { who: "bo", backup: "shf_1" });
    expect(out.ended).toMatchObject({ _tag: "NotAllowed" });
    expect(out.refs).toEqual([]);
    expect((await called("backup", { who: "bo", backup: "shf_2", shift: "shf_1" })).ended, "the lead's shift given (the control)").toBe("answered");
  });
});
