// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The address a Safe will have, worked out the way Safe 1.4.1's factory works it out, for the safe-* journeys to judge
// (design/decisions/CX-safe.md, "The address before deploy"). Not a journey: prove reads only the files directly in
// journeys/. The expected values come from the pinned contracts and the formula, never from what a handler answers;
// `tests/safe-address.test.ts` holds this formula to addresses the canonical factory on Base Sepolia gave.
import { encodeFunctionData, encodePacked, getAddress, getContractAddress, hexToBigInt, keccak256, parseAbi, toHex, type Hex } from "viem";
import { SafeSettings } from "../../blueprint/values/safe.ts";

/** Safe 1.4.1, the L2 singleton, with the Safe 4337 module, at their canonical addresses on every EVM chain (CX-safe, `SafeDeployment`). */
export const SafeContracts = {
  factory: "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
  singleton: "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762",
  moduleSetup: "0x2dd68b007B46fBe91B9A7c3EDa5A7a1063cB5b47",
  module4337: "0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226",
} as const;

/**
 * `SafeProxyFactory.proxyCreationCode()` of the canonical 1.4.1 factory, read from Base Sepolia on 26 November 2026
 * (its keccak256 is 0x1856e0ee08399d74e0ea0b03adca210aeade6f748969ac023cdcb4dd62dcaf5f).
 */
export const PROXY_CREATION_CODE: Hex =
  "0x608060405234801561001057600080fd5b506040516101e63803806101e68339818101604052602081101561003357600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806101c46022913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505060ab806101196000396000f3fe608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea264697066735822122003d1488ee65e08fa41e58e888a9865554c535f2c77126a82cb4c0f917f31441364736f6c63430007060033496e76616c69642073696e676c65746f6e20616464726573732070726f7669646564";

const abi = parseAbi([
  "function setup(address[] _owners, uint256 _threshold, address to, bytes data, address fallbackHandler, address paymentToken, uint256 payment, address paymentReceiver)",
  "function enableModules(address[] modules)",
]);
const ZERO = "0x0000000000000000000000000000000000000000";

/** The address in a CAIP-10 account, `eip155:<chain>:0x…`. */
const addressOf = (account: string): Hex => account.split(":")[2] as Hex;

/** `setup([owner], 1, SafeModuleSetup, enableModules([Safe4337Module]), Safe4337Module, 0, 0, 0)`: one owner, the 4337 module on, no payment. */
export const initializer = (owner: Hex): Hex =>
  encodeFunctionData({
    abi, functionName: "setup",
    args: [[owner], 1n, SafeContracts.moduleSetup, encodeFunctionData({ abi, functionName: "enableModules", args: [[SafeContracts.module4337]] }), SafeContracts.module4337, ZERO, 0n, ZERO],
  });

/** CREATE2 from the factory: salt `keccak256(keccak256(initializer) ‖ saltNonce)`, code the proxy's creation code ‖ the singleton as a uint256. */
export const predictAddress = (owner: Hex, saltNonce: bigint): Hex =>
  getContractAddress({
    opcode: "CREATE2",
    from: SafeContracts.factory,
    salt: keccak256(encodePacked(["bytes32", "uint256"], [keccak256(initializer(owner)), saltNonce])),
    bytecode: encodePacked(["bytes", "uint256"], [PROXY_CREATION_CODE, hexToBigInt(SafeContracts.singleton)]),
  });

/** `uint256(keccak256("<namespace>:<id>"))`, the id a person's `per_…` or a company's `com_…`. */
export const saltNonceOf = (namespace: string, id: string): bigint => hexToBigInt(keccak256(toHex(`${namespace}:${id}`)));

const local = SafeSettings.local;

/** The local environment's bootstrap address, as the CAIP-10 account a personal Safe's first owner is. */
export const localBootstrap = `${local.chain}:${getAddress(local.bootstrap)}`;

/**
 * What is wrong with a Safe's record as `safe.get` answers it in the local environment, or `""` when nothing is: its
 * salt nonce is worked out from its own person's or company's id, and its account is the factory's address for its
 * first owner and that salt nonce, on the local chain. A journey checks `""`, so a failure names what it expected.
 */
export const addressProblem = (safe: { readonly kind?: unknown; readonly person?: unknown; readonly company?: unknown; readonly account?: unknown; readonly firstOwner?: unknown; readonly saltNonce?: unknown }): string => {
  const id = safe.kind === "personal" ? safe.person : safe.kind === "company" ? safe.company : undefined;
  if (typeof id !== "string") return `kind ${String(safe.kind)} with no id of its own to work the salt from`;
  if (typeof safe.firstOwner !== "string" || !safe.firstOwner.startsWith(`${local.chain}:0x`)) return `first owner ${String(safe.firstOwner)} is not an account on ${local.chain}`;
  const saltNonce = saltNonceOf(local.namespace, id);
  if (safe.saltNonce !== saltNonce) return `salt nonce ${String(safe.saltNonce)}, but keccak256("${local.namespace}:${id}") is ${saltNonce}`;
  const expected = `${local.chain}:${predictAddress(addressOf(safe.firstOwner), saltNonce)}`;
  return safe.account === expected ? "" : `account ${String(safe.account)}, but the factory gives ${expected} for owner ${safe.firstOwner} and salt nonce ${saltNonce}`;
};
