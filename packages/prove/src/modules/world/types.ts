// A local world: the generated Worker on real workerd, with its world Durable Object and a fresh local D1.
import { Data, type Effect, type Redacted, type Scope } from "effect";

export class WorldFailed extends Data.TaggedError("WorldFailed")<{
  readonly message: string;
  /** wrangler exited because a socket it picked was already taken: starting again can work. */
  readonly taken?: boolean;
}> {}

/** A chain a world stands up beside its Worker (`Stand.process`, M1.31): where it answers, and which chain it is. */
export interface ChainStand {
  readonly rpcUrl: string;
  readonly chainId: number;
  /** The funded accounts the world made, their keys redacted: what a journey's `s.world.chain` is built from. */
  readonly accounts?: ReadonlyArray<{ readonly address: string; readonly privateKey: Redacted.Redacted<string> }>;
}

/** The stand-ins a world stood up: what its Worker is told of them, and each one's address by mount (G16-adapter-mounts calls 3 and 4). */
export interface StandIns {
  readonly env: Readonly<Record<string, string>>;
  readonly addresses: Readonly<Record<string, string>>;
}

export interface Running {
  readonly url: string;
  /** The address of each stand-in the world stood up, by mount: where a journey's command to one goes. */
  readonly stands?: Readonly<Record<string, string>>;
  /** The world's chain, when it was asked for one. It lives exactly as long as the world. */
  readonly chain?: ChainStand;
  /** Where wrangler's own output goes, for when something looks wrong. */
  readonly log: string;
}

/** A `wrangler dev` kept running by whoever asked for it: a long-lived environment. */
export interface Launched {
  readonly pid: number;
  readonly url: string;
  readonly log: string;
}

export interface WorldsApi {
  /** A port the system says is free on 127.0.0.1 now (what `port: 0` means), for callers that must name one. */
  readonly anyPort: Effect.Effect<number, WorldFailed>;

  /**
   * Start `wrangler dev` on a config the caller made, detached in its own process group so it outlives this process:
   * the local database's migrations applied first, then wrangler on `port` with its own `state` folder and inspector
   * port, started again if a socket it picked was taken, and ready once `ready` (a path) answers. Stopping it is the
   * caller's: the pid is theirs to keep.
   */
  readonly launch: (options: {
    readonly config: string;
    readonly state: string;
    readonly port: number;
    readonly log: string;
    /** Written with wrangler's process id the moment it starts. */
    readonly pidFile: string;
    /** A file of secrets for wrangler's `--env-file`. */
    readonly envFile?: string;
    /** Secrets for the Worker that never touch a file or an argument (the telemetry sinks' tokens). */
    readonly secretEnv?: Readonly<Record<string, string>>;
    readonly ready: string;
  }) => Effect.Effect<Launched, WorldFailed>;

  /**
   * Start the project at `root` (`port` 0: any free port, the one used is in `url`): a fresh local database with the model's tables, then `wrangler dev` with a new
   * world secret (never written to a file). Ready once the world answers. Stopped when the scope closes.
   */
  readonly start: (options: {
    readonly root: string;
    readonly port: number;
    /** Which folder under `.ortho/` holds this world's state: `dev` for `ortho dev`, `prove` for prove. */
    readonly name: string;
    /** The collector's OTLP/HTTP base URL; unset, the Worker exports nothing. */
    readonly otlp?: string;
    /** Where this world's starter answers its telemetry window (`PortalFeed.serve`): the Worker's portal reads it as `ORTHO_PORTAL_FEED`, so a run lights its own portal. */
    readonly portalFeed?: string;
    /** A random value the world says in its health answer and requires in a reset (`ortho dev`'s world, found by `warm`). */
    readonly nonce?: string;
    /** The environment this world stands for, written on every span as `deployment.environment`. Default `local`. */
    readonly environment?: string;
    /** Secrets for the Worker that never touch a file or an argument: `OTLP_SINKS`, from `Sinks.resolve`. */
    readonly secretEnv?: Readonly<Record<string, string>>;
    /**
     * The world's chain, as an effect the caller supplies (the composition root wires `Anvil.start` from
     * `@orthograph/chain-evm`). It is acquired in the world's scope before the Worker starts and released after the
     * Worker stops, so the chain is gone when the world ends.
     */
    readonly chain?: Effect.Effect<ChainStand, WorldFailed, Scope.Scope>;
    /**
     * The mounts' stand-ins (G16-adapter-mounts call 3), given the world's state folder once it is wiped: the caller starts
     * them under `<state>/stands/<mount>` and answers what the Worker is told of them (`ORTHO_STAND_<MOUNT>`,
     * `<MOUNT>_API_KEY`), which joins `secretEnv`, and each one's address by mount, which the world's `stands` is.
     * Acquired before the Worker and released after it, as the chain is.
     */
    readonly stands?: (state: string) => Effect.Effect<StandIns, WorldFailed, Scope.Scope>;
  }) => Effect.Effect<Running, WorldFailed, Scope.Scope>;
}
