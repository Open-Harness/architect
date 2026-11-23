import { Effect, Queue, Scope } from "effect";
import { Timers } from "@orthograph/language-effect";
import { Commands } from "../commands/service.ts";
import { Fence } from "../fence/service.ts";
import { DaemonFailed, type RelayApi, type RelaySpec } from "./types.ts";
import { spawnDaemon, stopDaemon } from "./internal/daemon.ts";
import { ERROR, EVENT, PING, REQUEST, RESULT, frameOf, idOf, jsonOf, payloadOf, typeOf } from "./internal/frames.ts";
import { mapPaths, pathsOf, wordsOf } from "./internal/paths.ts";
import { listen, unlisten } from "./internal/server.ts";

const PING_EVERY = "5 seconds";
const HELLO_WITHIN = "10 seconds";

/** What the relay does with one request: send it on (its paths rewritten to what the fence checked), or answer it itself. */
const judge = (spec: RelaySpec, json: Record<string, unknown>) =>
  Effect.gen(function* () {
    const checked = new Map<string, string>();
    for (const path of pathsOf(json)) {
      const result = yield* Effect.result(spec.fence.check(path));
      if (result._tag === "Failure") return { _tag: "Outside" as const, path, detail: Fence.refusalText(result.failure) };
      checked.set(path, result.success);
    }
    const words = wordsOf(json);
    const blocked = words === undefined ? undefined : Commands.firstBlocked(words, spec.blocked);
    return blocked === undefined ? { _tag: "Allowed" as const, checked, words } : { _tag: "Blocked" as const, blocked, words: words ?? [] };
  });

export const Relay: RelayApi = {
  start: (spec) =>
    Effect.gen(function* () {
      const timers = yield* Timers;
      const scope = yield* Scope.Scope;
      const daemon = yield* Effect.acquireRelease(spawnDaemon(spec), stopDaemon);
      const fromDaemon = yield* Queue.unbounded<ReadonlyArray<Buffer>>();
      const fromClient = yield* Queue.unbounded<Buffer>();
      daemon.onFrames((frames) => void Queue.offerUnsafe(fromDaemon, frames));

      // Ready once the daemon has printed its sync line; a daemon that never does is a failure, not a hang.
      const silent = Effect.suspend(() => Effect.fail(new DaemonFailed({ reason: `the pi-env daemon did not answer in ${HELLO_WITHIN}: ${daemon.stderr().trim()}` })));
      yield* Effect.raceFirst(daemon.synced, timers.sleep("sandbox.daemon.hello", HELLO_WITHIN).pipe(Effect.andThen(silent)));

      const listening = yield* Effect.acquireRelease(
        listen(spec.token, {
          attached: (socket) => void socket.write(`PI-ENV ${spec.token}\n`),
          frames: (frames) => { for (const frame of frames) Queue.offerUnsafe(fromClient, frame); },
        }),
        unlisten,
      );
      const reply = (bytes: Buffer) => Effect.sync(() => void listening.client()?.write(bytes));
      const running = new Map<number, number>();

      // What the client asked, in order: a path outside the root, or a blocked first word, is answered here and goes no further.
      const fromTheClient = (frame: Buffer): Effect.Effect<void> =>
        Effect.gen(function* () {
          const id = idOf(frame);
          const json = typeOf(frame) === REQUEST ? yield* jsonOf(frame) : undefined;
          if (json === undefined) return yield* Effect.sync(() => void daemon.child.stdin?.write(frame));
          const verdict = yield* judge(spec, json);
          if (verdict._tag === "Outside") {
            yield* spec.observe.refused({ name: "OutsideSandbox", detail: verdict.detail });
            return yield* reply(frameOf(ERROR, id, { code: "OutsideSandbox", message: verdict.detail, path: verdict.path }));
          }
          if (verdict._tag === "Blocked") {
            const text = Commands.refusalText(verdict.blocked);
            const handle = yield* spec.observe.started(verdict.words);
            yield* spec.observe.refused({ name: "BlockedCommand", detail: text });
            yield* spec.observe.exited(handle, 126);
            yield* reply(frameOf(EVENT, id, { kind: "output", stream: "stderr" }, Buffer.from(`${text}\n`)));
            return yield* reply(frameOf(RESULT, id, { exitCode: 126 }));
          }
          if (verdict.words !== undefined) running.set(id, yield* spec.observe.started(verdict.words));
          // What the fence checked is what is sent: the same request, each path as the fence resolved it, so a `..` the kernel would
          // follow through a symbolic link is already gone, and the daemon is never shown a spelling the fence did not judge.
          const sent = frameOf(REQUEST, id, mapPaths(json, (p) => verdict.checked.get(p) ?? p), payloadOf(frame));
          yield* Effect.sync(() => void daemon.child.stdin?.write(sent));
        });

      // What the daemon sent: an exec's result says how it ended, and every frame goes on to the client, if one is attached.
      const fromTheDaemon = (frames: ReadonlyArray<Buffer>): Effect.Effect<void> =>
        Effect.gen(function* () {
          for (const frame of frames) {
            const handle = running.get(idOf(frame));
            if (handle !== undefined && (typeOf(frame) === RESULT || typeOf(frame) === ERROR)) {
              running.delete(idOf(frame));
              const json = yield* jsonOf(frame);
              yield* spec.observe.exited(handle, typeOf(frame) === RESULT && typeof json?.["exitCode"] === "number" ? json["exitCode"] : null);
            }
            if (typeOf(frame) !== PING) yield* reply(frame);
          }
        });

      yield* Queue.take(fromClient).pipe(Effect.flatMap(fromTheClient), Effect.forever, Effect.forkIn(scope));
      yield* Queue.take(fromDaemon).pipe(Effect.flatMap(fromTheDaemon), Effect.forever, Effect.forkIn(scope));
      // A daemon with no client is not dead: it hears from the relay, and exits only after 30 s of silence.
      const ping = Effect.sync(() => void daemon.child.stdin?.write(frameOf(PING, 0, {})));
      yield* timers.sleep("sandbox.daemon.ping", PING_EVERY).pipe(Effect.andThen(ping), Effect.forever, Effect.forkIn(scope));

      return { pid: daemon.child.pid!, address: `tcp://127.0.0.1:${listening.port}#${spec.token}`, alive: () => !daemon.exited() };
    }),
};
