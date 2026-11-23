// Adapted from @prb/effect-evm@5.0.3 src/events/reliable-stream.ts and K7 Q6. See LICENSE-prb-effect-evm.
import type { BlockIdentity, DecodedEvent, EventChange, EventCheckpoint } from "../types.ts";

export const applyEvents = <TEvent extends DecodedEvent>(
  old: EventCheckpoint<TEvent>, ancestor: BlockIdentity | undefined, events: ReadonlyArray<TEvent>,
  confirmedThrough: bigint, oldest: bigint,
) => {
  const changes: EventChange<TEvent>[] = [];
  const seen = old.seen.filter(({ event, confirmed }) => {
    if (ancestor !== undefined && event.blockNumber <= ancestor.number) return true;
    changes.push({ _tag: "Corrected", event, wasConfirmed: confirmed });
    return false;
  });
  const keys = new Set(seen.map(({ event }) => keyOf(event)));
  for (const event of events) {
    const key = keyOf(event);
    if (keys.has(key)) continue;
    keys.add(key);
    changes.push({ _tag: "Observed", event });
    seen.push({ event, confirmed: false });
  }
  const next = seen.map((prior) => {
    if (prior.confirmed || prior.event.blockNumber > confirmedThrough) return prior;
    changes.push({ _tag: "Confirmed", event: prior.event });
    return { event: prior.event, confirmed: true };
  });
  return { changes, seen: next.filter(({ event, confirmed }) => !confirmed || event.blockNumber >= oldest) };
};

const keyOf = (event: DecodedEvent) => `${event.blockHash}:${event.transactionHash}:${event.logIndex}`;
