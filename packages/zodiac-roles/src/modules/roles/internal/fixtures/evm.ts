// Test-only (#1163's checks): the few EVM helpers the checks need, on chain-evm's own `Abi` and `Keys` (no package but
// chain-evm imports viem: the ortho/no-viem-outside-chain rule). Never shipped (tsconfig.build.json excludes this folder).
import { Effect } from "effect";
import { Abi, Keys, type AbiFunction, type AbiParameter, type Address, type Hex } from "@orthograph/chain-evm/device";

const bare = (part: string) => (part.startsWith("0x") ? part.slice(2) : part);
/** Hex parts joined into one `0x` string. */
export const hex = (...parts: ReadonlyArray<string>): Hex => `0x${parts.map(bare).join("")}`;
/** A uint256 word, 64 hex digits. */
export const word = (value: bigint) => value.toString(16).padStart(64, "0");
/** An address as a word, 64 hex digits. */
export const addressWord = (address: Address) => bare(address).toLowerCase().padStart(64, "0");
export const keccak = (data: Hex): Hex => hex(Buffer.from(Keys.keccak256(Buffer.from(bare(data), "hex"))).toString("hex"));
export const utf8 = (text: string): Hex => hex(Buffer.from(text, "utf8").toString("hex"));
/** The first 4 bytes of the keccak-256 of a signature. */
export const selector = (signature: string): Hex => keccak(utf8(signature)).slice(0, 10) as Hex;
/** CREATE2: the last 20 bytes of keccak256(0xff ++ from ++ salt ++ keccak256(initCode)), checksummed. */
export const create2 = (from: Address, salt: Hex, initCode: Hex): Address =>
  Keys.checksum(`0x${keccak(hex("ff", from, salt, keccak(initCode))).slice(26)}`);
export const checksum = (address: Address) => Keys.checksum(address);

type Param = readonly [type: string, name?: string, components?: ReadonlyArray<AbiParameter>];
const parameter = ([type, name, components]: Param): AbiParameter =>
  ({ type, name: name ?? "", ...(components === undefined ? {} : { components }) }) as AbiParameter;
/** An ABI function item, written out. */
export const fn = (name: string, inputs: ReadonlyArray<Param>, outputs: ReadonlyArray<Param> = [], stateMutability: AbiFunction["stateMutability"] = "nonpayable"): AbiFunction =>
  ({ type: "function", name, inputs: inputs.map(parameter), outputs: outputs.map(parameter), stateMutability }) as AbiFunction;
/** The signature `name(type,...)` of a function item, tuples written out. */
export const signatureOf = (item: AbiFunction) => {
  const typeOf = (p: AbiParameter): string => {
    const components = (p as { readonly components?: ReadonlyArray<AbiParameter> }).components;
    return components === undefined ? p.type : `(${components.map(typeOf).join(",")})${p.type.slice("tuple".length)}`;
  };
  return `${item.name}(${item.inputs.map(typeOf).join(",")})`;
};
export const encode = (item: AbiFunction, args: ReadonlyArray<unknown>) => Abi.encodeCall(item, args);
/** A call's arguments read back: its data after the selector, decoded as if they were the function's outputs. */
export const decodeArgs = (item: AbiFunction, data: Hex) =>
  Abi.decodeResult({ ...item, outputs: item.inputs } as AbiFunction, hex(data.slice(10)));

/** One JSON-RPC request to a world's Anvil. A failure names the method and never the request's contents. */
export const jsonRpc = (url: string) => (method: string, params: ReadonlyArray<unknown> = []) =>
  Effect.tryPromise({
    try: () => fetch(url, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }).then((response) => response.json() as Promise<{ readonly result?: unknown; readonly error?: unknown }>),
    catch: () => new Error(`Anvil fixture RPC ${method} failed`),
  }).pipe(Effect.flatMap((answer) => answer.error === undefined
    ? Effect.succeed(answer.result)
    : Effect.fail(new Error(`Anvil fixture RPC ${method} was refused`))));
