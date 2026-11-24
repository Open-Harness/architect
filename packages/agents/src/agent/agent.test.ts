// What an agent's own commit decides (GOAL17-executor-slots, section 5): an opening tell sets its Assignment, a steer must be for it, a closed Assignment is never woken
// and a second delivery of one request id changes nothing. Run on the real operations and an in-memory actor store.
import { Cause, Effect, Exit, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { BusyLive, Handlers, storeMemory } from "@orthograph/language-effect";
import tellOperation from "../../blueprint/things/agent/verbs/tell.ts";
import closeOperation from "../../blueprint/things/agent/verbs/close.ts";
import { Agent } from "../../blueprint/things/agent/thing.ts";
import { StaleAssignment } from "../../blueprint/things/agent/errors.ts";
import tell from "./tell.ts";
import close from "./close.ts";

const system = { kind: "system" } as const;
const agent = "agt_0123456789abcdef";
const A1 = "asg_0000000000000001";
const A2 = "asg_0000000000000002";
const stock = (state = "idle", more: Record<string, unknown> = {}) => storeMemory([[Agent, { id: agent, kind: "executor", about: "ticket/tkt_1", state, ...more }]]);
const callTell = (memory: ReturnType<typeof stock>, payload: Record<string, unknown>) =>
  Effect.runPromiseExit(Handlers.serve({ name: "agent.tell", operation: tellOperation, handler: tell }).run({ agent, opens: false, ...payload } as never, system).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))));
const callClose = (memory: ReturnType<typeof stock>, payload: Record<string, unknown>) =>
  Effect.runPromiseExit(Handlers.serve({ name: "agent.close", operation: closeOperation, handler: close }).run({ agent, ...payload } as never, system).pipe(Effect.provide(Layer.mergeAll(BusyLive, memory.layer))));
const row = (memory: ReturnType<typeof stock>) => memory.rows.find((r) => r.instance["id"] === agent)!.instance;
const said = (exit: Exit.Exit<unknown, unknown>) => (Exit.isFailure(exit) ? (Cause.squash(exit.cause) instanceof StaleAssignment ? "StaleAssignment" : "died") : "ok");

describe("agent.tell", () => {
  it("an opening tell sets the Assignment and records the input as submitted", async () => {
    const memory = stock();
    expect(said(await callTell(memory, { requestId: "evt_1", input: "fix it", assignment: A1, opens: true }))).toBe("ok");
    expect(row(memory)["current"]).toBe(A1);
    expect(row(memory)["state"]).toBe("working");
    expect(row(memory)["told"]).toEqual([{ requestId: "evt_1", text: "fix it", assignment: A1, how: "submitted" }]);
  });

  it("a steer for the current Assignment is recorded as steered; one for another is refused and tells nothing", async () => {
    const memory = stock("working", { current: A1, told: [] });
    expect(said(await callTell(memory, { requestId: "evt_2", input: "also the edge", assignment: A1 }))).toBe("ok");
    expect((row(memory)["told"] as Array<{ how: string }>).map((t) => t.how)).toEqual(["steered"]);
    expect(said(await callTell(memory, { requestId: "evt_3", input: "wrong one", assignment: A2 }))).toContain("StaleAssignment");
    expect((row(memory)["told"] as unknown[]).length).toBe(1);
  });

  it("an opening tell for a closed Assignment is refused, and nothing is told", async () => {
    const memory = stock("idle", { closed: [A1] });
    expect(said(await callTell(memory, { requestId: "evt_4", input: "late", assignment: A1, opens: true }))).toContain("StaleAssignment");
    expect(row(memory)["told"]).toBeUndefined();
    expect(row(memory)["state"]).toBe("idle");
  });

  it("a second delivery of one request id changes nothing and emits nothing", async () => {
    const memory = stock();
    await callTell(memory, { requestId: "evt_5", input: "once", assignment: A1, opens: true });
    const before = memory.entries.length;
    expect(said(await callTell(memory, { requestId: "evt_5", input: "once", assignment: A1, opens: true }))).toBe("ok");
    expect((row(memory)["told"] as unknown[]).length).toBe(1);
    expect(memory.entries.length).toBe(before);
  });
});

describe("agent.close", () => {
  it("acknowledges a close of an agent working for it: the id is kept closed, current is cleared, and it is idle", async () => {
    const memory = stock("working", { current: A1 });
    expect(said(await callClose(memory, { assignment: A1 }))).toBe("ok");
    expect(row(memory)["closed"]).toEqual([A1]);
    expect(row(memory)["current"]).toBeNull();
    expect(row(memory)["state"]).toBe("idle");
    expect(memory.entries.map((e) => [e.move, e.fields["assignment"]])).toEqual([["close", A1]]);
  });

  it("acknowledges a close of an agent that was never told, and fences the opening tell that comes after it", async () => {
    const memory = stock();
    expect(said(await callClose(memory, { assignment: A1 }))).toBe("ok");
    expect(said(await callTell(memory, { requestId: "evt_6", input: "late", assignment: A1, opens: true }))).toContain("StaleAssignment");
    expect(said(await callTell(memory, { requestId: "evt_7", input: "next", assignment: A2, opens: true }))).toBe("ok");
    expect(row(memory)["current"]).toBe(A2);
  });
});
