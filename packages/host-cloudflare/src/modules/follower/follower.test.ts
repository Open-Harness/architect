import type { DecodedEvent, EventChange } from "@orthograph/chain-evm/device";
import { describe, expect, it } from "vitest";
import { entryOf, fieldsOf } from "./internal/entries.ts";

const event = { eventName: "Echoed", args: { id: (1n << 130n) + 5n, by: "0xAbC0000000000000000000000000000000000001", digest: "0x01" }, address: "0x0", blockNumber: 5n, blockHash: "0xb1", transactionHash: "0xt", logIndex: 1 } as unknown as DecodedEvent;
const config = { chainId: 31337, contract: "Echo" };
const of = (change: EventChange<DecodedEvent>) => entryOf(config, change);

describe("what the follower tells its sink", () => {
  it("a confirmed event: id from the chain, block hash and log index; uint as a decimal string", () => {
    expect(of({ _tag: "Confirmed", event })).toEqual({ source: "chain", id: "31337:0xb1:1", event: "Echo.Echoed", fields: { id: ((1n << 130n) + 5n).toString(), by: "0xAbC0000000000000000000000000000000000001", digest: "0x01" } });
  });
  it("a correction of a confirmed event carries wasConfirmed; of an unconfirmed one, nothing; an observed one, nothing", () => {
    expect(of({ _tag: "Corrected", event, wasConfirmed: true })).toMatchObject({ id: "31337:0xb1:1:corrected", event: "Echo.EchoedCorrected", fields: { wasConfirmed: true } });
    expect(of({ _tag: "Corrected", event, wasConfirmed: false })).toBeUndefined();
    expect(of({ _tag: "Observed", event })).toBeUndefined();
  });
  it("nested values become JSON", () => {
    expect(fieldsOf({ a: [1n, { b: 2n }], c: "x" })).toEqual({ a: ["1", { b: "2" }], c: "x" });
  });
});
