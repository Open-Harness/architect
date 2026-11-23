// The count reads who forked whom from what the runtime announces (M8.07): if a new version of `effect` changes what is announced, or when,
// this fails before the count goes wrong.
import { Context, Deferred, Effect, Fiber, Metric } from "effect";
import { describe, expect, it } from "vitest";
import { runningId } from "./internal/fibers.ts";

describe("the runtime's announcement of fibers", () => {
  it("has the forking fiber running at a start (daemon or not), and the ending fiber's own context at an end", () =>
    Effect.runPromise(Effect.gen(function* () {
      const starts: Array<{ readonly parent: number | undefined; readonly context: Context.Context<never> }> = [];
      const ends: Array<Context.Context<never>> = [];
      const metrics: Metric.FiberRuntimeMetricsService = {
        recordFiberStart: (context) => void starts.push({ parent: runningId(), context }),
        recordFiberEnd: (context) => void ends.push(context),
      };
      const gate = yield* Deferred.make<void>();
      const parent = runningId();
      const [child, detached] = yield* Effect.provideService(Effect.gen(function* () {
        const a = yield* Effect.forkChild(Deferred.await(gate));
        const b = yield* Effect.forkDetach(Deferred.await(gate));
        yield* Effect.all([Effect.void, Effect.void], { concurrency: "unbounded" });
        return [a, b] as const;
      }), Metric.FiberRuntimeMetrics, metrics);
      yield* Deferred.succeed(gate, undefined);
      yield* Fiber.join(child);
      yield* Fiber.join(detached);
      // Each fork started a fiber, by the fiber that was running; each came to an end under the context it started with.
      expect(starts.length).toBeGreaterThanOrEqual(2);
      expect(starts.every((s) => s.parent === parent)).toBe(true);
      expect(ends).toHaveLength(starts.length);
      expect(ends.every((c) => starts.some((s) => s.context === c))).toBe(true);
    })));
});
