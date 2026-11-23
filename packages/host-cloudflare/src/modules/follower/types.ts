// The follower: a Durable Object that follows one contract's events and hands each change to its sink (M6.09, M6-chain item 12).
// Every value that crosses Durable Object RPC is JSON; a uint is a decimal string.

/** What `configure` takes. `event` is the ABI item of the event, as `makeEventSource` takes it (as JSON). */
export interface FollowerConfig {
  readonly rpcUrl: string;
  /** The chain's numeric id; the follower is named `eip155:<chainId>:<address>`. */
  readonly chainId: number;
  /** The contract's name, the first half of the event names it hands on ("Echo"). */
  readonly contract: string;
  /** Lower case. */
  readonly address: string;
  readonly event: unknown;
  /** The first block to read, a decimal string. */
  readonly fromBlock: string;
  /** The confirmation level: a number of blocks (the check passes `2`), or chain-evm's own `{ depth }` or `{ tag }`. */
  readonly depth: number | { readonly depth: number } | { readonly tag: "safe" | "finalized" };
  readonly pollIntervalMs?: number;
}

export interface BlockView { readonly number: string; readonly hash: string }
/** What `checkpoint()` answers: the last block read, and the window of block hashes, oldest first. */
export interface CheckpointView { readonly through?: BlockView; readonly window: ReadonlyArray<BlockView> }

/** Why the alarm's last steps failed: the error's tag and message (no URL, no key), when (ms), and how many in a row. Cleared by the next step that succeeds. */
export interface FollowerHealth {
  readonly failures: number;
  readonly lastError: { readonly tag: string; readonly message: string; readonly at: number };
}

/** What reaches the sink: `Inbox.accept`'s shape (Ask #481). */
export interface SinkEntry {
  readonly source: "chain";
  /** `${chainId}:${blockHash}:${logIndex}`, and `:corrected` after it for a correction. */
  readonly id: string;
  /** `<Contract>.<Event>`, and `<Contract>.<Event>Corrected` for a correction. */
  readonly event: string;
  readonly fields: Readonly<Record<string, unknown>>;
}
export type SinkAnswer = "accepted" | "seen";

/** The port the follower hands changes to. Goal 11's `Inbox.accept` fills it; until then a Worker binds a Durable Object with this method as `FOLLOWER_SINK`. */
export interface FollowerSink { accept(entry: SinkEntry): Promise<SinkAnswer> }
export interface FollowerEnv {
  readonly FOLLOWER_SINK: { getByName(name: string): FollowerSink };
}

/** What the Worker calls on a follower, over Durable Object RPC. */
export interface FollowerApi {
  configure(config: FollowerConfig): Promise<void>;
  poll(): Promise<{ readonly caughtUp: boolean }>;
  checkpoint(): Promise<CheckpointView>;
  /** `null` while the follower is well. */
  health(): Promise<FollowerHealth | null>;
}
