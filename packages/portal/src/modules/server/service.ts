import { Effect } from "effect";
import { Monitor } from "#modules/monitor/service.js";
import { Reader } from "#modules/reader/service.js";
import { Snapshot } from "#modules/snapshot/service.js";
import { Telemetry } from "#modules/telemetry/service.js";
import { Wire } from "#modules/wire/service.js";
import type { BlueprintRejected, BlueprintWire } from "#modules/wire/types.js";
import type { PortalContext, PortalEnv, ServerApi } from "./types.ts";
import { client } from "./internal/client.ts";
import { feedLive } from "./internal/feed.ts";
import { ledgerOf } from "./internal/ledger.ts";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });

const owns = (path: string) => path === "/portal" || path.startsWith("/portal/") || path === "/_portal" || path.startsWith("/_portal/");

const data = (context: PortalContext, url: URL, request: Request): Effect.Effect<Response> => {
  const { blueprint } = context;
  if (url.pathname === "/_portal/v1/blueprint") {
    const etag = `"${blueprint.digest}"`;
    return Effect.succeed(request.headers.get("if-none-match") === etag
      ? new Response(null, { status: 304, headers: { etag } })
      : json(blueprint, 200, { etag, "cache-control": "no-cache" }));
  }
  if (url.pathname === "/_portal/v1/snapshot") {
    const asked = url.searchParams.get("digest");
    if (asked === null) return Effect.succeed(json({ _tag: "BadRequest", reason: "a snapshot is for one blueprint: pass its digest" }, 400));
    if (asked !== blueprint.digest) return Effect.succeed(json({ _tag: "BlueprintChanged", digest: blueprint.digest }, 409));
    const { live } = context;
    return Effect.all({
      snapshot: Snapshot.take({ blueprint, reader: context.reader, bundleRevision: context.bundleRevision, ...(context.ref === undefined ? {} : { ref: context.ref }), ...(live === undefined ? {} : { now: live.now }) }),
      telemetry: live === undefined ? Effect.succeed(null) : Telemetry.read(blueprint, live),
    }).pipe(Effect.map(({ snapshot, telemetry }) => json({ ...snapshot, telemetry })));
  }
  if (url.pathname === "/_portal/v1/monitor") {
    const asked = url.searchParams.get("digest");
    if (asked === null) return Effect.succeed(json({ _tag: "BadRequest", reason: "the monitor is for one blueprint: pass its digest" }, 400));
    if (asked !== blueprint.digest) return Effect.succeed(json({ _tag: "BlueprintChanged", digest: blueprint.digest }, 409));
    if (context.live === undefined) return Effect.succeed(json({ _tag: "NotFound", reason: "this portal has no live source" }, 404));
    return Monitor.read(blueprint, context.live, context.ledger).pipe(Effect.map((view) => json(view)));
  }
  const traceId = /^\/_portal\/v1\/traces\/([0-9A-Za-z]{1,64})$/.exec(url.pathname)?.[1];
  if (traceId !== undefined) {
    if (context.live === undefined) return Effect.succeed(json({ _tag: "NotFound", reason: "this portal has no live source" }, 404));
    return Telemetry.trace(context.live, traceId).pipe(Effect.map((found) =>
      found.state === "available" && found.value === undefined ? json({ _tag: "NotFound" }, 404) : json(found)));
  }
  return Effect.succeed(json({ _tag: "NotFound" }, 404));
};

const refused = (isData: boolean) => isData ? json({ _tag: "MethodNotAllowed" }, 405, { allow: "GET, HEAD" }) : new Response("method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });

const handle: ServerApi["handle"] = (context, request) => {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/_portal/")) return Effect.succeed(json({ _tag: "NotFound" }, 404));
  if (request.method !== "GET" && request.method !== "HEAD") return Effect.succeed(refused(true));
  return data(context, url, request);
};

type Accepted = { readonly ok: true; readonly blueprint: BlueprintWire } | { readonly ok: false; readonly error: BlueprintRejected };
const decode = (value: unknown): Accepted => Effect.runSync(Wire.decode(value).pipe(Effect.map((blueprint) => ({ ok: true as const, blueprint })), Effect.catch((error) => Effect.succeed({ ok: false as const, error }))));

/** The decoded blueprint of a generated JSON module, once: the same object is the same blueprint. */
const decoded = new WeakMap<object, Accepted>();
const accept = (value: unknown): Accepted => {
  if (typeof value !== "object" || value === null) return decode(value);
  const held = decoded.get(value);
  if (held) return held;
  const made = decode(value);
  decoded.set(value, made);
  return made;
};

const serve: ServerApi["serve"] = (blueprint, request, env: PortalEnv) => {
  const url = new URL(request.url);
  const isData = url.pathname.startsWith("/_portal/");
  const accepted = accept(blueprint);
  if (!accepted.ok) {
    const reason = accepted.error.reason;
    return Effect.succeed(isData ? json({ _tag: "BlueprintRejected", reason }, 500) : new Response(`This portal's blueprint was rejected: ${reason}`, { status: 500, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } }));
  }
  if (request.method !== "GET" && request.method !== "HEAD") return Effect.succeed(refused(isData));
  if (!isData) return client(env.PORTAL_ASSETS, request);
  const logbook = env.ORTHO_LOGBOOK_URL;
  const context = { blueprint: accepted.blueprint, reader: logbook ? Reader.http(logbook) : null, bundleRevision: env.ORTHO_REVISION ?? null, ledger: ledgerOf(env.PORTAL_LEDGER) };
  // A world whose starter feeds it its telemetry: read once for the calls that use it (the snapshot and a trace), at the feed's own `now`.
  const feed = env.ORTHO_PORTAL_FEED;
  if (feed === undefined || !(url.pathname.startsWith("/_portal/v1/snapshot") || url.pathname.startsWith("/_portal/v1/monitor") || url.pathname.startsWith("/_portal/v1/traces/"))) return handle(context, request);
  return feedLive(feed, env.ORTHO_ENVIRONMENT ?? "local").pipe(Effect.flatMap((live) => handle({ ...context, live }, request)));
};

export const PortalServer: ServerApi = { owns, handle, serve };
