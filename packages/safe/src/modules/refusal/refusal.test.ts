import { Data, Effect } from "effect";
import { describe, expect, test } from "vitest";
import { Abi, ChainFault, ChainRefusal, type Hex } from "@orthograph/chain-evm/device";
import { SafeRefusal, SafeRefused } from "../../index.ts";
import { fn } from "../world/internal/testing.ts";

// The revert bytes are made by the check: `Error(string)` (selector 0x08c379a0) as Solidity's `require(…, reason)` writes them.
const SAFE = "0x925d0B0F1AE3B4Be9C3A831100b6bdF711dB4Bc9";
const OTHER_SAFE = "0x8fC4AF618430430a01522137f6d0b5930446c39B";
const errorString = (reason: string) => Effect.runSync(Abi.encodeCall(fn("Error", [["reason", "string"]]), [reason]));
const reverted = (raw: Hex | undefined) => new ChainFault({ kind: "revert", message: "EVM execution reverted with an unlocked selector", ...(raw === undefined ? {} : { raw }) });

class Elsewhere extends Data.TaggedError("Elsewhere")<{ readonly why: string }> {}

describe("SafeRefusal.from", () => {
  test.each(["GS026", "GS025", "GS020", "GS013", "GS031", "GS000"])("a require string %s is SafeRefused with that code, for the Safe it is given", (code) => {
    const refused = SafeRefusal.from(SAFE, reverted(errorString(code)));
    expect(refused).toBeInstanceOf(SafeRefused);
    expect(refused).toStrictEqual(new SafeRefused({ code: code as `GS${string}`, safe: SAFE }));
    expect(SafeRefusal.from(OTHER_SAFE, reverted(errorString(code)))).toStrictEqual(new SafeRefused({ code: code as `GS${string}`, safe: OTHER_SAFE }));
  });

  test.each([
    ["a reason that is not a Safe's", errorString("Ownable: caller is not the owner")],
    ["a code with a fourth digit", errorString("GS0260")],
    ["a code with two digits", errorString("GS26")],
    ["a code with a space after it", errorString("GS026 ")],
    ["a code inside a longer reason", errorString("Safe: GS026")],
    ["a code in lower case", errorString("gs026")],
    ["an empty reason", errorString("")],
    ["a panic", Effect.runSync(Abi.encodeCall(fn("Panic", [["code", "uint256"]]), [0x11n]))],
    ["a custom error", Effect.runSync(Abi.encodeCall(fn("NotAnOwner", [["who", "address"]]), [SAFE]))],
    ["Error(string)'s selector and nothing after it", "0x08c379a0" as Hex],
    ["no data", undefined],
  ] as const)("%s comes back as it was, the same fault", (_name, raw) => {
    const fault = reverted(raw);
    expect(SafeRefusal.from(SAFE, fault)).toBe(fault);
  });

  test("a fault that is not a revert, and a refusal chain-evm already typed, come back as they were", () => {
    const transport = new ChainFault({ kind: "transport", message: "The RPC did not answer" });
    const refusal = new ChainRefusal({ code: "TOKEN-001", name: "InsufficientBalance", selector: "0xcf479181", args: { available: 1n, requested: 2n } });
    expect(SafeRefusal.from(SAFE, transport)).toBe(transport);
    expect(SafeRefusal.from(SAFE, refusal)).toBe(refusal);
  });
});

describe("SafeRefusal.typed", () => {
  const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.flip(effect));

  test("a call whose Safe refused fails as SafeRefused", () =>
    run(Effect.fail(reverted(errorString("GS026"))).pipe(SafeRefusal.typed(SAFE)))
      .then((error) => expect(error).toStrictEqual(new SafeRefused({ code: "GS026", safe: SAFE }))));

  test("every other failure, and an error that is not the chain's, comes back as it was", () =>
    Promise.all([
      run(Effect.fail(reverted(errorString("Ownable: caller is not the owner"))).pipe(SafeRefusal.typed(SAFE))),
      run(Effect.fail(new Elsewhere({ why: "not a chain error" })).pipe(SafeRefusal.typed(SAFE))),
    ]).then(([other, elsewhere]) => {
      expect(other).toMatchObject({ _tag: "ChainFault", kind: "revert", raw: errorString("Ownable: caller is not the owner") });
      expect(elsewhere).toStrictEqual(new Elsewhere({ why: "not a chain error" }));
    }));

  test("a call that succeeds answers what it answered", () =>
    Effect.runPromise(Effect.succeed(42).pipe(SafeRefusal.typed(SAFE))).then((answer) => expect(answer).toBe(42)));
});
