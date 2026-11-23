import { DurableObject } from "cloudflare:workers";
import { Clock, Effect } from "effect";
import { step, FollowerFault, type Stored } from "./internal/poll.ts";
import type { CheckpointView, FollowerApi, FollowerConfig, FollowerEnv } from "./types.ts";

const CONFIG = "config";
const CHECKPOINT = "checkpoint";

const view = ({ number, hash }: { readonly number: bigint; readonly hash: string }) => ({ number: number.toString(), hash });

/**
 * One follower per program, named `eip155:<chainId>:<address, lower case>`. It reads one contract's events through chain-evm's
 * reliable stream and hands each `Confirmed` change, and each `Corrected` one that had been confirmed, to `env.FOLLOWER_SINK`
 * (`Inbox.accept`'s shape). Its checkpoint lives in the Durable Object's storage and moves in one write, only after the sink
 * has taken every change of the step; a replay after a failure or a restart is `seen` at the sink (M6-chain item 12).
 * Export it from the Worker's entry and bind it as `FOLLOWER`. Polls run one at a time.
 */
export class Follower extends DurableObject implements FollowerApi {
  private turn: Promise<unknown> = Promise.resolve();

  /** The same arguments again change nothing; the checkpoint is never touched. */
  configure(config: FollowerConfig): Promise<void> {
    return this.ctx.storage.put(CONFIG, config).then(() => this.arm());
  }

  /** With a `pollIntervalMs` there is an alarm, one at a time; with none there is not, so a check that calls `poll` by hand is never raced. */
  private arm(): Promise<void> {
    const { ctx } = this;
    return Effect.runPromise(Effect.gen(function* () {
      const period = (yield* Effect.promise(() => ctx.storage.get<FollowerConfig>(CONFIG)))?.pollIntervalMs;
      if (period === undefined || (yield* Effect.promise(() => ctx.storage.getAlarm())) !== null) return;
      const now = yield* Clock.currentTimeMillis;
      yield* Effect.promise(() => ctx.storage.setAlarm(now + period));
    }));
  }

  poll(): Promise<{ readonly caughtUp: boolean }> {
    return this.serially(this.job());
  }

  /** The alarm does what `poll` does, serialised with it. A sink error leaves the checkpoint where it was, and the next alarm is set all the same, so it tries again. */
  override alarm(): Promise<void> {
    return this.serially(this.job()).then(() => undefined, () => undefined).then(() => this.arm());
  }

  private serially<A>(run: () => Promise<A>): Promise<A> {
    const done = this.turn.then(run, run);
    this.turn = done.catch(() => undefined);
    return done;
  }

  private job(): () => Promise<{ readonly caughtUp: boolean }> {
    const { ctx, env } = this;
    const run = () => Effect.runPromise(Effect.gen(function* () {
      const config = yield* Effect.promise(() => ctx.storage.get<FollowerConfig>(CONFIG));
      if (config === undefined) return yield* new FollowerFault({ message: "this follower has not been configured" });
      const old = yield* Effect.promise(() => ctx.storage.get<Stored>(CHECKPOINT));
      const sink = (env as unknown as FollowerEnv).FOLLOWER_SINK.getByName(ctx.id.name ?? `eip155:${config.chainId}:${config.address}`);
      const next = yield* step(config, old, sink);
      yield* Effect.promise(() => ctx.storage.put(CHECKPOINT, next.checkpoint));
      return { caughtUp: next.caughtUp };
    }));
    return run;
  }

  checkpoint(): Promise<CheckpointView> {
    return this.ctx.storage.get<Stored>(CHECKPOINT).then((stored) =>
      stored === undefined ? { window: [] } : { ...(stored.through === undefined ? {} : { through: view(stored.through) }), window: stored.window.map(view) });
  }
}
