// #976: an optional reference in an operation's payload (`Blueprint.optional(Shift.fields.id)`, as Capxul's attendance
// names its shift), at the runtime. Left out, nothing is read for it: the handler runs, and `refs` holds no shift. Given
// an id of a shift that exists, the handler gets that shift in `refs.shift`. Given an id that names nothing, the call is
// refused `ShiftNotFound` carrying the id, or `NotAllowed` where a role check reads the field, as for a required
// reference; the handler never runs. A role check that reads the field refuses a call that leaves it out: no shift, no
// lead of it. The `notFound` map is the one the compiler writes for these operations (compiler's
// `model/optional-ref-payload.test.ts`). Green when written, after #974: a guard.
import { Cause, Effect, Exit, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { EventNames } from "orthograph/server";
import { storeMemory } from "#modules/records/service.js";
import { BusyLive } from "#modules/work/service.js";
import { Handlers } from "./service.ts";

const Shift = Blueprint.thing({ description: "A shift.", fields: { id: Blueprint.id("shf"), lead: Blueprint.id("per") } });
const Attendance = Blueprint.thing({ description: "Someone was there.", fields: { id: Blueprint.id("att"), shift: Blueprint.optional(Shift.fields.id), who: Blueprint.text() } });
const Marked = Blueprint.event({ attendance: Attendance.fields.id });
EventNames.name(Marked, "Marked");
const machine = Blueprint.machine(Attendance, { states: ["marked"], moves: { mark: { from: [], to: "marked", emits: Marked } }, notFrom: { exit: 40 } });
const lead = Blueprint.role(Shift, { rule: (s, who) => s.lead === who.person });
const marking = (allowed: ReadonlyArray<unknown>) => Blueprint.operation(Attendance, {
  description: "Mark who was there.", payload: { shift: Attendance.fields.shift, who: Attendance.fields.who }, answer: { attendance: Attendance.fields.id },
  move: machine.moves.mark, allowed: allowed as never,
});
// [name, operation, the compiler's notFound for it]: signed in reads no shift; the lead's role check reads it.
const OPS = [
  ["attendance.mark", marking([Blueprint.signedIn]), { shift: "ShiftNotFound" }],
  ["attendance.lead-mark", marking([lead]), {}],
] as const;

const ada = { kind: "person", person: "per_ada", via: "session" } as const;
const SHIFT = { id: "shf_1", lead: "per_ada" };
const world = () => storeMemory([[Shift, SHIFT]]);

/** How a call ended, and the refs each run of the handler was given. */
const called = async (index: 0 | 1, payload: Readonly<Record<string, unknown>>) => {
  const [name, operation, notFound] = OPS[index];
  const refs: Array<Readonly<Record<string, unknown>>> = [];
  const handler = (_payload: unknown, context: { readonly refs: Readonly<Record<string, unknown>>; readonly id?: string; readonly move: () => Effect.Effect<void> }) =>
    Effect.sync(() => void refs.push({ ...context.refs })).pipe(Effect.andThen(context.move()), Effect.as({ attendance: context.id }));
  const served = Handlers.serve({ name, operation, handler, notFound } as never);
  const exit = await Effect.runPromiseExit(served.call(payload, ada).pipe(Effect.provide(Layer.mergeAll(BusyLive, world().layer))) as never);
  return { ended: Exit.isSuccess(exit) ? "answered" : Cause.squash(exit.cause), refs };
};
const shiftIn = (refs: ReadonlyArray<Readonly<Record<string, unknown>>>) => refs.map((r) => r["shift"]);

describe("An optional reference in the payload, where no role check reads it", () => {
  it("left out: the handler runs, and nothing is read for it", async () => {
    const r = await called(0, { who: "bo" });
    expect(r.ended).toBe("answered");
    expect(shiftIn(r.refs)).toEqual([undefined]);
  });

  it("given a shift that exists: the handler gets it in refs.shift (the control)", async () => {
    const r = await called(0, { who: "bo", shift: "shf_1" });
    expect(r.ended).toBe("answered");
    expect(shiftIn(r.refs)).toEqual([expect.objectContaining(SHIFT)]);
  });

  it("given an id that names nothing: refused ShiftNotFound carrying the id, and the handler never runs", async () => {
    const r = await called(0, { who: "bo", shift: "shf_gone" });
    expect(r.ended).toMatchObject({ _tag: "ShiftNotFound", id: "shf_gone" });
    expect(r.refs).toEqual([]);
  });
});

describe("An optional reference in the payload, where the lead's role check reads it", () => {
  it("given the lead's shift: the handler runs and gets it (the control)", async () => {
    const r = await called(1, { who: "bo", shift: "shf_1" });
    expect(r.ended).toBe("answered");
    expect(shiftIn(r.refs)).toEqual([expect.objectContaining(SHIFT)]);
  });

  it("left out, or naming nothing: NotAllowed, and the handler never runs", async () => {
    for (const payload of [{ who: "bo" }, { who: "bo", shift: "shf_gone" }]) {
      const r = await called(1, payload);
      expect(r.ended, JSON.stringify(payload)).toMatchObject({ _tag: "NotAllowed" });
      expect(r.refs).toEqual([]);
    }
  });
});
