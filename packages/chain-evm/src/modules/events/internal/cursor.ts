// Adapted from @prb/effect-evm@5.0.3 src/events/cursor.ts and K7 Q6. See LICENSE-prb-effect-evm.
import { Effect } from "effect";
import type { Address, Hash } from "viem";
import { ChainFault } from "../../faults/types.ts";
import type { BlockIdentity, DecodedEvent, EventCheckpoint } from "../types.ts";

export const WINDOW = 128n;
export const min = (left: bigint, right: bigint) => left < right ? left : right;
export const max = (left: bigint, right: bigint) => left > right ? left : right;

export interface Header extends BlockIdentity {
  readonly parentHash: Hash;
}

export const changed = (program: Address) =>
  new ChainFault({ kind: "reorg", program, message: "The chain changed during the event poll. Retry with the same checkpoint." });

export const findAncestor = <TEvent extends DecodedEvent>(
  checkpoint: EventCheckpoint<TEvent>, head: BlockIdentity, hashAt: (number: bigint) => Effect.Effect<Hash, ChainFault>, program: Address,
) => Effect.gen(function* () {
  if (checkpoint.through === undefined) return undefined;
  for (const previous of checkpoint.window.toReversed()) {
    if (previous.number <= head.number && (yield* hashAt(previous.number)) === previous.hash) return previous;
  }
  return yield* new ChainFault({
    kind: "reorg", program,
    message: "The EVM reorg exceeds the event checkpoint window. A trusted checkpoint is required to resume.",
  });
});

export const buildWindow = (
  retained: ReadonlyArray<BlockIdentity>, through: BlockIdentity, headerAt: (n: bigint) => Effect.Effect<Header, ChainFault>, program: Address,
) => Effect.gen(function* () {
  const start = max(0n, through.number - WINDOW + 1n);
  const known = new Map(retained.map((block) => [block.number, block]));
  const numbers = Array.from({ length: Number(through.number - start + 1n) }, (_, index) => start + BigInt(index));
  // Each RPC parks the caller's work token. Read serially within this follower job.
  const headers = yield* Effect.forEach(numbers, (n) => {
    const existing = known.get(n);
    return existing === undefined ? headerAt(n) : Effect.succeed(existing);
  });

  let previous: BlockIdentity | undefined;
  for (const header of headers) {
    if (previous !== undefined && "parentHash" in header && header.parentHash !== previous.hash) {
      return yield* changed(program);
    }
    previous = header;
  }
  if (previous?.hash !== through.hash) return yield* changed(program);
  return headers.map(({ number, hash }) => ({ number, hash }));
});
