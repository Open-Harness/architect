// A typed event source from an ABI event item and an address (ST2-abi-adapters section 4). Gated like chain-evm's: ORTHO_CHAIN_EVM_ANVIL=1.
import { Effect, Stream } from "effect";
import { describe, expect, it } from "vitest";
import { anvilOn, bindings, ev, fn, onChain, tokenBytecode } from "../../../test/support.ts";
import { Contract } from "../contract/service.ts";
import { AbiEvents } from "./service.ts";
import type { TypedEvent } from "./types.ts";

const anvil = it.skipIf(!anvilOn);
const timeout = 60_000;
type TransferArgs = { readonly from: `0x${string}`; readonly to: `0x${string}`; readonly value: bigint };
type ApprovalArgs = { readonly owner: `0x${string}`; readonly spender: `0x${string}`; readonly value: bigint };

describe("AbiEvents.source", () => {
  it("is the event item at the address, from the block asked", () => {
    const address = "0x00000000000000000000000000000000000000aa" as const;
    const source = AbiEvents.source<"Transfer", TransferArgs>(ev("Transfer"), address, 12n);
    expect(source).toMatchObject({ address, fromBlock: 12n, event: { type: "event", name: "Transfer" } });
  });

  anvil("decodes a transfer's log with typed arguments: names, an Address, a bigint", () =>
    onChain(tokenBytecode, ({ deployer, other, world, address }) => Effect.gen(function* () {
      const port = yield* world.port();
      const submission = yield* Contract.write(fn("transfer"), { to: other.address, value: 9n }, bindings);
      const included = yield* Stream.runHead(port.track(submission, { depth: 1 }));
      const receipt = included._tag === "Some" && included.value._tag === "Included" ? included.value.receipt : undefined;
      const log = receipt?.logs[0];
      if (receipt === undefined || log === undefined) return yield* Effect.die("the transfer left no log");
      const source = AbiEvents.source<"Transfer", TransferArgs>(ev("Transfer"), address, receipt.blockNumber);
      const event = yield* source.decode(log);
      const typed: TypedEvent<"Transfer", TransferArgs> = event;
      expect(typed).toMatchObject({
        eventName: "Transfer", address, blockNumber: receipt.blockNumber, transactionHash: submission.hash,
        args: { from: deployer.address, to: other.address, value: 9n },
      });
      expect(Object.keys(typed.args as object).sort()).toEqual(["from", "to", "value"]);
    })), timeout);

  anvil("a log of another event, or of another address, is a ChainFault of kind event", () =>
    onChain(tokenBytecode, ({ other, world, address }) => Effect.gen(function* () {
      const port = yield* world.port();
      const submission = yield* Contract.write(fn("transfer"), { to: other.address, value: 1n }, bindings);
      const included = yield* Stream.runHead(port.track(submission, { depth: 1 }));
      const log = included._tag === "Some" && included.value._tag === "Included" ? included.value.receipt.logs[0] : undefined;
      if (log === undefined) return yield* Effect.die("the transfer left no log");
      const approval = AbiEvents.source<"Approval", ApprovalArgs>(ev("Approval"), address, 0n);
      expect(yield* Effect.flip(approval.decode(log))).toMatchObject({ _tag: "ChainFault", kind: "event" });
      const elsewhere = AbiEvents.source<"Transfer", TransferArgs>(ev("Transfer"), "0x00000000000000000000000000000000000000bb", 0n);
      expect(yield* Effect.flip(elsewhere.decode(log))).toMatchObject({ _tag: "ChainFault", kind: "event" });
    })), timeout);

  anvil("the follower sees the event Confirmed through the source, with the typed arguments", () =>
    onChain(tokenBytecode, ({ deployer, other, world, address }) => Effect.gen(function* () {
      const port = yield* world.port();
      const from = yield* world.blockNumber;
      yield* Contract.write(fn("transfer"), { to: other.address, value: 3n }, bindings);
      const source = AbiEvents.source<"Transfer", TransferArgs>(ev("Transfer"), address, from);
      const polled = yield* port.follow(source, { depth: 1 }).poll();
      expect(polled.changes).toContainEqual(expect.objectContaining({
        _tag: "Confirmed", event: expect.objectContaining({ args: { from: deployer.address, to: other.address, value: 3n } }),
      }));
    })), timeout);
});
