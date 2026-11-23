// The fairness properties of GOAL17-check-harness, call 1, each a test: no script is a 501, never an invented reply; a call to a tool the request did not
// offer is refused and leaves its turn unused; `done` is the unused turns; replies are the SSE chunks Pi reads.
import { describe, expect, it } from "vitest";
import { Script } from "./service.ts";
import type { Incoming } from "./types.ts";

const ask = (over: Partial<Incoming> = {}): Incoming => ({ model: "executor", tools: ["bash", "ticket_ack"], text: "hello", ...over });

describe("a script", () => {
  it("answers a request with no script as no script, and counts it", () => {
    const [state, taken] = Script.take(Script.empty, ask());
    expect(taken).toEqual({ kind: "no-script", n: 1 });
    expect(state.seen.map((s) => [s.n, s.answered])).toEqual([[1, "no-script"]]);
  });

  it("gives one turn per matching request, in order, then none", () => {
    const [one] = Script.add(Script.empty, { for: { kind: "executor" }, turns: [{ say: "a" }, { say: "b" }] });
    const [two, first] = Script.take(one, ask());
    const [three, second] = Script.take(two, ask());
    const [, third] = Script.take(three, ask());
    expect([first, second, third].map((t) => (t.kind === "turn" ? t.turn.say : t.kind))).toEqual(["a", "b", "no-script"]);
  });

  it("matches by kind, by about and by agent, and only those", () => {
    const [state] = Script.add(Script.empty, { for: { kind: "main", about: "superagent/sag_1" }, turns: [{ say: "x" }] });
    expect(Script.take(state, ask({ model: "executor" }))[1].kind).toBe("no-script");
    expect(Script.take(state, ask({ model: "main", about: "ticket/t" }))[1].kind).toBe("no-script");
    expect(Script.take(state, ask({ model: "main", about: "superagent/sag_1" }))[1].kind).toBe("turn");
  });

  it("refuses a call to a tool the request did not offer, and leaves the turn unused", () => {
    const [state] = Script.add(Script.empty, { for: {}, turns: [{ call: [{ tool: "rm_everything", args: {} }] }] });
    const [after, taken] = Script.take(state, ask());
    expect(taken).toEqual({ kind: "tool-not-offered", n: 1, tool: "rm_everything" });
    expect(Script.unused(after)).toHaveLength(1);
  });

  it("calls a dotted tool by the name the request offered it under", () => {
    const [state] = Script.add(Script.empty, { for: {}, turns: [{ call: [{ tool: "ticket.ack", args: { text: "ok" } }] }] });
    const [, taken] = Script.take(state, ask());
    expect(taken.kind).toBe("turn");
    if (taken.kind !== "turn") return;
    const chunks = Script.chunks(taken.turn, ask(), "x");
    expect(chunks.first).toContain('"name":"ticket_ack"');
  });

  it("fills $eval from the request and $ticket from its agent's about", () => {
    const turn = { call: [{ tool: "bash", args: { eval: "$eval", ticket: "$ticket", nested: ["$ticket"] } }] };
    const { first } = Script.chunks(turn, ask({ text: "see evl_abc123 and evl_def456", about: "ticket/tkt_9" }), "x");
    const args = JSON.parse(JSON.parse(first.slice("data: ".length)).choices[0].delta.tool_calls[0].function.arguments);
    expect(args).toEqual({ eval: "evl_def456", ticket: "tkt_9", nested: ["tkt_9"] });
  });

  it("speaks real chunks: a role chunk with its text, a finish reason, then [DONE]", () => {
    const { first, rest } = Script.chunks({ say: "Added both." }, ask(), "x");
    const delta = JSON.parse(first.slice("data: ".length)).choices[0];
    expect(delta).toMatchObject({ delta: { role: "assistant", content: "Added both." }, finish_reason: null });
    expect(JSON.parse(rest.split("\n\n")[0]!.slice("data: ".length)).choices[0].finish_reason).toBe("stop");
    expect(rest.endsWith("data: [DONE]\n\n")).toBe(true);
    expect(JSON.parse(Script.chunks({ call: [{ tool: "bash", args: {} }] }, ask(), "x").rest.split("\n\n")[0]!.slice("data: ".length)).choices[0].finish_reason).toBe("tool_calls");
  });

  it("reads what it was asked: by substring, by number, and from a point", () => {
    let state = Script.empty;
    for (const text of ["one", "two OKAPI", "three"]) state = Script.take(state, ask({ text }))[0];
    expect(Script.asked(state, { containing: "OKAPI" }).map((r) => r.n)).toEqual([2]);
    expect(Script.asked(state, { since: 1 }).map((r) => r.n)).toEqual([2, 3]);
    expect(Script.asked(state, { nth: 3 }).map((r) => r.text)).toEqual(["three"]);
  });
});
