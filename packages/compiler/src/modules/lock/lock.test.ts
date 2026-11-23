import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { RefusalLock, EMPTY_LOCK } from "./service.ts";
import type { Lock, Wanted } from "./types.ts";

const declared = (name: string, fields: Wanted["fields"] = {}): Wanted => ({ name, owner: "ticket", from: "blueprint/things/ticket/errors.ts", fields, prefix: "TK" });
const machine = (name: string): Wanted => ({ name, owner: "ticket", fields: {}, code: "TK-900", prefix: "TK" });
const codes = (lock: Lock) => RefusalLock.codes(lock);

describe("the refusals lock", () => {
  it("numbers a first lock in the order the errors are declared, and keeps the runtime's", () => {
    const lock = RefusalLock.evolve(EMPTY_LOCK, [...RefusalLock.runtime(false), declared("TooBig"), declared("Busy"), machine("NotOpen")]);
    expect(codes(lock)).toEqual({ NotAllowed: "AR-001", IdempotencyConflict: "AR-002", TooBig: "TK-001", Busy: "TK-002", NotOpen: "TK-900" });
    expect(lock.retired).toEqual({});
  });

  it("keeps a name's code when the errors are reordered, gives a new name the next number, and retires a name that left", () => {
    const first = RefusalLock.evolve(EMPTY_LOCK, [declared("TooBig"), declared("Busy")]);
    const swapped = RefusalLock.evolve(first, [declared("Busy"), declared("TooBig")]);
    expect(codes(swapped)).toEqual(codes(first));
    const added = RefusalLock.evolve(first, [declared("Late"), declared("TooBig"), declared("Busy")]);
    expect(codes(added)).toMatchObject({ TooBig: "TK-001", Busy: "TK-002", Late: "TK-003" });
    const left = RefusalLock.evolve(first, [declared("TooBig")]);
    expect(left.retired["TK-002"]).toEqual(first.refusals["TK-002"]);
    expect(codes(RefusalLock.evolve(left, [declared("TooBig"), declared("Late")]))).toMatchObject({ Late: "TK-003" });
  });

  it("a name that comes back takes its old code, since a name keeps its code", () => {
    const first = RefusalLock.evolve(EMPTY_LOCK, [declared("TooBig"), declared("Busy")]);
    const left = RefusalLock.evolve(first, [declared("TooBig")]);
    const back = RefusalLock.evolve(left, [declared("TooBig"), declared("Busy")]);
    expect(codes(back)).toMatchObject({ Busy: "TK-002" });
    expect(back.retired).toEqual({});
  });

  it("moves the old wire identity of a renamed machine refusal to earlier, keeping its code", () => {
    const first = RefusalLock.evolve(EMPTY_LOCK, [machine("NotOpen")]);
    const renamed = RefusalLock.evolve(first, [machine("NotFresh")]);
    expect(renamed.refusals["TK-900"]).toMatchObject({ name: "NotFresh", wire: { effect: { tag: "NotFresh" } }, earlier: [{ effect: { tag: "NotOpen" } }] });
    expect(renamed.retired).toEqual({});
  });

  it("writes two-space JSON with a closing newline, and reads what it wrote", async () => {
    const lock = RefusalLock.evolve(EMPTY_LOCK, [declared("TooBig", { cap: { value: "uint", bits: 64 } })]);
    const text = RefusalLock.text(lock);
    expect(text.endsWith("}\n")).toBe(true);
    expect(JSON.parse(text)).toMatchObject({ lockVersion: 1 });
    expect(await Effect.runPromise(RefusalLock.parse(text))).toEqual(lock);
    expect(await Effect.runPromise(RefusalLock.parse(undefined))).toEqual(EMPTY_LOCK);
    expect((await Effect.runPromise(Effect.flip(RefusalLock.parse("{}")))).message).toMatch(/lockVersion/);
    expect((await Effect.runPromise(Effect.flip(RefusalLock.parse("not json")))).message).toMatch(/JSON/);
  });

  it("holds the chain's four runtime refusals only with a chain store", () => {
    expect(RefusalLock.runtime(false).map((w) => w.code)).toEqual(["AR-001", "AR-002"]);
    expect(RefusalLock.runtime(true).map((w) => w.code)).toEqual(["AR-001", "AR-002", "AR-003", "AR-004", "AR-005", "AR-006"]);
  });

  it("a changed prefix keeps the code that shipped, and a new refusal takes the new prefix", () => {
    const first = RefusalLock.evolve(EMPTY_LOCK, [declared("TicketBusy")]);
    const moved = (name: string): Wanted => ({ ...declared(name), prefix: "TT" });
    const after = RefusalLock.evolve(first, [moved("TicketBusy"), moved("Fresh")]);
    expect(codes(after)).toEqual({ TicketBusy: "TK-001", Fresh: "TT-001" });
    expect(after.retired).toEqual({});
    const left = RefusalLock.evolve(first, []);
    const back = RefusalLock.evolve(left, [moved("TicketBusy")]);
    expect(codes(back)).toEqual({ TicketBusy: "TK-001" });
    expect(back.retired).toEqual({});
    expect(RefusalLock.assign(first, [moved("TicketBusy"), moved("TicketBusy")]).codes).toEqual(["TK-001", "TT-001"]);
  });
});
