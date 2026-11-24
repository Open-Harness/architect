import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Sources } from "./service.ts";

describe("sources", () => {
  it("a timer is a source with no adapter, and calling it makes a connection that names it", () => {
    expect(Sources.timer.adapter).toBeNull();
    const connection = Sources.timer({ every: "1 week", says: "sweep" });
    expect(connection).toMatchObject({ kind: "connection", config: { every: "1 week", says: "sweep" } });
    expect(connection.source).toBe(Sources.timer);
  });

  it("a mapping keeps its adapter and its spec", () => {
    const adapter = { kind: "adapter", calls: {}, events: {}, choices: {} } as never;
    const spec = { config: Schema.Struct({ me: Schema.Struct({ id: Schema.String, login: Schema.String }) }), scope: () => ({ listened: true, observed: true, row: "r" }), on: {}, policyPart: { schema: Schema.Struct({}), rows: () => [] }, environment: { variables: {}, of: () => ({}) } } as never;
    const kind = Sources.from(adapter, spec);
    expect(kind.adapter).toBe(adapter);
    expect(kind.spec).toBe(spec);
  });
});
