// M2-auth, "Smaller calls" 2: a span carries `principal.kind`, and an accepted span of an agent carries `principal.person` too. The kind is read first.
import { describe, expect, it } from "vitest";
import type { WindowSpan } from "../types.ts";
import { callerOf } from "./calls.ts";

const span = (attrs: Record<string, unknown>): WindowSpan => ({ spanId: "s", parentSpanId: "", name: "x", attrs, status: 1, ms: 1, start: 1 });

describe("callerOf", () => {
  it("an agent's accepted span, which names the person it acts for, is an agent's", () => {
    expect(callerOf(span({ "principal.kind": "agent", "principal.via": "agent", "principal.person": "per_ada" }))).toBe("agent");
  });

  it("names each kind of caller by its kind", () => {
    expect(["person", "service", "system", "anonymous"].map((kind) => callerOf(span({ "principal.kind": kind, ...(kind === "person" ? { "principal.person": "per_ada" } : {}) })))).toEqual(["person", "service", "system", "anyone"]);
  });

  it("a span with no kind is a person's when it names one, and unknown otherwise", () => {
    expect(callerOf(span({ "principal.person": "per_ada" }))).toBe("person");
    expect(callerOf(span({}))).toBeUndefined();
  });
});
