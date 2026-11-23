import type { DecodedEvent, EventChange } from "@orthograph/chain-evm/device";
import type { FollowerConfig, SinkEntry } from "../types.ts";

/** An event's arguments as JSON: a uint is its decimal string, an address keeps its case. */
export const fieldsOf = (value: unknown): unknown =>
  typeof value === "bigint" ? value.toString()
    : Array.isArray(value) ? value.map(fieldsOf)
      : typeof value === "object" && value !== null ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fieldsOf(v)]))
        : value;

const idOf = (chainId: number, event: DecodedEvent) => `${chainId}:${event.blockHash}:${event.logIndex}`;

/**
 * What the sink is to be told of one change, or nothing. A `Confirmed` event is handed on, and so is a `Corrected` one that
 * had been confirmed; `Observed` is not, and a take-back of an unconfirmed event is dropped: the sink never saw it (M6-chain item 12).
 */
export const entryOf = (config: Pick<FollowerConfig, "chainId" | "contract">, change: EventChange<DecodedEvent>): SinkEntry | undefined => {
  const name = `${config.contract}.${change.event.eventName}`;
  const args = fieldsOf(change.event.args) as Record<string, unknown>;
  if (change._tag === "Confirmed") return { source: "chain", id: idOf(config.chainId, change.event), event: name, fields: args };
  if (change._tag === "Corrected" && change.wasConfirmed) {
    return { source: "chain", id: `${idOf(config.chainId, change.event)}:corrected`, event: `${name}Corrected`, fields: { ...args, wasConfirmed: true } };
  }
  return undefined;
};
