// A Cloudflare account over its REST API, the calls the spike proved (`spikes/staging-pass`: the listings, `delete --force`, the subdomain). The only file here that reaches the network.
// Nothing it says holds the token or the account id: an error names what was asked and what Cloudflare answered.
import { Effect } from "effect";
import { StagingFailed, type Account, type Credentials } from "../types.ts";

const API = "https://api.cloudflare.com/client/v4";
const PER_PAGE = 100;
const PAGES = 200;

interface Body {
  readonly success?: boolean;
  readonly errors?: ReadonlyArray<{ readonly code?: number; readonly message?: string }>;
  readonly result?: unknown;
  readonly result_info?: { readonly cursor?: string };
}

/** What Cloudflare says is cut short and never holds the token or the account id. */
const clip = (text: string, c: Credentials) => text.split(c.token).join("[token]").split(c.account).join("[account]").slice(0, 300);

const call = (credentials: Credentials, what: string, method: string, path: string, body?: unknown): Effect.Effect<Body, StagingFailed> =>
  Effect.tryPromise({
    try: (signal) =>
      fetch(`${API}/accounts/${credentials.account}${path}`, {
        method,
        signal,
        headers: { authorization: `Bearer ${credentials.token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }).then((res) => res.json().catch(() => ({})).then((parsed) => ({ res, body: parsed as Body }))),
    catch: () => new StagingFailed({ message: `could not reach Cloudflare to ${what}` }),
  }).pipe(
    Effect.flatMap(({ res, body: answered }) =>
      res.ok && answered.success !== false
        ? Effect.succeed(answered)
        : Effect.fail(new StagingFailed({ message: `Cloudflare refused to ${what}: HTTP ${res.status} ${clip(JSON.stringify((answered.errors ?? []).map((e) => ({ code: e.code, message: e.message }))), credentials)}` })),
    ),
  );

/** Every row of a numbered listing: a page shorter than a full one ends it, and so does a page that adds nothing, so an endpoint that ignores `page` cannot loop. */
const rows = <A>(credentials: Credentials, what: string, path: string, pick: (row: Record<string, unknown>) => A | undefined): Effect.Effect<ReadonlyArray<A>, StagingFailed> =>
  Effect.gen(function* () {
    const seen = new Map<string, A>();
    for (let page = 1; page <= PAGES; page++) {
      const answered = yield* call(credentials, what, "GET", `${path}${path.includes("?") ? "&" : "?"}page=${page}&per_page=${PER_PAGE}`);
      const found = Array.isArray(answered.result) ? (answered.result as ReadonlyArray<Record<string, unknown>>) : [];
      const before = seen.size;
      for (const row of found) {
        const one = pick(row);
        if (one !== undefined) seen.set(JSON.stringify(one), one);
      }
      if (found.length < PER_PAGE || seen.size === before) break;
    }
    return [...seen.values()];
  });

export const account = (credentials: Credentials): Account => ({
  workers: rows(credentials, "list the Workers", "/workers/scripts", (r) => (typeof r["id"] === "string" ? r["id"] : undefined)),
  databases: rows(credentials, "list the D1 databases", "/d1/database", (r) => (typeof r["uuid"] === "string" && typeof r["name"] === "string" ? { id: r["uuid"], name: r["name"] } : undefined)),
  deleteWorker: (name) => call(credentials, `delete the Worker ${name}`, "DELETE", `/workers/scripts/${encodeURIComponent(name)}?force=true`).pipe(Effect.asVoid),
  deleteDatabase: (id) => call(credentials, "delete a database", "DELETE", `/d1/database/${encodeURIComponent(id)}`).pipe(Effect.asVoid),
  subdomain: call(credentials, "read the workers.dev subdomain", "GET", "/workers/subdomain").pipe(
    Effect.flatMap((answered) => {
      const name = (answered.result as { readonly subdomain?: unknown } | undefined)?.subdomain;
      return typeof name === "string" && name !== "" ? Effect.succeed(name) : Effect.fail(new StagingFailed({ message: "the account has no workers.dev subdomain: register one in the dashboard first" }));
    }),
  ),
});
