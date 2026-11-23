import { Names } from "orthograph/server";
import { Effect, Redacted, Schema } from "effect";
import { VerdictsFailed, type TokenSource, type VerdictsApi } from "./types.ts";

const AUDIENCE = "ortho-logbook";

const failed = (message: string) => new VerdictsFailed({ message });

/** The JSON body of a response, whatever shape the other side gave it. */
const jsonOf = (response: Response) => Effect.tryPromise({ try: () => response.json() as Promise<Record<string, unknown>>, catch: () => failed(`answered ${response.status} with no JSON`) });

const request = (what: string, url: string, init: RequestInit) =>
  Effect.tryPromise({ try: () => fetch(url, init), catch: () => failed(`${what}: couldn't reach ${new URL(url).origin}`) });

const fromIssuer = (issuer: string, client: string) =>
  Effect.gen(function* () {
    const response = yield* request("the issuer", `${issuer}/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: client, client_secret: "unused" }),
    });
    if (!response.ok) return yield* failed(`the issuer refused a token for client ${client} (${response.status})`);
    const body = yield* jsonOf(response);
    return typeof body["access_token"] === "string" ? body["access_token"] : yield* failed("the issuer's answer has no access_token");
  });

const fromGithub = (requestUrl: string, requestToken: Redacted.Redacted<string>) =>
  Effect.gen(function* () {
    const url = new URL(requestUrl);
    url.searchParams.set("audience", AUDIENCE);
    const response = yield* request("GitHub's token endpoint", url.toString(), { headers: { authorization: `Bearer ${Redacted.value(requestToken)}` } });
    if (!response.ok) return yield* failed(`GitHub refused a token (${response.status}); does the job have id-token: write?`);
    const body = yield* jsonOf(response);
    return typeof body["value"] === "string" ? body["value"] : yield* failed("GitHub's answer has no value");
  });

const Journeys = Schema.Array(Schema.Struct({
  journey: Schema.String, modelHash: Schema.String, handlerHash: Schema.NullOr(Schema.String), verdict: Schema.Literals(["pass", "fail"]),
}));

const verdictFields = {
  revision: Schema.String, environment: Schema.String, operation: Schema.String, verdict: Schema.String,
  sha256: Schema.optionalKey(Schema.NullOr(Schema.String)),
  journeys: Schema.optionalKey(Schema.NullOr(Journeys)),
};
export const VerdictRows = Schema.Array(Schema.Struct(verdictFields));
const HeldRows = Schema.Array(Schema.Struct({ ...verdictFields, ref: Schema.String }));

const minted = (source: TokenSource) =>
  source.kind === "given" ? Effect.succeed(Redacted.value(source.token))
  : source.kind === "issuer" ? fromIssuer(source.issuer, source.client)
  : fromGithub(source.requestUrl, source.requestToken);

export const Verdicts: VerdictsApi = {
  sourceOf: (env) => {
    const [given, issuer, requestUrl, requestToken] = [env[Names.variable("LOGBOOK_TOKEN")], env[Names.variable("OIDC_ISSUER")], env["ACTIONS_ID_TOKEN_REQUEST_URL"], env["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]];
    if (given) return Effect.succeed({ kind: "given", token: Redacted.make(given) });
    if (issuer) return Effect.succeed({ kind: "issuer", issuer, client: env[Names.variable("OIDC_CLIENT")] || "ci-main" });
    if (requestUrl && requestToken) return Effect.succeed({ kind: "github", requestUrl, requestToken: Redacted.make(requestToken) });
    return Effect.fail(failed("no way to sign a write to the logbook: set ORTHO_OIDC_ISSUER (and ORTHO_OIDC_CLIENT), or ORTHO_LOGBOOK_TOKEN, or run in a GitHub Actions job with id-token: write"));
  },
  mint: (source: TokenSource) => minted(source).pipe(Effect.map(Redacted.make)),
  latest: ({ logbook, revision, environment, ref }) =>
    Effect.gen(function* () {
      const query = new URLSearchParams({ revision, environment, ref });
      const response = yield* request("the logbook", `${logbook}/verdicts/latest?${query}`, {});
      if (!response.ok) return yield* failed(`the logbook would not give ${environment}'s verdicts for ${revision} (${response.status})`);
      const body = yield* Effect.tryPromise({ try: () => response.json() as Promise<unknown>, catch: () => failed("the logbook's verdicts were not JSON") });
      return yield* Schema.decodeUnknownEffect(HeldRows)(body).pipe(Effect.mapError((e) => failed(`the logbook's verdicts were not as expected: ${e.message}`)));
    }),
  post: ({ logbook, token, revision, environment, sha256, results }) =>
    Effect.forEach(results, (r) =>
      Effect.gen(function* () {
        const response = yield* request("the logbook", `${logbook}/verdicts`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${Redacted.value(token)}` },
          body: JSON.stringify({ revision, environment, ...r, ...(sha256 === undefined ? {} : { sha256 }) }),
        });
        if (!response.ok) return yield* failed(`the logbook refused ${r.operation} (${response.status})`);
      }), { discard: true }),
};
