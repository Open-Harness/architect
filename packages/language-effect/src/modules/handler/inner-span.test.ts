// #1079: an inner operation's spans are steps of the outer's one call. The portal counts a span as a call when it is named for its `operation`
// attribute (portal `telemetry/internal/spans.ts`), so the inner operation's spans carry `inner.operation` instead, and only the outer's attempt is
// named for its `operation`. The scratch ledger is ./testing.ts.
import { describe, expect, it } from "vitest";
import { INNER } from "./internal/inner.ts";
import { bob, call, hooks, serve, world, type World } from "./testing.ts";

const calls = (w: World) => w.spans.filter((s) => s.name === s.attributes.get("operation")).map((s) => s.name);
const named = (w: World, name: string) => w.spans.filter((s) => s.name === name);

describe("#1079: an outer call that runs inner operations is one call", () => {
  it("an answered run.pay is one span named for its operation; entry.draft and entry.submit name themselves with inner.operation", async () => {
    const w = world();
    await call(w, serve(hooks()).pay, { run: "run_1" });
    expect(calls(w)).toEqual(["run.pay"]);
    for (const inner of ["entry.draft", "entry.submit"]) {
      const [span] = named(w, inner);
      expect(span?.attributes.get(INNER), inner).toBe(inner);
      expect(span?.attributes.has("operation"), inner).toBe(false);
    }
  });

  it("a call the inner operation's access rule refuses is one call, and the inner's refused span carries no operation", async () => {
    const w = world();
    await call(w, serve(hooks()).pay, { run: "run_1" }, bob);
    expect(calls(w)).toEqual(["run.pay"]);
    const [refused] = named(w, "entry.draft.refused");
    expect(refused?.attributes.get(INNER)).toBe("entry.draft");
    expect(refused?.attributes.has("operation")).toBe(false);
  });
});
