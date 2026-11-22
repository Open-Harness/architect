// Shared by the module's checks: the ABI they use and the helpers that write a word by hand.
import { Effect } from "effect";
import { parseAbi, type Hex } from "viem";
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

export const encode = (functionName: string, args?: ReadonlyArray<unknown>) =>
  Effect.runSync(Abi.encodeCall({ abi, functionName, ...(args === undefined ? {} : { args }) }));
export const decode = (functionName: string, data: Hex) => Effect.runSync(Abi.decodeResult({ abi, functionName, data }));
export const decodeFault = (functionName: string, data: Hex) => Effect.runSync(Effect.flip(Abi.decodeResult({ abi, functionName, data })));
