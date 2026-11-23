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

/** Whether any active source of the mount takes this delivery: a mapping that makes a trigger, or one that closes a thread. A mapping that fails takes it, so a defect never loses an event. */
const taken = (door: Door, name: string, payload: unknown): Effect.Effect<boolean> =>
  door.sources.length === 0
    ? Effect.succeed(true)
    : Effect.forEach(door.sources, (kind) => {
        const spec = kind.spec;
        const ctx = { config: {}, me: { id: "", login: "" } };
        return Effect.try({
          try: () => spec?.on?.[name]?.(payload as never, ctx as never) !== undefined || spec?.closed?.[name]?.(payload as never) !== undefined,
          catch: () => true,
        }).pipe(Effect.merge);
      }).pipe(Effect.map((each) => each.some(Boolean)));

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
    const decoded = event === undefined || name === undefined ? Option.none() : Schema.decodeUnknownOption(event.schema as unknown as Schema.Decoder<unknown>)(parsed);
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
    const id = `${door.mount}:${event.id(decoded.value)}`;
    const settled = yield* accept(options.db, { id, trace: traceOf(request), mount: door.mount, event: name, fields: decoded.value, actor: event.actor?.(decoded.value) });
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
