import { Busy, BusyLive, Timers, TimersMemory } from "@orthograph/language-effect";
import { Deferred, Effect, Fiber, Layer } from "effect";
import { expect, test } from "vitest";
import { withinRpcDeadline } from "../tx/internal/rpc.ts";
import { buildWindow } from "./internal/cursor.ts";

const parentHash = "0x0000000000000000000000000000000000000000000000000000000000000001";
const hash = "0x0000000000000000000000000000000000000000000000000000000000000002";
const address = "0x0000000000000000000000000000000000000001";

test("the follower builds its hash window under one counted work token", () =>
  Effect.runPromise(Effect.gen(function* () {
    const busy = yield* Busy;
    const timers = yield* Timers;
    const proceed = yield* Deferred.make<void>();
    const headers = (number: bigint) => withinRpcDeadline(timers, 1_000, "header", Deferred.await(proceed).pipe(
      Effect.as({ number, hash: number === 0n ? parentHash : hash, parentHash } as const),
    ));
    const worker = yield* Effect.forkChild(busy.counted(buildWindow([], { number: 1n, hash }, headers, address)), {
      startImmediately: true,
    });
    yield* busy.quiet;
    expect(yield* timers.pending).toHaveLength(1);
    yield* Deferred.succeed(proceed, undefined);
    expect(yield* Fiber.join(worker)).toEqual([{ number: 0n, hash: parentHash }, { number: 1n, hash }]);
    expect(yield* busy.count).toBe(0);
    expect(yield* timers.pending).toHaveLength(0);
  }).pipe(Effect.provide(TimersMemory.pipe(Layer.provideMerge(BusyLive))))));
