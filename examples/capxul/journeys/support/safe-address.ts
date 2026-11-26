// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The address a Safe will have, worked out the way Safe 1.4.1's factory works it out, for the safe-* journeys to judge
// (design/decisions/CX-safe.md, "The address before deploy"). Not a journey: prove reads only the files directly in
// journeys/. The expected values come from the pinned contracts and the formula, never from what a handler answers;
// `tests/safe-address.test.ts` holds this formula to addresses the canonical factory on Base Sepolia gave.
import { keccak_256 } from "@noble/hashes/sha3.js";
import { SafeSettings } from "../../blueprint/values/safe.ts";

type Hex = `0x${string}`;

/** Safe 1.4.1, the L2 singleton, with the Safe 4337 module, at their canonical addresses on every EVM chain (CX-safe, `SafeDeployment`). */
export const SafeContracts = {
  factory: "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
  singleton: "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762",
  multiSend: "0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526",
  moduleSetup: "0x2dd68b007B46fBe91B9A7c3EDa5A7a1063cB5b47",
  module4337: "0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226",
} as const;

/**
 * `SafeProxyFactory.proxyCreationCode()` of the canonical 1.4.1 factory, read from Base Sepolia on 26 November 2026
 * (its keccak256 is 0x1856e0ee08399d74e0ea0b03adca210aeade6f748969ac023cdcb4dd62dcaf5f).
 */
export const PROXY_CREATION_CODE: Hex =
  "0x608060405234801561001057600080fd5b506040516101e63803806101e68339818101604052602081101561003357600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806101c46022913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505060ab806101196000396000f3fe608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea264697066735822122003d1488ee65e08fa41e58e888a9865554c535f2c77126a82cb4c0f917f31441364736f6c63430007060033496e76616c69642073696e676c65746f6e20616464726573732070726f7669646564";

const hex = (bytes: Uint8Array): string => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const bytesOf = (h: string): Uint8Array => Uint8Array.from((h.replace(/^0x/, "").match(/../g) ?? []).map((p) => parseInt(p, 16)));
/** keccak256 of bytes given as hex, as hex with no `0x`. */
const keccak = (h: string): string => hex(keccak_256(bytesOf(h)));
/** One ABI word: a number or an address, left-padded to 32 bytes. */
const word = (v: bigint | string): string => (typeof v === "bigint" ? v.toString(16) : v.replace(/^0x/, "").toLowerCase()).padStart(64, "0");
/** The first four bytes of keccak256 of a function's signature. */
const selector = (signature: string): string => keccak(hex(new TextEncoder().encode(signature))).slice(0, 8);
const ZERO = "0x0000000000000000000000000000000000000000";

/** An address with its EIP-55 checksum: each letter upper-cased where the hash of the lower-case address has a nibble of 8 or more. */
export const checksummed = (address: string): Hex => {
  const lower = address.replace(/^0x/, "").toLowerCase();
  const hash = keccak(hex(new TextEncoder().encode(lower)));
  return `0x${[...lower].map((c, i) => (parseInt(hash[i]!, 16) >= 8 ? c.toUpperCase() : c)).join("")}`;
};


/** Bytes given as hex, padded on the right to a whole number of words. */
const padded = (h: string): string => h.padEnd(Math.ceil(h.length / 64) * 64, "0");
/** `bytes` as the ABI writes it in a call's tail: its length, then its bytes padded to a whole word. */
const bytesTail = (h: string): string => word(BigInt(h.length / 2)) + padded(h);

/**
 * `setup([owner], 1, MultiSend, multiSend(<one packed delegatecall>), Safe4337Module, 0, 0, 0)`: one owner, threshold 1,
 * and at setup one delegatecall, through MultiSend, of `SafeModuleSetup.enableModules([Safe4337Module])`, with the 4337
 * module as the fallback handler and no payment (CX-safe, "The address before deploy", as confirmed on #1161). The
 * packed transaction is MultiSend's: operation (1 byte, 1 = delegatecall) ‖ to (20) ‖ value (32) ‖ data length (32) ‖
 * data. ABI-encoded by hand for this one shape; tests/safe-address.test.ts holds it to the factory's own answers.
 */
export const initializer = (owner: string): Hex => {
  const enable = selector("enableModules(address[])") + word(0x20n) + word(1n) + word(SafeContracts.module4337);
  const packed = "01" + SafeContracts.moduleSetup.slice(2).toLowerCase() + word(0n) + word(BigInt(enable.length / 2)) + enable;
  const multiSend = selector("multiSend(bytes)") + word(0x20n) + bytesTail(packed);
  return `0x${selector("setup(address[],uint256,address,bytes,address,address,uint256,address)")}${[
    word(0x100n), word(1n), word(SafeContracts.multiSend), word(0x140n), word(SafeContracts.module4337), word(ZERO), word(0n), word(ZERO),
    word(1n), word(owner), bytesTail(multiSend),
  ].join("")}`;
};

/** CREATE2 from the factory: salt `keccak256(keccak256(initializer) ‖ saltNonce)`, code the proxy's creation code ‖ the singleton as a uint256. */
export const predictAddress = (owner: string, saltNonce: bigint): Hex => {
  const salt = keccak(keccak(initializer(owner)) + word(saltNonce));
  const codeHash = keccak(PROXY_CREATION_CODE.slice(2) + word(SafeContracts.singleton));
  return checksummed(`0x${keccak(`ff${word(SafeContracts.factory).slice(24)}${salt}${codeHash}`).slice(24)}`);
};

/** `uint256(keccak256("<namespace>:<id>"))`, the id a person's `per_…` or a company's `com_…`. */
export const saltNonceOf = (namespace: string, id: string): bigint => BigInt(`0x${keccak(hex(new TextEncoder().encode(`${namespace}:${id}`)))}`);

const local = SafeSettings.local;

type SafeRecord = { readonly person?: unknown; readonly saltNonce?: unknown; readonly signer?: unknown; readonly firstOwner?: unknown; readonly account?: unknown; readonly state?: unknown };

/** What is wrong with a Safe's salt nonce as `personal-safe.get` answers it in the local environment, or `""`: it is worked out from its own person's id. */
export const saltProblem = (safe: SafeRecord): string => {
  if (typeof safe.person !== "string") return `no person to work the salt from, but ${String(safe.person)}`;
  const saltNonce = saltNonceOf(local.namespace, safe.person);
  return safe.saltNonce === saltNonce ? "" : `salt nonce ${String(safe.saltNonce)}, but keccak256("${local.namespace}:${safe.person}") is ${saltNonce}`;
};

/**
 * What is wrong with a claimed Safe, or `""`: its salt nonce is its person's, its signer is checksummed, its first
 * owner is that signer on the local chain, and its account is the factory's address for that one owner and the salt
 * nonce, on the local chain. A journey checks `""`, so a failure names what it expected.
 */
export const claimProblem = (safe: SafeRecord): string => {
  const salt = saltProblem(safe);
  if (salt !== "") return salt;
  if (typeof safe.signer !== "string" || safe.signer !== checksummed(safe.signer)) return `signer ${String(safe.signer)} is not a checksummed address`;
  const owner = `${local.chain}:${safe.signer}`;
  if (safe.firstOwner !== owner) return `first owner ${String(safe.firstOwner)}, but the signer on ${local.chain} is ${owner}`;
  const expected = `${local.chain}:${predictAddress(safe.signer, safe.saltNonce as bigint)}`;
  return safe.account === expected ? "" : `account ${String(safe.account)}, but the factory gives ${expected} for owner ${safe.signer} and salt nonce ${String(safe.saltNonce)}`;
};
