import { Effect, Queue, Scope } from "effect";
import { Timers } from "@orthograph/language-effect";
import { Fence } from "../fence/service.ts";
import { DaemonFailed, type RelayApi } from "./types.ts";
import { spawnDaemon, stopDaemon } from "./internal/daemon.ts";
import { ERROR, PING, REQUEST, RESULT, frameOf, idOf, jsonOf, split, typeOf } from "./internal/frames.ts";
import { pathsOf, wordsOf } from "./internal/paths.ts";
import { listen, unlisten } from "./internal/server.ts";

const PING_EVERY = "5 seconds";
const HELLO_WITHIN = "10 seconds";

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

      let pending: Buffer<ArrayBufferLike> = Buffer.alloc(0);
      const listening = yield* Effect.acquireRelease(
        listen({
          attached: (socket) => void socket.write(`PI-ENV ${spec.token}\n`),
          data: (chunk) => {
            const { frames, rest } = split(pending, chunk);
            pending = rest;
            for (const frame of frames) Queue.offerUnsafe(fromClient, frame);
          },
        }),
        unlisten,
      );
      const reply = (bytes: Buffer) => Effect.sync(() => void listening.client()?.write(bytes));
      const running = new Map<number, number>();

      // What the client asked, in order: a request naming a path outside the root is answered here and goes no further.
      const fromTheClient = (frame: Buffer): Effect.Effect<void> =>
        Effect.gen(function* () {
          const id = idOf(frame);
          const json = typeOf(frame) === REQUEST ? yield* jsonOf(frame) : undefined;
          if (json !== undefined) {
            for (const path of pathsOf(json)) {
              const checked = yield* Effect.result(spec.fence.check(path));
              if (checked._tag === "Failure") {
                const detail = Fence.refusalText(checked.failure);
                yield* spec.observe.refused({ name: "OutsideSandbox", detail });
                return yield* reply(frameOf(ERROR, id, { code: "OutsideSandbox", message: detail, path }));
              }
            }
            const words = wordsOf(json);
            if (words !== undefined) running.set(id, yield* spec.observe.started(words));
          }
          yield* Effect.sync(() => void daemon.child.stdin?.write(frame));
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
