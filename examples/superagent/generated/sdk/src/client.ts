// Generated from the blueprint. Do not edit.
import { Context, Data, Effect, Layer, Schedule, Schema } from "effect";
import { SecureRandom } from "effect/crypto";
import { FetchHttpClient, HttpClient, HttpClientError, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { Api } from "../../api/src/index.ts";

export class SuperagentClient extends Context.Service<SuperagentClient, HttpApiClient.ForApi<typeof Api>>()("superagent/Client") {}

/** Who a client's calls are made as. It is set once, on the client's layer, and never on a call. */
export type Credential = { readonly kind: "session"; readonly token: string };
export const Credential = {
  /** A signed-in session: the token a sign-in gave, sent as a bearer token. */
  session: (token: string): Credential => ({ kind: "session", token }),
};

/** A payload its schema refuses: the message names where and why, never the value. The call never left the client. */
export class InvalidPayload extends Data.TaggedError("InvalidPayload")<{ readonly message: string }> {}

/** What a call may be given: the key that makes its retries one request. Never a credential. */
export interface CallOptions {
  /** The key the server keeps the answer under. Made when the call starts when not given, and kept across its retries. */
  readonly requestKey?: string | undefined;
}

const RequestKey = Context.Reference<string | undefined>("superagent/RequestKey", { defaultValue: () => undefined });

/** Where a payload is refused and why, never what it held: a value can be a password, and this message can reach a span. */
const said = (issue: { readonly _tag: string; readonly path?: ReadonlyArray<unknown>; readonly issue?: unknown; readonly issues?: ReadonlyArray<unknown> }, path: ReadonlyArray<unknown> = []): ReadonlyArray<string> => {
  const where = path.length === 0 ? "the payload" : path.map(String).join(".");
  const inner = (next: unknown, more: ReadonlyArray<unknown> = []) => said(next as Parameters<typeof said>[0], [...path, ...more]);
  switch (issue._tag) {
    case "Pointer": return inner(issue.issue, issue.path);
    case "Encoding": return inner(issue.issue);
    case "Composite": case "AnyOf": case "OneOf": return (issue.issues ?? []).flatMap((next) => inner(next));
    case "MissingKey": return [`${where} is missing`];
    case "UnexpectedKey": return [`${where} is not expected`];
    case "InvalidType": return [`${where} is not the right kind of value`];
    case "Filter": return [`${where} does not satisfy its check`];
    default: return [`${where} is refused`];
  }
};

const isTransport = (error: unknown) => HttpClientError.isHttpClientError(error) && error.reason._tag === "TransportError";

/**
 * One call. Its payload is encoded first: one the schema refuses is `InvalidPayload`, and nothing is sent. A request key is made
 * when the call starts (or the caller's is used) and sent as `idempotency-key` on every try. An operation the server keeps an
 * answer for is tried again when the connection was cut before the answer came, with the same key, so it commits once.
 * A response the server could not answer is a defect (a die), never a typed failure.
 * A call wrapped in your own `Effect.retry` makes a new key on each try unless you pass `requestKey`.
 * The retry waits on Effect's own clock: `Timers` is the server runtime's, and this client runs in the caller's process.
 */
export const call = <A, E, R>(
  declaration: { readonly payloadSchema: Schema.Codec<any, any> },
  payload: unknown,
  options: CallOptions | undefined,
  retry: boolean,
  send: Effect.Effect<A, E, R>,
): Effect.Effect<A, E | InvalidPayload, R> =>
  Effect.gen(function* () {
    yield* Schema.encodeUnknownEffect(declaration.payloadSchema)(payload, { errors: "all" }).pipe(Effect.mapError((cause) => new InvalidPayload({ message: said((cause as { readonly issue: Parameters<typeof said>[0] }).issue).join("; ") })));
    const key = options?.requestKey ?? (yield* Effect.flatMap(SecureRandom.SecureRandom, (random) => random.uuidV4()));
    const tries = retry ? Effect.retry(send, { schedule: Schedule.exponential("50 millis"), times: 3, while: isTransport }) : send;
    return yield* tries.pipe(
      Effect.catchIf((error) => HttpClientError.isHttpClientError(error) && !isTransport(error), (error) => Effect.die(error)),
      Effect.provideService(RequestKey, key),
    );
  }).pipe(Effect.provide(SecureRandom.layerWebCrypto));

const connect = (url: string, credential: Credential | undefined) =>
  Layer.effect(SuperagentClient, HttpApiClient.make(Api, {
    transformClient: HttpClient.mapRequestEffect((request) =>
      Effect.map(Effect.service(RequestKey), (key) => {
        const at = HttpClientRequest.prependUrl(request, url);
        const signed = credential === undefined ? at : HttpClientRequest.bearerToken(at, credential.token);
        return key === undefined ? signed : HttpClientRequest.setHeader(signed, "idempotency-key", key);
      })),
  })).pipe(Layer.provide(FetchHttpClient.layer));

/** A client for the server at `url`, as `credential` when there is one. */
export interface Options { readonly url: string; readonly credential?: Credential | undefined }

/** `layer({ url, credential })`, or `layer(url, token)`: the same client, the token being a session's. */
export const layer = (options: string | Options, token?: string) =>
  typeof options === "string" ? connect(options, token === undefined || token === "" ? undefined : Credential.session(token)) : connect(options.url, options.credential);
