import { Effect, Layer, Option, Schema } from "effect";
import { Auth, AuthRefused, Principals, type PrincipalDoor } from "@orthograph/language-effect";
import type { Principal } from "orthograph";
import type { AuthD1Api, AuthInstance, CastMember } from "./types.ts";
import { held, instance, statusOf, type BetterAuth } from "./internal/instance.ts";
import { ACTS_FOR_AN_AGENT, KEY_PREFIX } from "./internal/options.ts";
import * as worldToken from "./internal/world-token.ts";
import * as oauth from "./internal/oauth.ts";

const ANONYMOUS: Principal = { kind: "anonymous" };

/** Run a Better Auth call once its tables exist. A failure Better Auth didn't give a status is a defect. */
const call = <A>(a: AuthInstance, f: (auth: BetterAuth) => Promise<A>) =>
  Effect.tryPromise({ try: () => held(a).auth().then(f), catch: (e) => e });

/** What a key row says of whose hands it is: marked for an agent, plain, or a row that cannot be read (which is no one's). */
type Mark = "agent" | "plain" | "unreadable";

const Acts = Schema.Struct({ acts: Schema.optionalKey(Schema.Unknown) });
const parseMark = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.NullOr(Acts)));

/**
 * The mark of the key Better Auth just resolved: read from that key's own row (`session.id` is the key's id), once, with no second
 * `verifyApiKey` to charge the key's rate limit again. Fails closed: a row that is missing, or whose metadata cannot be read, is
 * `unreadable`, and an unreadable key is no one (review of #297, round 2).
 */
const markOf = (a: AuthInstance, keyId: string): Effect.Effect<Mark> =>
  Effect.tryPromise(() => held(a).db.prepare(`SELECT "metadata" FROM "auth_apikey" WHERE "id" = ?`).bind(keyId).first<{ metadata: string | null }>()).pipe(
    Effect.map((row): Mark => {
      if (row === null) return "unreadable";
      if (row.metadata === null || row.metadata === "") return "plain";
      const parsed = parseMark(row.metadata);
      return Option.isNone(parsed) ? "unreadable" : parsed.value?.acts === ACTS_FOR_AN_AGENT ? "agent" : "plain";
    }),
    Effect.orElseSucceed((): Mark => "unreadable"),
  );

/**
 * The one place a resolved person becomes a principal, for every door (M2-auth, fork 2): a session is a person by session; a key is a person
 * by key, or an agent when its row says so; a key whose row cannot be read is no one; at the MCP door every credential is an agent.
 */
const principalFor = (who: { readonly person: string; readonly email: string }, way: "session" | "key", mark: Mark, door: PrincipalDoor): Principal =>
  mark === "unreadable" ? ANONYMOUS
  : door === "mcp" || mark === "agent" ? { kind: "agent", ...who, via: "agent" }
  : { kind: "person", ...who, via: way };

/**
 * Who a credential is. A session token is a person by session; an `ak_` key is a person by key, or an agent when it was made for one; a
 * world's token is the system or a service, where worlds are hosted. Nothing, or a credential that is not good or cannot be read, is
 * anonymous, never an error and never a person.
 */
const principalOf = (a: AuthInstance, authorization: string | undefined, door: PrincipalDoor = "api"): Effect.Effect<Principal> => {
  const credential = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!credential) return Effect.succeed(ANONYMOUS);
  if (credential.startsWith(worldToken.WORLD_PREFIX)) return held(a).worlds ? worldToken.principalOf(held(a).secret, credential) : Effect.succeed(ANONYMOUS);
  const isKey = credential.startsWith(KEY_PREFIX);
  const headers = new Headers(isKey ? { "x-api-key": credential } : { authorization: `Bearer ${credential}` });
  return call(a, (auth) => auth.api.getSession({ headers })).pipe(
    Effect.flatMap((s): Effect.Effect<Principal> => {
      if (!s) return Effect.succeed(ANONYMOUS);
      const who = { person: s.user.id, email: s.user.email };
      return (isKey ? markOf(a, s.session.id) : Effect.succeed<Mark>("plain")).pipe(Effect.map((mark) => principalFor(who, isKey ? "key" : "session", mark, door)));
    }),
    Effect.orElseSucceed(() => ANONYMOUS),
  );
};

const refused = (reason: "credentials" | "taken", status: number) => (e: unknown) =>
  statusOf(e) === status ? Effect.fail(new AuthRefused({ reason })) : Effect.die(e);

