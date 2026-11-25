// How a call step runs. Promise mode: the callable is called lazily inside `Effect.tryPromise`, so a synchronous throw
// and a rejection both enter the failure channel as `unknown`; only that raw wait is uninterruptible, so an interruption
// waits for the Promise to settle and the work stays counted (a client going away never drops it). Effect mode: the
// callable's typed failure and its services are kept, with the adapter's own layer. In both, only the typed failure is
// mapped, and the mapping stays outside the protected wait, so a mapper that throws is a defect.
import { Effect, Layer } from "effect";
import { BlankReached } from "#modules/handler/types.js";
import type { CallsApi, CallWiring } from "../types.ts";

const waited = (wiring: CallWiring, args: ReadonlyArray<unknown>) =>
  Effect.uninterruptible(Effect.tryPromise({ try: () => Promise.resolve(wiring.run(...args)), catch: (failure) => failure }));

const effected = (wiring: CallWiring, args: ReadonlyArray<unknown>) => {
  const work = Effect.suspend(() => wiring.run(...args) as Effect.Effect<unknown, unknown, never>);
  return wiring.layer ? Effect.provide(work, Layer.orDie(wiring.layer)) : work;
};

/** A refusal must be one the call declares: what the mapping returned is never trusted to be one. */
const declared = (errors: ReadonlyArray<new (...args: never) => unknown>, label: string) => (mapped: unknown) =>
  mapped instanceof BlankReached ? Effect.die(mapped)
  // The decision is logged here, inside the operation's span, naming the refusal and never the foreign failure.
  : errors.some((E) => mapped instanceof E) ? Effect.andThen(Effect.logInfo(`${label} failed, and was refused as ${(mapped as { readonly _tag?: string })._tag ?? "a declared error"}`), Effect.fail(mapped))
  : Effect.die(new Error(`${label}: its failure was mapped to something the call does not declare, so it is a defect, not a refusal`));

export const runner: CallsApi["runner"] = ({ label, step, wiring }) => (args, failure) => {
  const { call } = step;
  if (!wiring) return Effect.die(new Error(`${label}: nothing is wired to this call: the server serves it without the adapter's callable`)) as never;
  // A generated adapter's mount with no address is a defect, before anything is sent: never a refusal, never a default URL.
  const missing = wiring.unset?.();
  if (missing !== undefined) return Effect.die(new Error(`${label}: ${missing} is not set, so the call has nowhere to go`)) as never;
  const raw = call.mode === "effect" ? effected(wiring, args) : waited(wiring, args);
  return raw.pipe(
    Effect.mapError(failure as (failure: unknown) => never),
    Effect.catch(declared(call.errors as never, label)),
  ) as never;
};
