// Tokens have identity, and a reset fences by generation (M8.07): nothing from before a reset can release, fire or settle anything after it.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { makeCount } from "./internal/count.ts";

describe("a token's id", () => {
  it("releases only that token: a stale generation, or a second release, is a no-op for the new one", () => {
    const count = makeCount();
    const before = count.enter("probe.spin");
    count.reset();
    const after = count.enter("probe.spin");
    count.leave(before);
    expect(count.held()).toEqual(["probe.spin"]);
    count.leave(after);
    count.leave(after);
    expect(count.held()).toEqual([]);
    // Two requests of one owner in the new generation are two tokens: one release leaves the other.
    const a = count.enter("probe.spin");
    count.enter("probe.spin");
    count.leave(a);
    count.leave(a);
    expect(count.held()).toEqual(["probe.spin"]);
  });

  it("a reset releases whoever was waiting for quiet, and the old generation's leave cannot make the new one look quiet", async () => {
    const count = makeCount();
    const old = count.enter("probe.spin");
    const waiting = Effect.runPromise(Effect.result(count.quiet(2_000)));
    count.reset();
    expect((await waiting)._tag).toBe("Success");
    const fresh = count.enter("probe.spin");
    count.leave(old);
    expect(count.held()).toEqual(["probe.spin"]);
    count.leave(fresh);
  });
});
