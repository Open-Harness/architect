// What a memory commit leaves behind: it handles a big store, and a commit that throws caches no answer for its request key.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { storeMemory } from "./service.ts";
import { Store } from "./types.ts";

const Box = Blueprint.thing({ description: "A box.", fields: { id: Blueprint.id("box"), items: Blueprint.uint(32) } });
const run = <A,>(memory: ReturnType<typeof storeMemory>, f: (store: Store["Service"]) => Effect.Effect<A>) =>
  Effect.runPromise(Effect.flatMap(Store, f).pipe(Effect.provide(memory.layer)) as Effect.Effect<A>);

describe("a memory commit", () => {
  it("changes one row of a 200000-row store without overflowing the stack", async () => {
    const memory = storeMemory(Array.from({ length: 200_000 }, (_, i) => [Box, { id: `box_${i}`, items: 1n }] as const) as never);
    const outcome = await run(memory, (store) => store.commit({ writes: [{ kind: "update", thing: Box, id: "box_7", version: 0, changes: { items: 2n }, state: undefined }] as never, entries: [] }));
    expect(outcome).toBe("committed");
    expect(memory.rows).toHaveLength(200_000);
    expect(memory.rows[7]!.instance["items"]).toBe(2n);
  });

  it("a commit that throws before it finishes keeps no answer for its request key", async () => {
    const memory = storeMemory([[Box, { id: "box_1", items: 1n }]] as never);
    const broken = { [Symbol.iterator]: () => { throw new Error("journal failed"); } } as never;
    const write = [{ kind: "update", thing: Box, id: "box_1", version: 0, changes: { items: 2n }, state: undefined }] as never;
    const request = { key: "k", answer: "ok" };
    await expect(run(memory, (store) => store.commit({ writes: write, entries: broken, request }))).rejects.toThrow();
    expect(await run(memory, (store) => store.answered("k"))).toBeUndefined();
    expect(memory.rows[0]!.instance["items"]).toBe(1n);
    expect(await run(memory, (store) => store.commit({ writes: write, entries: [], request }))).toBe("committed");
    expect(await run(memory, (store) => store.answered("k"))).toBe("ok");
  });
});