const layer: AuthD1Api["layer"] = (a) =>
  Layer.mergeAll(
    Layer.succeed(Principals, { of: (authorization, door) => principalOf(a, authorization, door) }),
    Layer.succeed(Auth, {
      signUp: (body) => call(a, (auth) => auth.api.signUpEmail({ body })).pipe(
        Effect.map((r) => ({ person: r.user.id })),
        Effect.catch(refused("taken", 422)),
      ),
      signIn: (body) => call(a, (auth) => auth.api.signInEmail({ body })).pipe(
        Effect.catch(refused("credentials", 401)),
        Effect.flatMap((r) => call(a, (auth) => auth.api.getSession({ headers: new Headers({ authorization: `Bearer ${r.token}` }) })).pipe(
          Effect.orDie,
          Effect.flatMap((s) => (s ? Effect.succeed({ session: s.session.id, token: r.token }) : Effect.die(new Error("a new session didn't resolve")))),
        )),
      ),
      // With no request headers: the server's own call, on the person's behalf.
      createApiKey: ({ person, name }) => call(a, (auth) => auth.api.createApiKey({ body: { userId: person, name } })).pipe(
        Effect.map((r) => ({ apiKey: r.id, key: r.key })),
        Effect.orDie,
      ),
    }),
  );

/**
 * A key is a credential for the API and the MCP door, never for Better Auth's own routes (M2-auth, fork 2; snag 446). With
 * `enableSessionForAPIKeys` a key stands for its person's session at every route Better Auth serves, so an agent's key could mint a key
 * with no agent mark, or upgrade one. The one door to `/api/auth/*` refuses any request that carries a key, whatever the route: a person
 * signs in to make a key, and the server reads keys itself, through `Principals`, never through this door.
 */
export const carriesAKey = (request: Request) =>
  request.headers.has("x-api-key") || /^Bearer\s+ak_/i.test(request.headers.get("authorization") ?? "");

// A registration is capped before Better Auth sees it (D3 #123); everything else is Better Auth's.
const handle: AuthD1Api["handle"] = (a, request) =>
  Effect.gen(function* () {
    if (carriesAKey(request)) return Response.json({ error: "a key is not a credential for the sign-in routes: sign in to use them" }, { status: 401 });
    // Better Auth's own tables must exist before the guard counts one.
    const refused = oauth.isRegistration(request) ? yield* Effect.tryPromise(() => held(a).auth()).pipe(Effect.andThen(oauth.registrationGuard(a))) : undefined;
    return refused ?? (yield* Effect.tryPromise(() => held(a).auth(originOf(request)).then((auth) => auth.handler(request))));
  }).pipe(Effect.orDie);

// OAuth's issuer and the MCP resource are the address a request was reached on: each is answered by the instance for its origin.
const originOf = (request: Request) => new URL(request.url).origin;
const oauthApi: AuthD1Api["oauth"] = {
  discovery: (a, request) => Effect.tryPromise(() => held(a).auth(originOf(request))).pipe(Effect.flatMap((auth) => oauth.discovery(auth, request)), Effect.orDie),
  bearer: (a, request) => Effect.tryPromise(() => held(a).auth(originOf(request))).pipe(Effect.flatMap((auth) => oauth.bearer(a, auth, request)), Effect.orDie),
  challenge: (request, error) => oauth.challenge(request, error),
};

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const random = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => ALPHABET[b % 36]).join("");

const castMember: AuthD1Api["castMember"] = (a, name, anonymous, stored) =>
  Effect.gen(function* () {
    const member = stored ?? { email: `${name}.${random(8)}@world.test`, password: random(24) };
    if (anonymous) return { email: member.email, password: member.password };
    const person = member.person ?? (yield* call(a, (auth) => auth.api.signUpEmail({ body: { email: member.email, password: member.password, name } })).pipe(Effect.orDie)).user.id;
    const { token } = yield* call(a, (auth) => auth.api.signInEmail({ body: { email: member.email, password: member.password } })).pipe(Effect.orDie);
    return { person, token, email: member.email, password: member.password } satisfies CastMember;
  });

const credential: AuthD1Api["credential"] = (a, spec) =>
  spec.kind === "system" || spec.kind === "service"
    ? worldToken.mint(held(a).secret, spec.kind === "system" ? { kind: "system" } : { kind: "service", mount: spec.mount }).pipe(Effect.map((token) => ({ token })))
    : call(a, (auth) => auth.api.createApiKey({
        body: { userId: spec.person, name: `world ${spec.kind}`, ...(spec.kind === "agent" ? { metadata: { acts: ACTS_FOR_AN_AGENT } } : {}) },
      })).pipe(Effect.map((r) => ({ token: r.key })), Effect.orDie);

export const AuthD1: AuthD1Api = { make: instance, layer, handle, oauth: oauthApi, castMember, credential };
