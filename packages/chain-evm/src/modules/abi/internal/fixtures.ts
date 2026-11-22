// Shared by the module's checks: the ABI they use and the helpers that write a word by hand.
import { Effect } from "effect";
import { parseAbi, type Hex } from "viem";
import type { AbiFunction } from "../types.ts";
import { Abi } from "../service.ts";

export const OWNER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
export const PROGRAM = "0x0000000000000000000000000000000000000001";
export const word = (n: bigint) => n.toString(16).padStart(64, "0");
export const addressWord = (address: string) => `${"0".repeat(24)}${address.slice(2).toLowerCase()}`;
export const hex = (...parts: ReadonlyArray<string>) => `0x${parts.join("")}` as Hex;

export const abi = parseAbi([
  "function transfer(address to, uint256 value) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function setName(string name)",
  "function sum(uint256[] values) pure returns (uint256)",
  "function owner() view returns (address)",
  "function position() view returns ((uint256 x, address owner) pos)",
  "function values() view returns (uint256[])",
  "function name() view returns (string)",
  "function pair() view returns (uint256 a, bool b)",
  "function small() view returns (uint8)",
  "function ping()",
]);

/** The one ABI item of that name, as `Abi` takes it. */
export const fn = (name: string): AbiFunction => {
  const item = (abi as ReadonlyArray<{ readonly type: string; readonly name?: string }>).find((i) => i.type === "function" && i.name === name);
  return (item ?? { type: "function", name, inputs: [], outputs: [], stateMutability: "nonpayable" }) as AbiFunction;
};
export const encode = (name: string, args: ReadonlyArray<unknown> = []) => Effect.runSync(Abi.encodeCall(fn(name), args));
export const decode = (name: string, data: Hex) => Effect.runSync(Abi.decodeResult(fn(name), data));
export const decodeFault = (name: string, data: Hex) => Effect.runSync(Effect.flip(Abi.decodeResult(fn(name), data)));
