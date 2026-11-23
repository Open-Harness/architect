import { Cause, Effect } from "effect";
import type { BridgeResponse } from "../types.ts";

const NAMED = /^[A-Z][A-Za-z]+$/;

/** A named refusal as the wire says it: its `_tag` as `name`, and its fields. */
const refusal = (error: { readonly _tag: string }): unknown => {
  const { _tag, ...fields } = error as { readonly _tag: string } & Record<string, unknown>;
  return { name: _tag, ...fields };
};

/** Run a call and say how it went: its answer, the refusal it is declared to make, or 500 for anything unforeseen. */
export const answer = <A, E extends { readonly _tag: string }>(call: Effect.Effect<A, E>): Effect.Effect<BridgeResponse> =>
  call.pipe(
    Effect.map((value): BridgeResponse => ({ status: 200, body: { ok: true, answer: value } })),
    Effect.catchCause((cause) => {
      const failure = cause.reasons.flatMap((reason) => (Cause.isFailReason(reason) ? [reason.error] : []))[0];
      if (failure !== undefined && NAMED.test(failure._tag)) return Effect.succeed<BridgeResponse>({ status: failure._tag === "BadRequest" ? 400 : 200, body: { ok: false, error: refusal(failure) } });
      return Effect.succeed<BridgeResponse>({ status: 500, body: { ok: false, error: { name: "BridgeFailed", what: Cause.pretty(cause).split("\n")[0] ?? "" } } });
    }),
  );
