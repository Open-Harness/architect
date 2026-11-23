import { Cause, Effect, Exit, Stream } from "effect";
import { ChainFault, ChainRefusal, type ChainPort, type FaultKind, type TxState } from "@orthograph/chain-evm/device";
import { describe, expect, it } from "vitest";
import { KeyLocked, SimulationReverted } from "../../../blueprint/things/wallet/errors.js";
import { depthOf, follow, refused } from "./internal/flow.ts";
import type { Sent } from "./types.ts";

const fault = (kind: FaultKind) => new ChainFault({ kind, message: "EVM RPC request failed" });

describe("what a fault of the chain is to the person sending", () => {
  it.each(["revert", "panic", "funds"] as const)("a %s fault in simulation is SimulationReverted", async (kind) => {
    expect(await Effect.runPromise(Effect.flip(refused(fault(kind))))).toBeInstanceOf(SimulationReverted);
  });

  it("a refusal the contract gave by name is SimulationReverted", async () => {
    const refusal = new ChainRefusal({ code: "TOKEN-001", name: "InsufficientBalance", selector: "0xcf479181", args: {} });
    expect(await Effect.runPromise(Effect.flip(refused(refusal)))).toBeInstanceOf(SimulationReverted);
  });

  it.each(["rejected", "signing"] as const)("a %s fault is KeyLocked: the signer would not sign", async (kind) => {
    expect(await Effect.runPromise(Effect.flip(refused(fault(kind))))).toBeInstanceOf(KeyLocked);
  });

  it.each(["transport", "timeout", "configuration", "nonce"] as const)("a %s fault is a defect that says what, not a declared error", async (kind) => {
    const exit = await Effect.runPromiseExit(refused(fault(kind)));
    expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
    expect(Exit.isFailure(exit) && Cause.pretty(exit.cause)).toContain(kind);
  });
});

const receipt = { status: "success" } as never;
const hash = "0x0000000000000000000000000000000000000000000000000000000000000001" as const;
const submission = { hash, from: "0x0000000000000000000000000000000000000001", nonce: 0, fromBlock: 0n } as const;
/** A port that tracks nothing but the states it is given, in order. */
const following = (states: ReadonlyArray<TxState>, depth: number) =>
  Effect.runPromiseExit(
    follow({ track: () => Stream.fromIterable(states) } as unknown as ChainPort, submission, depth) as Effect.Effect<Sent, SimulationReverted | KeyLocked>,
  );

describe("when a send is confirmed", () => {
  it("is when the stream reaches the depth with the inclusion never dropped (the control)", async () => {
    const exit = await following([{ _tag: "Included", receipt }, { _tag: "Deepened", blocks: 1, receipt }, { _tag: "Deepened", blocks: 3, receipt }], 3);
    expect(Exit.isSuccess(exit) && exit.value.level).toBe("confirmed");
  });

  it("is not when the inclusion was dropped (a reorg), even if a later block deepens another one", async () => {
    const exit = await following(
      [{ _tag: "Included", receipt }, { _tag: "Dropped", hash, reason: "nonce-consumed" }, { _tag: "Deepened", blocks: 3, receipt }],
      3,
    );
    // On m1 `follow` answers "confirmed" as soon as any Included exists, whatever came after it.
    expect(Exit.isSuccess(exit) ? `reported ${exit.value.level} after Included, Dropped, Deepened` : "not confirmed").toBe("not confirmed");
  });
});

describe("the depth a send confirms at", () => {
  it("is the setting's, and a chain with none is a defect naming ORTHO_WALLET_DEPTH, asked before anything is prepared", async () => {
    expect(await Effect.runPromise(depthOf({ chainId: 1, rpcUrl: "http://127.0.0.1:1", depth: 12 }))).toBe(12);
    const exit = await Effect.runPromiseExit(depthOf({ chainId: 1, rpcUrl: "http://127.0.0.1:1", depth: undefined }));
    expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause) && Cause.pretty(exit.cause)).toContain("ORTHO_WALLET_DEPTH");
  });
});
