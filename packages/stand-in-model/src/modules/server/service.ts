import { Effect, Ref } from "effect";
import { Script } from "../script/service.ts";
import type { Incoming, Json, ModelTurn } from "../script/types.ts";
import type { CommandAnswer, ModelStand, Request, ServerApi, Sink } from "./types.ts";
import { asMatch, fresh, heldBy, hold, release, useFirst, type FailRule, type Inside } from "./internal/holds.ts";
import { incomingOf } from "./internal/incoming.ts";

const CHAT = "/v1/chat/completions";
const json = { "content-type": "application/json" } as const;
const field = (args: Json, name: string): unknown => (typeof args === "object" && args !== null ? (args as Record<string, unknown>)[name] : undefined);
const refuse = (sink: Sink, status: number, body: object) => { sink.head(status, json); sink.end(JSON.stringify(body)); };

/** The reply, with a hold where the turn says: before anything is written, or after its first chunk. */
const reply = (state: Ref.Ref<Inside>, sink: Sink, turn: ModelTurn, incoming: Incoming, n: number) =>
  Effect.gen(function* () {
    if (turn.hold === "before-reply") yield* hold(state, n, incoming);
    if (turn.fail === "reset") return sink.destroy();
    if (turn.fail !== undefined) return refuse(sink, turn.fail.status, { error: { message: "failed by the script", type: "scripted" } });
    const chunks = Script.chunks(turn, incoming, `${n}`);
    sink.head(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
    sink.write(chunks.first);
    if (turn.hold === "after-first-chunk") yield* hold(state, n, incoming);
    sink.end(chunks.rest);
  });

const chat = (state: Ref.Ref<Inside>) => (request: Request, sink: Sink): Effect.Effect<void> =>
  Effect.gen(function* () {
    if (request.method !== "POST" || request.path !== CHAT) return refuse(sink, 404, { error: `${request.method} ${request.path}: this model answers POST ${CHAT} only` });
    const incoming = incomingOf(request);
    // A failure the stand-in was told to make, then a hold it was told to take, come before the script: the request is counted, no turn is used.
    const rule = yield* Ref.modify(state, (s): readonly [FailRule | undefined, Inside] => {
      const [failing, fails] = useFirst(s.fails, s.script.seen.length + 1, request.path);
      return [failing, { ...s, fails }];
    });
    if (rule !== undefined) {
      yield* Ref.update(state, (s) => ({ ...s, script: Script.record(s.script, incoming, "failed")[0] }));
      return rule.with === "reset" ? sink.destroy() : refuse(sink, rule.with.status, { error: { message: "failed on command", type: "stand-in" } });
    }
    const taken = yield* Ref.modify(state, (s) => {
      const [script, took] = Script.take(s.script, incoming);
      const [holding, holds] = useFirst(s.holds, took.n, request.path);
      return [{ took, holding: holding !== undefined }, { ...s, script, holds }] as const;
    });
    if (taken.took.kind === "no-script") return refuse(sink, 501, { error: { message: "NoScript: no script answers this request", type: "NoScript" }, request: incoming });
    if (taken.took.kind === "tool-not-offered") return refuse(sink, 500, { error: { message: `ToolNotOffered: ${taken.took.tool}`, type: "ToolNotOffered" } });
    if (taken.holding) yield* hold(state, taken.took.n, incoming);
    return yield* reply(state, sink, taken.took.turn, incoming, taken.took.n);
  });

const command = (state: Ref.Ref<Inside>) => (name: string, args: Json): Effect.Effect<CommandAnswer> =>
  Effect.gen(function* () {
    const ok = (body: Json): CommandAnswer => ({ status: 200, body });
    switch (name) {
      case "script": {
        const spec = { for: (field(args, "for") ?? {}) as never, turns: (field(args, "turns") ?? []) as never };
        return ok({ script: yield* Ref.modify(state, (s): readonly [string, Inside] => { const [script, id] = Script.add(s.script, spec); return [id, { ...s, script }]; }) });
      }
      case "done": {
        const left = Script.unused((yield* Ref.get(state)).script);
        return left.length === 0 ? ok({ unused: 0 }) : { status: 409, body: { unused: left.length, turns: left } };
      }
      case "seen": {
        const s = (yield* Ref.get(state)).script;
        const requests = Script.asked(s, { ...(typeof field(args, "containing") === "string" ? { containing: String(field(args, "containing")) } : {}), ...(typeof field(args, "since") === "number" ? { since: Number(field(args, "since")) } : {}), ...(asMatch(field(args, "match") as Json).nth === undefined ? {} : { nth: asMatch(field(args, "match") as Json).nth! }) });
        return ok({ requests, next: s.seen.length });
      }
      case "hold": {
        const times = typeof field(args, "times") === "number" ? Number(field(args, "times")) : 1;
        yield* Ref.update(state, (s) => ({ ...s, holds: [...s.holds, { match: asMatch(field(args, "match") as Json), left: times }] }));
        return ok({ hold: "next" });
      }
      case "held": {
        const count = typeof field(args, "count") === "number" ? Number(field(args, "count")) : 1;
        const waitMs = Math.min(typeof field(args, "waitMs") === "number" ? Number(field(args, "waitMs")) : 10_000, 10_000);
        const found = yield* heldBy(state, count, asMatch(field(args, "match") as Json).nth, waitMs);
        const held = found.map(({ open: _open, ...h }) => h);
        return found.length >= count ? ok({ held }) : { status: 408, body: { error: "NotHeld", wanted: count, held, asked: (yield* Ref.get(state)).script.seen.length } };
      }
      case "release": return ok({ released: yield* release(state, typeof field(args, "hold") === "string" ? String(field(args, "hold")) : "all") });
      case "fail": {
        const how = field(args, "with") as FailRule["with"];
        yield* Ref.update(state, (s) => ({ ...s, fails: [...s.fails, { match: asMatch(field(args, "match") as Json), with: how, left: typeof field(args, "times") === "number" ? Number(field(args, "times")) : 1 }] }));
        return ok({});
      }
      case "reset": {
        yield* release(state, "all");
        yield* Ref.set(state, fresh);
        return ok({});
      }
      default: return { status: 404, body: { error: `no command ${name}` } };
    }
  });

export const Server: ServerApi = {
  make: Effect.map(Ref.make(fresh), (state): ModelStand => ({ chat: chat(state), command: command(state) })),
};
