// A test process entry: the planted runner against the real Busy and a real held request.
import { Effect, Fiber } from "effect";
import { Busy, BusyLive } from "@orthograph/language-effect";
import { missingMask } from "./missing-mask.ts";

const origin = process.argv[2]!;
const program = Effect.gen(function* () {
  const busy = yield* Busy;
  const work = yield* Effect.forkChild(missingMask(() => fetch(`${origin}/hold`).then((r) => r.json())));
  yield* Effect.promise(() => fetch(`${origin}/wait-held`, { headers: { connection: "close" } }).then((r) => r.text()));
  yield* Fiber.interrupt(work);
  yield* busy.quiet;
  const state = yield* Effect.promise(() => fetch(`${origin}/state`, { headers: { connection: "close" } }).then((r) => r.json()) as Promise<{ held: number }>);
  // The wrong runner let go while the request was still held: the observation Codex's check made, kept as it was.
  const rejected = (yield* busy.count) === 0 && state.held === 1;
  yield* Effect.promise(() => fetch(`${origin}/release`, { headers: { connection: "close" } }).then((r) => r.text()));
  return { missingMaskRejected: rejected };
}).pipe(Effect.provide(BusyLive));
console.log("ADAPTER_RESULT " + JSON.stringify(await Effect.runPromise(program)));
