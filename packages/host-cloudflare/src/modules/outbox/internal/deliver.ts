// One delivery (M5-reach-out Q3, Q4; GOAL17-executor-slots section 5): the event's fields, mapped to the operation's payload by the hop, and the
// operation called as the system under the key `on|<event id>|<operation>`, so a redelivery answers what the first answered and changes nothing.
// A refusal is an answer: the row is `refused`, and not retried. A hop's declared `onRefused` error is a refusal that ends the row `delivered` and
// calls the named operation in its place. Anything else (a defect, a payload outside the declaration, a conflict past the runtime's attempts) is retried.
import { Cause, Clock, Effect, Exit, Schema } from "effect";
import { ErrorNames } from "orthograph/server";
import type { Hop, Served } from "../types.ts";

export type Outcome =
  | { readonly kind: "delivered"; readonly outcome: string | null }
  | { readonly kind: "refused"; readonly outcome: string }
  | { readonly kind: "defect"; readonly outcome: string };

const SYSTEM = { kind: "system" } as const;
const firstLine = (e: unknown) => String(e instanceof Error ? e.message : (e as { _tag?: string } | undefined)?._tag ?? e).split("\n")[0]!.slice(0, 300);
const tagOf = (e: unknown): string => (typeof e === "object" && e !== null && "_tag" in e ? String((e as { _tag: unknown })._tag) : "Refused");

/** The call's end, read as the row's outcome: a typed failure is a refusal, a defect or an unknown cause is a defect (retried); an interrupt is no outcome. */
const read = (exit: Exit.Exit<unknown, unknown>): Outcome | undefined => {
  if (Exit.isSuccess(exit)) return { kind: "delivered", outcome: null };
  const cause = exit.cause;
  if (Cause.hasDies(cause)) return { kind: "defect", outcome: firstLine(Cause.squash(cause)) };
  if (Cause.hasFails(cause)) return { kind: "refused", outcome: tagOf(Cause.squash(cause)) };
  return Cause.hasInterrupts(cause) ? undefined : { kind: "defect", outcome: "the call ended without an answer" };
};

/** The hop's operation, called with what the map made of the event; the event's own fields stand for the call a refusal's `then` makes. */
export const deliver = <R>(hop: Hop, served: Readonly<Record<string, Served<R>>>, eventId: string, fields: unknown): Effect.Effect<Outcome | undefined, never, R> =>
  Effect.gen(function* () {
    const target = served[hop.to];
    if (target === undefined) return { kind: "defect", outcome: `${hop.to} is not served by this Worker` } as const;
    const decoded = yield* Schema.decodeUnknownEffect(hop.event.schema as unknown as Schema.Decoder<unknown>)(fields).pipe(Effect.exit);
    if (Exit.isFailure(decoded)) return { kind: "defect", outcome: `${hop.name} does not decode: ${firstLine(Cause.squash(decoded.cause))}` } as const;
    const at = yield* Clock.currentTimeMillis;
    const payload = yield* Effect.try({ try: () => hop.map(decoded.value as never, { id: eventId, source: "system", at } as never), catch: (e) => e }).pipe(Effect.exit);
    if (Exit.isFailure(payload)) return { kind: "defect", outcome: `the map of ${hop.name} to ${hop.to} failed: ${firstLine(Cause.squash(payload.cause))}` } as const;
    if (typeof payload.value !== "object" || payload.value === null) return { kind: "defect", outcome: `the map of ${hop.name} to ${hop.to} made no payload` } as const;
    const outcome = read(yield* Effect.exit(target.run(payload.value as never, SYSTEM, undefined, eventId)));
    if (outcome?.kind !== "refused" || hop.onRefused === undefined || ErrorNames.nameOf(hop.onRefused.error) !== outcome.outcome) return outcome;
    // The declared refusal: the row is done, no attempt is counted, and the named operation is called with the event's fields in its place.
    const then = served[hop.onRefused.then];
    if (then === undefined) return { kind: "defect", outcome: `${hop.onRefused.then} is not served by this Worker` } as const;
    const replaced = read(yield* Effect.exit(then.run(decoded.value as never, SYSTEM, undefined, `${eventId}|refused`)));
    return replaced?.kind === "delivered" ? ({ kind: "delivered", outcome: outcome.outcome } as const) : replaced;
  });
