import { Effect } from "effect";
import { encodeErrorResult, parseAbi, toFunctionSelector } from "viem";
import { expect, test } from "vitest";
import { decodeRevert, mapRpcError, validateRefusalLock } from "./service.ts";
import type { RefusalLockEntry } from "./types.ts";

const abi = parseAbi(["error Earlier(uint256 amount)", "error Current(uint256 amount)"]);
const program = "0x0000000000000000000000000000000000000001";
const earlier: RefusalLockEntry = {
  code: "TX-001", name: "Current", signature: "Earlier(uint256)", selector: toFunctionSelector("Earlier(uint256)"), abi: abi[0], program,
};
const current: RefusalLockEntry = {
  code: "TX-001", name: "Current", signature: "Current(uint256)", selector: toFunctionSelector("Current(uint256)"), abi: abi[1], program,
};
const lock = [earlier, current];

test("locked old and current selectors keep the same refusal code and name", () => {
  Effect.runSync(validateRefusalLock(lock));
  for (const errorName of ["Earlier", "Current"] as const) {
    const data = encodeErrorResult({ abi, errorName, args: [3n] });
    expect(Effect.runSync(Effect.flip(mapRpcError({ cause: { code: 3, data } }, program, lock)))).toMatchObject({
      _tag: "ChainRefusal", code: "TX-001", name: "Current", args: { amount: 3n },
    });
    expect(Effect.runSync(Effect.flip(decodeRevert(data, undefined, lock)))).toMatchObject({
      _tag: "ChainFault", kind: "revert", raw: data,
    });
  }
});

test("empty and text-only reverts remain chain faults", () => {
  for (const error of [{ code: 3, data: "0x" }, { message: "execution reverted: Current" }]) {
    expect(Effect.runSync(Effect.flip(mapRpcError(error, program, lock)))).toMatchObject({
      _tag: "ChainFault", kind: "revert", program,
    });
  }
  expect(Effect.runSync(Effect.flip(mapRpcError({ message: "insufficient funds" })))).toMatchObject({
    _tag: "ChainFault", kind: "funds",
  });
});
