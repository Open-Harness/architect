import { Blueprint } from "orthograph";
import { describe, expect, it } from "vitest";
import { Times } from "./service.ts";

const Instant = Blueprint.value(Blueprint.instant());
const Membership = Blueprint.thing({
  description: "A club membership.",
  fields: { id: Blueprint.id("mbr"), name: Blueprint.text(), startedAt: Instant, zone: Blueprint.text() },
});
const Started = Blueprint.event({ membership: Membership.fields.id });
const machine = (moves: Record<string, never>) => Blueprint.machine(Membership, { states: ["active"], moves: moves as never, notFrom: { exit: 1 } });

const checked = (by: ReturnType<typeof Blueprint.time.every>, more: { readonly late?: "10 minutes"; readonly lazy?: boolean; readonly from?: ReadonlyArray<"active"> } = {}) => {
  const m = machine({ renew: { from: more.from ?? ["active"], to: "active", emits: Started, by, ...(more.late ? { late: more.late } : {}), ...(more.lazy ? { lazy: true } : {}) } } as never);
  return Times.move({ name: "membership", thing: Membership, key: "renew", move: m.moves["renew"] as never });
};

describe("time", () => {
  it("writes a declared move as plain data", () => {
    const { time, problems } = checked(Blueprint.time.every("1 month", { from: "startedAt" }), { late: "10 minutes", lazy: true });
    expect(problems).toEqual([]);
    expect(time).toEqual({ by: { kind: "every", span: "1 month", from: "startedAt" }, late: "10 minutes", lazy: true });
  });

  it("names the move and the reason for each refusal", () => {
    expect(checked(Blueprint.time.every("1 month", { from: "joinedAt" })).problems).toEqual([expect.stringMatching(/membership\.renew.*joinedAt/)]);
    expect(checked(Blueprint.time.every("1 month", { from: "name" })).problems).toEqual([expect.stringMatching(/membership\.renew.*name.*instant/)]);
    expect(checked(Blueprint.time.after("name", "1 day")).problems).toEqual([expect.stringMatching(/membership\.renew.*name.*instant/)]);
    expect(checked(Blueprint.time.every("1 month", { on: { day: 25 } })).problems).toEqual([expect.stringMatching(/membership\.renew.*zone/)]);
    expect(checked(Blueprint.time.every("1 month", { on: { day: 25 }, zone: "Europe/Londres" })).problems).toEqual([expect.stringMatching(/membership\.renew.*Europe\/Londres/)]);
    expect(checked(Blueprint.time.every("1 month", { from: "startedAt" }), { from: [] }).problems).toEqual([expect.stringMatching(/membership\.renew.*no from/)]);
    expect(checked(Blueprint.time.every("a month" as never, { from: "startedAt" })).problems).toEqual([expect.stringMatching(/membership\.renew.*a month/)]);
  });

  it("accepts a zone that is a text field of the thing, and a real tz name", () => {
    expect(checked(Blueprint.time.every("1 month", { on: { day: "last" }, zone: "zone" })).problems).toEqual([]);
    expect(checked(Blueprint.time.every("1 month", { on: { weekday: "friday" }, zone: "Europe/London" })).problems).toEqual([]);
  });

  it("refuses the keeper on a read, and on an operation whose move is not made by time, naming each; and counts reads as using it", () => {
    const keeper = [{ kind: "keeper" }];
    expect(Times.keeper({ file: "f.ts", name: "purse.get", kind: "read", move: undefined, allowed: keeper })).toEqual([expect.stringMatching(/purse\.get allows the keeper, but it is a read/)]);
    expect(Times.keeper({ file: "f.ts", name: "purse.open", kind: "operation", move: undefined, allowed: keeper })).toEqual([expect.stringMatching(/purse\.open.*makes no move/)]);
    expect(Times.keeper({ file: "f.ts", name: "purse.get", kind: "read", move: undefined, allowed: [{ kind: "anyone" }] })).toEqual([]);
    expect(Times.keeperUsed([[{ kind: "anyone" }], keeper])).toBe(true);
    expect(Times.keeperUsed([[{ kind: "anyone" }], { what: "who may" }])).toBe(false);
  });

  it("says a span is a whole number of its unit", () => {
    expect(checked(Blueprint.time.every("1.5 months" as never, { from: "startedAt" })).problems).toEqual([expect.stringMatching(/membership\.renew.*1\.5 months.*whole number/)]);
  });

  it("normalises a clock's start to ISO 8601 with milliseconds", () => {
    expect(Times.clock({ file: "f", clock: Blueprint.clock.stepped({ starts: "2027-01-10T09:00:00Z" }) })).toEqual({ clock: { kind: "stepped", starts: "2027-01-10T09:00:00.000Z" }, problems: [] });
    expect(Times.clock({ file: "f", clock: Blueprint.clock.real() })).toEqual({ clock: { kind: "real" }, problems: [] });
    expect(Times.clock({ file: "f", clock: Blueprint.clock.stepped({ starts: "someday" }) }).problems).toHaveLength(1);
  });
});
