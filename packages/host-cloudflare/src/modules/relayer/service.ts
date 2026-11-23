import { DurableObject } from "cloudflare:workers";
import { ChainFault, type Hex } from "@orthograph/chain-evm/device";
import { TimersLive } from "@orthograph/language-effect/device";
import { Clock, Effect, Semaphore } from "effect";
import { reconcile, status } from "./internal/check.ts";
import { describe, startLive, type Live, type Parts } from "./internal/live.ts";
import { relay } from "./internal/relay.ts";
import { makeStore } from "./internal/store.ts";
import type { RelayerApi, RelayerConfig, RelayerEnv } from "./types.ts";

const SWAP_PERMITS = 1_000_000;
const invalid = (message: string) => new ChainFault({ kind: "configuration", message });

/**
 * The relayer's Durable Object. Export it from the Worker's entry, bind it as `RELAYER`, bind the key as the secret `RELAYER_KEY`, and name
 * each instance by its chain's CAIP-2 id (`env.RELAYER.getByName("eip155:8453")`): one relayer per key, so one per chain. It keeps its
 * submissions in its own SQLite, and its alarm (every `pollIntervalMs` from `configure`, while any submission may still change) sends a
 * dropped transaction again with a higher fee, the same work `reconcile` does on call.
 */
export class Relayer extends DurableObject<RelayerEnv> implements RelayerApi {
  private readonly store = makeStore(this.ctx.storage.sql);
  private readonly lock = Semaphore.makeUnsafe(1);
  private readonly starting = Semaphore.makeUnsafe(1);
  /** Every `relay` holds one permit while it works; `configure` takes them all, so a Live is only swapped when no call is using it. */
  private readonly swap = Semaphore.makeUnsafe(SWAP_PERMITS);
  private live: Live | undefined;

  constructor(ctx: DurableObjectState, env: RelayerEnv) {
    super(ctx, env);
    // Before any call is served, every open row takes back the reservation of its own nonce. A relayer that is not set up yet (no
    // configuration, no key, a node that does not answer) starts on its first call instead, which waits for the same step; a failure to take
    // a nonce back is a defect and is not caught here, so the Durable Object restarts rather than serve calls that could be handed a nonce
    // a row holds.
    void ctx.blockConcurrencyWhile(() => this.store.config() === undefined || !env.RELAYER_KEY
      ? Promise.resolve()
      : Effect.runPromise(this.parts.pipe(Effect.asVoid, Effect.catch(() => Effect.void))));
  }

  /** Run an Effect for a caller across Durable Object RPC: a failure arrives as an Error whose message holds no secret. */
  private run<A>(work: Effect.Effect<A, unknown, never>): Promise<A> {
    return Effect.runPromise(work.pipe(Effect.mapError((error) => new Error(describe(error)))));
  }

  /** Ask for the next alarm one period from now, unless one is already set or nothing may still change. */
  private readonly arm: Effect.Effect<void> = Effect.gen({ self: this }, function* () {
    const period = this.store.config()?.pollIntervalMs;
    if (period === undefined || this.store.open().length === 0) return;
    if ((yield* Effect.promise(() => this.ctx.storage.getAlarm())) !== null) return;
    yield* this.setAlarmAfter(period);
  });

  private setAlarmAfter(period: number) {
    return Clock.currentTimeMillis.pipe(Effect.flatMap((now) => Effect.promise(() => this.ctx.storage.setAlarm(now + period))));
  }

  /** The live parts, built on first use from the stored configuration and the key binding, and again after a restart. */
  private readonly parts: Effect.Effect<Parts, ChainFault> = Effect.gen({ self: this }, function* () {
    const live = this.live ?? (yield* this.starting.withPermit(Effect.gen({ self: this }, function* () {
      if (this.live !== undefined) return this.live;
      const config = this.store.config();
      if (config === undefined) return yield* invalid("this relayer is not configured: call configure first");
      this.live = yield* startLive(config, this.env.RELAYER_KEY, this.store).pipe(Effect.provide(TimersLive));
      return this.live;
    })));
    return { live, store: this.store, arm: this.arm };
  });

  /**
   * Configure under the reconcile lock and with every `relay` drained, so there is only ever one Live: a new one is built (and takes every open
   * row's reservation back) only when nothing is working on the old one, and nothing is working on both. A relay that arrives meanwhile waits.
   */
  configure(config: RelayerConfig): Promise<{ readonly address: Hex }> {
    return this.run(this.lock.withPermit(this.swap.withPermits(SWAP_PERMITS)(Effect.gen({ self: this }, function* () {
      const kept = this.store.config();
      if (!Number.isSafeInteger(config.chainId) || config.chainId <= 0) return yield* invalid("chainId must be a positive integer");
      if (config.pollIntervalMs !== undefined && (!Number.isSafeInteger(config.pollIntervalMs) || config.pollIntervalMs <= 0)) return yield* invalid("pollIntervalMs must be a positive integer");
      if (kept !== undefined && kept.chainId !== config.chainId) return yield* invalid(`this relayer is for chain ${kept.chainId}`);
      if (kept?.pollIntervalMs !== config.pollIntervalMs) yield* Effect.promise(() => this.ctx.storage.deleteAlarm());
      if (kept?.rpcUrl !== config.rpcUrl || kept.pollIntervalMs !== config.pollIntervalMs) {
        this.store.keep({ rpcUrl: config.rpcUrl, chainId: config.chainId, ...(config.pollIntervalMs === undefined ? {} : { pollIntervalMs: config.pollIntervalMs }) });
        this.live = undefined;
      }
      const { live, arm } = yield* this.parts;
      yield* arm;
      return { address: live.key.address as Hex };
    }))));
  }

  relay(call: { readonly to: Hex; readonly data: Hex }) {
    return this.run(this.swap.withPermits(1)(this.parts.pipe(Effect.flatMap((parts) => relay(parts, call)))));
  }

  status(id: string) {
    return this.run(this.parts.pipe(Effect.flatMap((parts) => status(parts, id))));
  }

  reconcile() {
    return this.run(this.reconciling);
  }

  /** The Live is read after the lock is taken, so a `configure` that swapped it meanwhile is not worked around. */
  private readonly reconciling = Effect.suspend(() => this.lock.withPermit(this.parts.pipe(Effect.flatMap(reconcile))));

  /** The alarm does what `reconcile` does, and asks for the next one while anything may still change. */
  override alarm(): Promise<void> {
    return this.run(this.reconciling.pipe(
      Effect.ignore,
      Effect.andThen(Effect.suspend(() => this.store.config()?.pollIntervalMs === undefined || this.store.open().length === 0
        ? Effect.void
        : this.setAlarmAfter(this.store.config()?.pollIntervalMs ?? 0))),
    ));
  }
}
