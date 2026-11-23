import { Effect, Option, Schema } from "effect";
import type { AdapterEvent } from "orthograph";
import { accept } from "./internal/accept.ts";
import { challengeOf, eventNameOf, jsonOf } from "./internal/read.ts";
import { verified } from "./internal/verify.ts";
import type { Door, InboundApi, InboundOptions } from "./types.ts";

const PREFIX = "/_in/";
const TRACEPARENT = /^00-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/;

const json = (body: unknown, status = 200, headers?: Record<string, string>) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

/** The delivery's trace: the caller's, which the Worker's telemetry has already put on the request. */
const traceOf = (request: Request): string => request.headers.get("traceparent")?.match(TRACEPARENT)?.[1] ?? crypto.randomUUID().replaceAll("-", "");

/** A span named for the outcome, so a journey reads `in.<mount>.accepted`, `.seen`, `.refused` or `.ignored` (M5-checks call 4). */
const outcome = (mount: string, name: "accepted" | "seen" | "refused" | "ignored") => Effect.void.pipe(Effect.withSpan(`in.${mount}.${name}`));

/**
 * The door runs before any connection's configuration is known, so a mapping sees a context that notes every read of its configuration or `me`
 * (and answers it with nothing a real account has). A mapping that decides by the event alone is believed; an `undefined` from one that read the
 * context is not, and the delivery is taken, so a context the door made up never drops a real event. The hop to `trigger.receive` maps it again
 * with the connection's own.
 */
const doorContext = () => {
  const seen = { read: false };
  const part = (): object => new Proxy({}, { get: () => { seen.read = true; return undefined; } });
  return { seen, ctx: { config: part(), me: part() } };
};

/** Whether any active source of the mount takes this delivery: a mapping that makes a trigger, or one that closes a thread. A mapping that fails takes it, so a defect never loses an event. */
const taken = (door: Door, name: string, payload: unknown): Effect.Effect<boolean> =>
  door.sources.length === 0
    ? Effect.succeed(true)
    : Effect.forEach(door.sources, (kind) => {
        const spec = kind.spec as { readonly on?: Readonly<Record<string, ((e: unknown, c: unknown) => unknown) | undefined>>; readonly closed?: Readonly<Record<string, ((e: unknown) => unknown) | undefined>> } | undefined;
        const { seen, ctx } = doorContext();
        return Effect.try({
          try: () => spec?.on?.[name]?.(payload, ctx) !== undefined || seen.read || spec?.closed?.[name]?.(payload) !== undefined,
          catch: () => true,
        }).pipe(Effect.catch(() => Effect.succeed(true)));
      }).pipe(Effect.map((each) => each.some(Boolean)));

/** The body as the event's schema judges it: without the parts that only say who delivered it. */
const judged = (body: unknown, envelope: ReadonlyArray<string> | undefined): unknown =>
  envelope === undefined || typeof body !== "object" || body === null ? body : Object.fromEntries(Object.entries(body).filter(([k]) => !envelope.includes(k)));

const deliver = (door: Door, options: InboundOptions, request: Request): Effect.Effect<Response> =>
  Effect.gen(function* () {
    const rule = door.adapter.door;
    if (rule === undefined) return json({ error: "not found" }, 404);
    const raw = new Uint8Array(yield* Effect.promise(() => request.arrayBuffer()));
    const secret = options.secrets[door.secret];
    if (!(yield* verified(rule.verify, typeof secret === "string" ? secret : undefined, request.headers, raw))) {
      yield* outcome(door.mount, "refused");
      return json({ _tag: "BadSignature" }, 401);
    }
    const body = jsonOf(new TextDecoder().decode(raw));
    const parsed = Option.getOrUndefined(body);
    const handshake = challengeOf(rule.challenge, parsed);
    if (handshake !== undefined) return json({ challenge: handshake });
    const name = eventNameOf(rule.event, request.headers, parsed);
    const event = name === undefined || !door.events.includes(name) ? undefined : (door.adapter.events as Readonly<Record<string, AdapterEvent<unknown>>>)[name];
    const decoded = event === undefined || name === undefined ? Option.none() : Schema.decodeUnknownOption(event.schema as unknown as Schema.Decoder<unknown>)(judged(parsed, rule.envelope));
    // A type the mount leaves out, a type nobody knows, and an included event that does not decode are each acknowledged and written nowhere:
    // a 4xx would have the sender retry for days (M5-reach-out Q2.2).
    if (event === undefined || name === undefined || Option.isNone(decoded) || event.id === undefined) {
      if (event !== undefined && name !== undefined) yield* Effect.logWarning(`in.${door.mount}: ${name} does not decode, or its adapter names no identity for it`);
      yield* outcome(door.mount, "ignored");
      return json({ ignored: true });
    }
    if (!(yield* taken(door, name, decoded.value))) {
      yield* outcome(door.mount, "ignored");
      return json({ ignored: true });
    }
    // A payload the schema allows may still lack what the identity reads: that is a delivery to ignore with a warning, never a 500.
    const named = yield* Effect.try({ try: () => ({ id: `${door.mount}:${event.id!(decoded.value)}`, actor: event.actor?.(decoded.value) }), catch: (e) => e }).pipe(Effect.option);
    if (Option.isNone(named)) {
      yield* Effect.logWarning(`in.${door.mount}: ${name} has no identity to read in this payload`);
      yield* outcome(door.mount, "ignored");
      return json({ ignored: true });
    }
    const settled = yield* accept(options.db, { id: named.value.id, trace: traceOf(request), mount: door.mount, event: name, fields: parsed, actor: named.value.actor });
    yield* outcome(door.mount, settled);
    return json(settled === "accepted" ? { accepted: true } : { seen: true });
  }).pipe(Effect.withSpan(`in.${door.mount}`));

export const Inbound: InboundApi = {
  handle: (options, request, context) => {
    const mount = new URL(request.url).pathname.slice(PREFIX.length).replace(/\/$/, "");
    const door = options.doors.find((d) => d.mount === mount);
    if (door === undefined) return Promise.resolve(json({ error: "not found" }, 404));
    if (request.method !== "POST") return Promise.resolve(json({ error: "method not allowed" }, 405, { allow: "POST" }));
    const run = deliver(door, options, request);
    return Effect.runPromise(context === undefined ? run : Effect.provideContext(run, context));
  },
};
