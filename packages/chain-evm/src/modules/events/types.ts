// Adapted from @prb/effect-evm@5.0.3 src/events/{cursor,decoder,reliable-stream}.ts. See LICENSE-prb-effect-evm.
import type { Effect, Stream } from "effect";
import type { Abi, Address, Hash, Log } from "viem";
import type { ChainFault } from "../faults/types.ts";

export type EventAbi = Extract<Abi[number], { type: "event" }>;

export interface DecodedEvent {
  readonly eventName: string;
  readonly args: unknown;
  readonly address: Address;
  readonly blockNumber: bigint;
  readonly blockHash: Hash;
  readonly transactionHash: Hash;
  readonly logIndex: number;
}

export type EventFor<T extends EventAbi> = DecodedEvent & {
  readonly eventName: T["name"];
  readonly args: Log<bigint, number, false, T, true>["args"];
};

export interface EventSource<TEvent extends DecodedEvent> {
  readonly address: Address;
  readonly event: EventAbi;
  readonly fromBlock: bigint;
  readonly decode: (log: Log) => Effect.Effect<TEvent, ChainFault>;
}

export interface BlockIdentity {
  readonly number: bigint;
  readonly hash: Hash;
}

export interface EventCheckpoint<TEvent extends DecodedEvent> {
  readonly through: BlockIdentity | undefined;
  readonly window: ReadonlyArray<BlockIdentity>;
  readonly seen: ReadonlyArray<{ readonly event: TEvent; readonly confirmed: boolean }>;
}

export type EventChange<TEvent extends DecodedEvent> =
  | { readonly _tag: "Observed"; readonly event: TEvent }
  | { readonly _tag: "Confirmed"; readonly event: TEvent }
  | { readonly _tag: "Corrected"; readonly event: TEvent; readonly wasConfirmed: boolean };

export interface EventPoll<TEvent extends DecodedEvent> {
  readonly checkpoint: EventCheckpoint<TEvent>;
  readonly changes: ReadonlyArray<EventChange<TEvent>>;
  readonly caughtUp: boolean;
  readonly headTimestamp: bigint;
}

export interface EventFollower<TEvent extends DecodedEvent> {
  readonly poll: (checkpoint?: EventCheckpoint<TEvent>) => Effect.Effect<EventPoll<TEvent>, ChainFault>;
  readonly stream: (checkpoint?: EventCheckpoint<TEvent>) => Stream.Stream<EventPoll<TEvent>, ChainFault>;
}
