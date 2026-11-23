import { Effect, Schema } from "effect";
import { BadRequest } from "../types.ts";

/** A revision names a model object in R2, so it is a plain token: no slash, no dots-only name. */
const Revision = Schema.String.check(Schema.isPattern(/^[0-9A-Za-z][0-9A-Za-z._-]{0,99}$/));
const Name = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(200));

const Hash = Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/));
const Verdict = Schema.Literals(["pass", "fail"]);
const JourneyVerdict = Schema.Struct({
  journey: Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(512)),
  modelHash: Hash,
  handlerHash: Schema.NullOr(Hash),
  verdict: Verdict,
});

export const VerdictBody = Schema.Struct({
  revision: Revision,
  environment: Name,
  operation: Name,
  verdict: Verdict,
  sha256: Schema.optionalKey(Hash),
  journeys: Schema.optionalKey(Schema.Array(JourneyVerdict)),
});

export const ReleaseBody = Schema.Struct({
  version: Schema.String.check(Schema.isPattern(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/)),
  revision: Revision,
});

export const isRevision = Schema.is(Revision);

export const jsonBody = (request: Request): Effect.Effect<unknown, BadRequest> =>
  Effect.tryPromise({ try: () => request.json(), catch: () => new BadRequest({ reason: "the body is not JSON" }) });

/** The request's JSON body, checked against `schema`; a body that doesn't fit is a 400 saying which field. */
export const decoded = <S extends Schema.Decoder<unknown>>(request: Request, schema: S): Effect.Effect<S["Type"], BadRequest> =>
  jsonBody(request).pipe(
    Effect.flatMap((body) => Schema.decodeUnknownEffect(schema)(body as never)),
    Effect.mapError((e) => (e instanceof BadRequest ? e : new BadRequest({ reason: `the body is not what ${request.method} ${new URL(request.url).pathname} takes` }))),
  ) as Effect.Effect<S["Type"], BadRequest>;
