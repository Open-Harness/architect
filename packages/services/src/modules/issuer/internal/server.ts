// The issuer's HTTP side: discovery, keys, and a token per scenario, signed RS256 with a key made when it starts.
import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { Clock, Effect } from "effect";
import { SignJWT, calculateJwkThumbprint, exportJWK, generateKeyPair, type JWK } from "jose";
import { IssuerFailed, type IssuerConfig } from "../types.ts";

interface Reply {
  readonly status: number;
  readonly json: unknown;
}

interface Keys {
  readonly jwk: JWK;
  readonly kid: string;
  readonly sign: (claims: Readonly<Record<string, unknown>>, issuer: string, now: number, expiry: number) => Effect.Effect<string, IssuerFailed>;
}

const made = (what: string) => (e: unknown) => new IssuerFailed({ message: `${what}: ${e instanceof Error ? e.message : "failed"}` });

/** One RSA key per process: a token of another issuer, or of a forger, never verifies against it. */
const makeKeys = Effect.gen(function* () {
  const { publicKey, privateKey } = yield* Effect.tryPromise({ try: () => generateKeyPair("RS256", { extractable: true }), catch: made("couldn't make a signing key") });
  const exported = yield* Effect.tryPromise({ try: () => exportJWK(publicKey), catch: made("couldn't export the public key") });
  const kid = yield* Effect.tryPromise({ try: () => calculateJwkThumbprint(exported), catch: made("couldn't name the key") });
  const jwk: JWK = { ...exported, kid, alg: "RS256", use: "sig" };
  const sign: Keys["sign"] = (claims, issuer, now, expiry) =>
    Effect.tryPromise({
      try: () => new SignJWT({ ...claims })
        .setProtectedHeader({ alg: "RS256", kid, typ: "JWT" })
        .setIssuer(issuer).setIssuedAt(now).setNotBefore(now).setExpirationTime(now + expiry).setJti(randomUUID())
        .sign(privateKey),
      catch: made("couldn't sign a token"),
    });
  return { jwk, kid, sign } satisfies Keys;
});

const bodyOf = (request: IncomingMessage) =>
  Effect.callback<string>((resume) => {
    let text = "";
    request.setEncoding("utf8").on("data", (chunk: string) => { if (text.length < 65_536) text += chunk; }).on("end", () => resume(Effect.succeed(text)));
  });

const handle = (config: IssuerConfig, keys: Keys, request: IncomingMessage): Effect.Effect<Reply> =>
  Effect.gen(function* () {
    const url = new URL(request.url ?? "/", "http://placeholder");
    const [, issuerId = "", ...rest] = url.pathname.split("/");
    const route = `/${rest.join("/")}`;
    const origin = `http://${request.headers.host ?? "127.0.0.1"}`;
    const issuer = `${origin}/${issuerId}`;
    if (request.method === "GET" && route === "/.well-known/openid-configuration") {
      return { status: 200, json: {
        issuer, jwks_uri: `${issuer}/jwks`, token_endpoint: `${issuer}/token`, authorization_endpoint: `${issuer}/authorize`,
        response_types_supported: ["code"], subject_types_supported: ["public"], id_token_signing_alg_values_supported: ["RS256"],
        grant_types_supported: ["client_credentials"], token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
      } };
    }
    if (request.method === "GET" && route === "/jwks") return { status: 200, json: { keys: [keys.jwk] } };
    if (request.method === "POST" && route === "/token") {
      const form = new URLSearchParams(yield* bodyOf(request));
      if (form.get("grant_type") !== "client_credentials") return { status: 400, json: { error: "unsupported_grant_type" } };
      const callback = config.tokenCallbacks?.find((c) => c.issuerId === issuerId);
      const mapped = callback?.requestMappings?.find((m) => m.match === "*" || form.get(m.requestParam) === m.match);
      const client = form.get("client_id") ?? "unknown";
      const expiry = callback?.tokenExpiry ?? 3600;
      const now = Math.floor((yield* Clock.currentTimeMillis) / 1000);
      const token = yield* keys.sign(mapped?.claims ?? { sub: client, aud: [client] }, issuer, now, expiry).pipe(Effect.option);
      return token._tag === "None"
        ? { status: 500, json: { error: "server_error" } }
        : { status: 200, json: { access_token: token.value, token_type: "Bearer", expires_in: expiry } };
    }
    return { status: 404, json: { error: "not_found" } };
  });

/** Listen on `port`, answering until the scope closes. */
export const serve = (config: IssuerConfig, port: number) =>
  Effect.gen(function* () {
    const keys = yield* makeKeys;
    const server = yield* Effect.acquireRelease(
      Effect.callback<Server, IssuerFailed>((resume) => {
        const s = createServer((request, response) => {
          void Effect.runPromise(handle(config, keys, request)).then((reply) => {
            response.writeHead(reply.status, { "content-type": "application/json", "cache-control": "no-store", connection: "close" }).end(JSON.stringify(reply.json));
          });
        });
        s.once("error", () => resume(Effect.fail(new IssuerFailed({ message: `couldn't listen on 127.0.0.1:${port}` }))));
        s.listen(port, "127.0.0.1", () => resume(Effect.succeed(s)));
      }),
      (s) => Effect.callback<void>((resume) => { s.close(() => resume(Effect.void)); s.closeAllConnections(); }),
    );
    return server;
  });
