// ABIs the generate checks plan against, and the helpers that read a planned file. Written by the checks author (ST2.02).
import { Effect } from "effect";
import { AbiAdapters } from "../service.ts";
import type { AbiItem, AbiParameter, PlannedFile } from "../types.ts";

export const param = (type: string, name: string, extra: Partial<AbiParameter> = {}): AbiParameter => ({ name, type, ...extra });

/** One function with every type the decision's table maps, a nested tuple and a tuple array. */
export const kitchenSink: AbiItem = {
  type: "function", name: "kitchenSink", stateMutability: "nonpayable",
  inputs: [
    param("uint256", "a"), param("uint8", "b"), param("int128", "c"), param("address", "d"), param("bool", "e"),
    param("string", "f"), param("bytes", "g"), param("bytes32", "h"), param("uint256[]", "i"), param("address[3]", "j"),
    param("uint256[][]", "k"),
    param("tuple", "pair", { components: [
      param("uint256", "a"), param("address", "b"), param("tuple", "inner", { components: [param("bool", "x")] }),
    ] }),
    param("tuple[]", "pairs", { components: [param("uint256", "a")] }),
  ],
  outputs: [param("bool", "ok"), param("uint256", "count")],
};

/** An event with indexed static and indexed dynamic arguments: an indexed string, bytes, array or tuple is only its topic hash. */
export const moved: AbiItem = {
  type: "event", name: "Moved", anonymous: false,
  inputs: [
    param("address", "who", { indexed: true }), param("string", "label", { indexed: true }), param("bytes", "blob", { indexed: true }),
    param("uint256[]", "list", { indexed: true }), param("tuple", "box", { indexed: true, components: [param("bool", "x")] }),
    param("string", "plain"), param("uint256", "amount"),
  ],
};

export const oops: AbiItem = { type: "error", name: "Oops", inputs: [param("address", "who"), param("uint256", "needed")] };
export const readOnly: AbiItem = { type: "function", name: "peek", stateMutability: "view", inputs: [param("address", "who")], outputs: [param("uint256", "")] };
export const pureOne: AbiItem = { type: "function", name: "twice", stateMutability: "pure", inputs: [param("uint256", "x")], outputs: [param("uint256", "")] };
export const noArgs: AbiItem = { type: "function", name: "ping", stateMutability: "view", inputs: [], outputs: [param("string", "")] };
export const noAnswer: AbiItem = { type: "function", name: "poke", stateMutability: "nonpayable", inputs: [param("uint256", "x")], outputs: [] };

export const planOf = (abi: ReadonlyArray<AbiItem>, bytecode?: `0x${string}`) =>
  AbiAdapters.plan({ name: "app", abiFile: "abi.json", abi, ...(bytecode === undefined ? {} : { bytecode }) });

export const fileOf = (files: ReadonlyArray<PlannedFile>, path: string): string => {
  const file = files.find((f) => f.path === path);
  return file === undefined ? `<no file ${path}>` : file.content;
};

/** The text of `export interface <name> {` through its closing brace and newline, or a marker the comparison fails on. */
export const interfaceOf = (content: string, name: string): string => {
  const start = content.indexOf(`export interface ${name} {`);
  if (start < 0) return `<no interface ${name}>`;
  const end = content.indexOf("\n}\n", start);
  return content.slice(start, end < 0 ? undefined : end + 3);
};

/** The text of an exported const's statement: from `export const <name> =` to the next blank line. */
export const statementOf = (content: string, name: string): string => {
  const start = content.indexOf(`export const ${name} =`);
  if (start < 0) return `<no export ${name}>`;
  const end = content.indexOf("\n\n", start);
  return content.slice(start, end < 0 ? undefined : end);
};

export const refusalOf = (abi: ReadonlyArray<AbiItem>) => Effect.flip(planOf(abi));
