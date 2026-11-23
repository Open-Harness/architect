import { DurableObject } from "cloudflare:workers";
import { Cause, Clock, Effect } from "effect";
import { failed, sameSource } from "./internal/health.ts";
import { step, FollowerFault, type Stored } from "./internal/poll.ts";
import type { CheckpointView, FollowerApi, FollowerConfig, FollowerEnv, FollowerHealth } from "./types.ts";

const CONFIG = "config";
const CHECKPOINT = "checkpoint";
const HEALTH = "health";

const view = ({ number, hash }: { readonly number: bigint; readonly hash: string }) => ({ number: number.toString(), hash });

/**
 * One follower per program, named `eip155:<chainId>:<address, lower case>`. It reads one contract's events through chain-evm's
 * reliable stream and hands each `Confirmed` change, and each `Corrected` one that had been confirmed, to `env.FOLLOWER_SINK`
 * (`Inbox.accept`'s shape). Its checkpoint lives in the Durable Object's storage and moves in one write, only after the sink
 * has taken every change of the step; a replay after a failure or a restart is `seen` at the sink (M6-chain item 12).
 * Export it from the Worker's entry and bind it as `FOLLOWER`. `configure`, `poll` and the alarm run one at a time.
 */
export class Follower extends DurableObject implements FollowerApi {
  private turn: Promise<unknown> = Promise.resolve();

  /**
   * The same source again keeps the checkpoint; a different one (chain, contract, event or start block) starts a new stream and clears it.
   * With a `pollIntervalMs` there is an alarm at that interval (reset when the interval changes); with none there is not, so a check
   * that calls `poll` by hand is never raced.
   */
  configure(config: FollowerConfig): Promise<void> {
    const { ctx } = this;
    return this.serially(() => Effect.runPromise(Effect.gen(function* () {
      const before = yield* Effect.promise(() => ctx.storage.get<FollowerConfig>(CONFIG));
      if (before !== undefined && !sameSource(before, config)) yield* Effect.promise(() => ctx.storage.delete([CHECKPOINT, HEALTH]));
      yield* Effect.promise(() => ctx.storage.put(CONFIG, config));
      const period = config.pollIntervalMs;
      if (period === undefined) return yield* Effect.promise(() => ctx.storage.deleteAlarm());
      const set = yield* Effect.promise(() => ctx.storage.getAlarm());
      if (set === null || before?.pollIntervalMs !== period) {
        const now = yield* Clock.currentTimeMillis;
        yield* Effect.promise(() => ctx.storage.setAlarm(now + period));
      }
    })));
  }

  poll(): Promise<{ readonly caughtUp: boolean }> {
    return this.serially(this.job(false));
  }

  /**
   * The alarm does what `poll` does. An error leaves the checkpoint where it was, is recorded (see `health`), and the next alarm is set
   * all the same, so it tries again.
   */
  override alarm(): Promise<void> {
    const { ctx } = this;
    const rearm = () => Effect.runPromise(Effect.gen(function* () {
      const period = (yield* Effect.promise(() => ctx.storage.get<FollowerConfig>(CONFIG)))?.pollIntervalMs;
      if (period === undefined || (yield* Effect.promise(() => ctx.storage.getAlarm())) !== null) return;
      const now = yield* Clock.currentTimeMillis;
      yield* Effect.promise(() => ctx.storage.setAlarm(now + period));
    }));
    const run = this.job(true);
    return this.serially(() => run().then(() => undefined, () => undefined).then(rearm));
  }

  private serially<A>(run: () => Promise<A>): Promise<A> {
    const done = this.turn.then(run, run);
    this.turn = done.catch(() => undefined);
    return done;
  }

  /** One step. A step that succeeds clears the health record; one the alarm makes that fails writes it. */
  private job(record: boolean): () => Promise<{ readonly caughtUp: boolean }> {
    const { ctx, env } = this;
    return () => Effect.runPromise(Effect.gen(function* () {
      const config = yield* Effect.promise(() => ctx.storage.get<FollowerConfig>(CONFIG));
      if (config === undefined) return yield* new FollowerFault({ kind: "unconfigured", message: "this follower has not been configured" });
      const old = yield* Effect.promise(() => ctx.storage.get<Stored>(CHECKPOINT));
      const sink = () => (env as unknown as FollowerEnv).FOLLOWER_SINK.getByName(ctx.id.name ?? `eip155:${config.chainId}:${config.address}`);
      const next = yield* step(config, old, sink);
      yield* Effect.promise(() => ctx.storage.put(CHECKPOINT, next.checkpoint));
      yield* Effect.promise(() => ctx.storage.delete(HEALTH));
      return { caughtUp: next.caughtUp };
    }).pipe(Effect.tapCause((cause) => !record ? Effect.void : Effect.gen(function* () {
      const at = yield* Clock.currentTimeMillis;
      const before = yield* Effect.promise(() => ctx.storage.get<FollowerHealth>(HEALTH));
      yield* Effect.promise(() => ctx.storage.put(HEALTH, failed(before, Cause.squash(cause), at)));
    }))));
  }

  checkpoint(): Promise<CheckpointView> {
    return this.ctx.storage.get<Stored>(CHECKPOINT).then((stored) =>
      stored === undefined ? { window: [] } : { ...(stored.through === undefined ? {} : { through: view(stored.through) }), window: stored.window.map(view) });
  }

  health(): Promise<FollowerHealth | null> {
    return this.ctx.storage.get<FollowerHealth>(HEALTH).then((h) => h ?? null);
  }
}
