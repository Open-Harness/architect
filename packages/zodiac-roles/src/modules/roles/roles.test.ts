// #1163 (A4), the checks with no chain: the modifier's deployment worked out, a member's call, the Org Budget's calls, the
// allowance's accrual and the typed refusals. Every expected value is written out here from Roles 2.1.1's ABI
// (@gnosis-guild/zodiac 5.0.1, abis/roles/2.1.1), ModuleProxyFactory.sol (@gnosis-guild/zodiac-core 4.3.1) and Roles'
// own rules, never read back from the output that is judged. Calldata is encoded and decoded with chain-evm's `Abi`
// from the functions written out below.
import { Effect } from "effect";
import { decodeRevert, type AbiError, type Address, type ChainError, type Hex } from "@orthograph/chain-evm/device";
import { describe, expect, test } from "vitest";
import { checksum, create2, encode, fn, hex, keccak, selector, utf8, word } from "./internal/fixtures/evm.ts";
import { Roles } from "./service.ts";
import { MODULE_PROXY_FACTORY, ROLES_MASTERCOPY, type Allowance } from "./types.ts";

const safe: Address = "0x5afe00000000000000000000000000000000cafe";
const modifier: Address = "0x0000000000000000000000000000000000000d01";
const tokenAddress: Address = "0x00000000000000000000000000000000000070c3";
const alice: Address = "0x00000000000000000000000000000000000a11ce";
const bob: Address = "0x0000000000000000000000000000000000000b0b";
const member: Address = "0x000000000000000000000000000000000000beef";
const roleKey = keccak(utf8("org-budget"));
const allowanceKey = keccak(utf8("org-budget:usdc"));
const transfer = fn("transfer", [["address", "to"], ["uint256", "value"]], [["bool"]]);

// Roles 2.1.1's own functions, as its ABI has them, and the factory's.
const roles = {
  setUp: fn("setUp", [["bytes", "initParams"]]),
  execTransactionWithRole: fn("execTransactionWithRole", [
    ["address", "to"], ["uint256", "value"], ["bytes", "data"], ["uint8", "operation"], ["bytes32", "roleKey"], ["bool", "shouldRevert"],
  ], [["bool", "success"]]),
};
const deployModule = fn("deployModule", [["address", "masterCopy"], ["bytes", "initializer"], ["uint256", "saltNonce"]], [["address", "proxy"]]);

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);
const fails = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.flip(effect));

describe("the canonical addresses", () => {
  test("the factory and the Roles 2.1.1 mastercopy are at Zodiac's canonical addresses", () => {
    expect(MODULE_PROXY_FACTORY).toBe("0x000000000000aDdB49795b0f9bA5BC298cDda236");
    expect(ROLES_MASTERCOPY).toBe("0xF2964CE6161ce0e75964Fe7927cE114cb0B283D5");
  });
});

describe("Roles.deploy", () => {
  // ModuleProxyFactory.deployModule: salt = keccak256(keccak256(initializer) ++ saltNonce), the EIP-1167 proxy of the mastercopy, CREATE2 by the factory.
  const expected = (owner: Address, saltNonce: bigint) => Effect.gen(function* () {
    const initializer = yield* encode(roles.setUp, [hex(word(BigInt(owner)), word(BigInt(owner)), word(BigInt(owner)))]);
    const salt = keccak(hex(keccak(initializer), word(saltNonce)));
    const proxy = hex("602d8060093d393df3363d3d373d3d3d363d73", ROLES_MASTERCOPY, "5af43d82803e903d91602b57fd5bf3");
    return {
      address: create2(MODULE_PROXY_FACTORY, salt, proxy),
      call: { to: MODULE_PROXY_FACTORY, value: 0n, data: yield* encode(deployModule, [ROLES_MASTERCOPY, initializer, saltNonce]) },
    };
  });

  test("a Safe's modifier: owner, avatar and target all the Safe, its address worked out before it is deployed", async () => {
    expect(await run(Roles.deploy({ safe, saltNonce: 1n }))).toEqual(await run(expected(safe, 1n)));
  });

  test("the address changes with the Safe and with the salt nonce, and with nothing else", async () => {
    const [a, b, c, again] = await run(Effect.all([
      Roles.deploy({ safe, saltNonce: 1n }), Roles.deploy({ safe: alice, saltNonce: 1n }),
      Roles.deploy({ safe, saltNonce: 2n }), Roles.deploy({ safe, saltNonce: 1n }),
    ]));
    expect(b).toEqual(await run(expected(alice, 1n)));
    expect(c).toEqual(await run(expected(safe, 2n)));
    expect(new Set([a.address, b.address, c.address]).size).toBe(3);
    expect(again).toEqual(a);
  });

  test("every bit of the salt nonce counts: 0, 256, 2^64 + 1 and 2^256 - 1", async () => {
    const nonces = [0n, 256n, 2n ** 64n + 1n, 2n ** 256n - 1n];
    const made = await run(Effect.forEach(nonces, (saltNonce) => Roles.deploy({ safe, saltNonce })));
    expect(made).toEqual(await run(Effect.forEach(nonces, (saltNonce) => expected(safe, saltNonce))));
    expect(new Set(made.map((deployment) => deployment.address)).size).toBe(nonces.length);
  });
});

describe("Roles.execTransactionWithRole", () => {
  test("a member's call through its role, a Call (operation 0) on the modifier, with value 0 and shouldRevert true by default", async () => {
    const data = await run(encode(transfer, [alice, 7n]));
    expect(await run(Roles.execTransactionWithRole(modifier, { to: tokenAddress, data, roleKey }))).toEqual({
      to: modifier, value: 0n, data: await run(encode(roles.execTransactionWithRole, [tokenAddress, 0n, data, 0, roleKey, true])),
    });
  });

  test("the value and shouldRevert given are the ones sent, and the call itself sends no wei to the modifier", async () => {
    expect(await run(Roles.execTransactionWithRole(modifier, { to: bob, data: "0x", value: 5n, roleKey, shouldRevert: false }))).toEqual({
      to: modifier, value: 0n, data: await run(encode(roles.execTransactionWithRole, [bob, 5n, "0x", 0, roleKey, false])),
    });
    expect(await run(Roles.execTransactionWithRole(modifier, { to: bob, data: "0x", value: 10n ** 18n + 1n, roleKey }))).toEqual({
      to: modifier, value: 0n, data: await run(encode(roles.execTransactionWithRole, [bob, 10n ** 18n + 1n, "0x", 0, roleKey, true])),
    });
  });
});

describe("Roles.accrued", () => {
  // Roles 2.1.1's accrual: before a whole period has passed since `timestamp`, the balance; after, the balance plus `refill`
  // for each whole period, capped at `maxRefill`; a balance already at or over `maxRefill` stays as it is.
  const at = (balance: bigint, timestamp = 1_000n): Allowance => ({ refill: 50n, maxRefill: 120n, period: 3600n, balance, timestamp });
  test.each([
    ["no period: the balance, however long", { ...at(30n), period: 0n }, 1_000_000n, 30n],
    ["inside the first period", at(30n), 1_000n + 3599n, 30n],
    ["one whole period", at(30n), 1_000n + 3600n, 80n],
    ["one and a half periods: one refill", at(30n), 1_000n + 5400n, 80n],
    ["two whole periods, capped at maxRefill", at(30n), 1_000n + 7200n, 120n],
    ["at maxRefill already", at(120n), 1_000n + 36_000n, 120n],
    ["over maxRefill (an owner set it so): it stays", at(500n), 1_000n + 36_000n, 500n],
    ["spent to 0, three periods", at(0n), 1_000n + 10_800n, 120n],
    ["spent to 0, one period", at(0n), 1_000n + 3600n, 50n],
    ["a timestamp an owner set in the future: the balance until a period after it", at(30n, 10_000n), 1_000n, 30n],
    ["amounts over 2^53, exact", { refill: 1n, maxRefill: 10n ** 19n, period: 1n, balance: 10n ** 18n + 1n, timestamp: 0n }, 1n, 10n ** 18n + 2n],
  ] as const)("%s", (_name, allowance, now, balance) => {
    expect(Roles.accrued(allowance, now)).toBe(balance);
  });
});

// Roles 2.1.1's errors, from its ABI, and its Status enum in order.
const errors: ReadonlyArray<readonly [name: string, inputs: ReadonlyArray<readonly [string, string]>]> = [
  ["AlreadyDisabledModule", [["address", "module"]]], ["AlreadyEnabledModule", [["address", "module"]]], ["ArraysDifferentLength", []],
  ["CalldataOutOfBounds", []], ["ConditionViolation", [["uint8", "status"], ["bytes32", "info"]]], ["FunctionSignatureTooShort", []],
  ["HashAlreadyConsumed", [["bytes32", ""]]], ["InvalidInitialization", []], ["InvalidModule", [["address", "module"]]], ["InvalidPageSize", []],
  ["MalformedMultiEntrypoint", []], ["ModuleTransactionFailed", []], ["NoMembership", []], ["NotAuthorized", [["address", "sender"]]],
  ["NotInitializing", []], ["OwnableInvalidOwner", [["address", "owner"]]], ["OwnableUnauthorizedAccount", [["address", "account"]]],
  ["SetupModulesAlreadyCalled", []],
];
const statuses = [
  "Ok", "DelegateCallNotAllowed", "TargetAddressNotAllowed", "FunctionNotAllowed", "SendNotAllowed", "OrViolation",
  "NorViolation", "ParameterNotAllowed", "ParameterLessThanAllowed", "ParameterGreaterThanAllowed", "ParameterNotAMatch",
  "NotEveryArrayElementPasses", "NoArrayElementPasses", "ParameterNotSubsetOfAllowed", "BitmaskOverflow", "BitmaskNotAllowed",
  "CustomConditionViolation", "AllowanceExceeded", "CallAllowanceExceeded", "EtherAllowanceExceeded",
] as const;
const signature = (name: string, inputs: ReadonlyArray<readonly [string, string]>) => `${name}(${inputs.map(([type]) => type).join(",")})`;
/** A revert's data by hand: the error's selector, then its arguments as words. */
const revertData = (name: string, ...words: ReadonlyArray<string>) => {
  const inputs = errors.find(([candidate]) => candidate === name)?.[1] ?? [];
  return hex(selector(signature(name, inputs)), ...words);
};
const reverted = (data: Hex): Promise<ChainError> => fails(decodeRevert(data, modifier, Roles.refusals));

describe("Roles.refusals", () => {
  test("one entry for each of Roles 2.1.1's errors, by its name and signature, each with a code of its own", () => {
    expect(Roles.refusals.map((entry) => [entry.name, entry.signature, entry.selector.toLowerCase()]).sort()).toEqual(
      errors.map(([name, inputs]) => [name, signature(name, inputs), selector(signature(name, inputs))]).sort(),
    );
    const codes = Roles.refusals.map((entry) => entry.code);
    expect(new Set(codes).size).toBe(errors.length);
    for (const code of codes) expect(code).toMatch(/\S/);
  });
});

describe("Roles.refusalOf", () => {
  const info = word(42n);
  test.each(statuses.map((status, index) => [status, index] as const))("ConditionViolation, status %s (%i), typed by name", async (status, index) => {
    expect(Roles.refusalOf(await reverted(revertData("ConditionViolation", word(BigInt(index)), info)))).toEqual({
      _tag: "ConditionViolation", status, info: hex(info),
    });
  });

  test("the info word is the one the modifier sent", async () => {
    expect(Roles.refusalOf(await reverted(revertData("ConditionViolation", word(17n), allowanceKey)))).toEqual({
      _tag: "ConditionViolation", status: "AllowanceExceeded", info: allowanceKey,
    });
  });

  test("NoMembership, NotAuthorized with its sender, ModuleTransactionFailed and OwnableUnauthorizedAccount with its account", async () => {
    const typed = async (name: string, ...words: ReadonlyArray<string>) => Roles.refusalOf(await reverted(revertData(name, ...words)));
    expect(await typed("NoMembership")).toEqual({ _tag: "NoMembership" });
    expect(await typed("NotAuthorized", word(BigInt(member)))).toEqual({ _tag: "NotAuthorized", sender: checksum(member) });
    expect(await typed("ModuleTransactionFailed")).toEqual({ _tag: "ModuleTransactionFailed" });
    expect(await typed("OwnableUnauthorizedAccount", word(BigInt(bob)))).toEqual({ _tag: "OwnableUnauthorizedAccount", account: checksum(bob) });
  });

  const typedNames = ["ConditionViolation", "NoMembership", "NotAuthorized", "ModuleTransactionFailed", "OwnableUnauthorizedAccount"];
  test.each(errors.filter(([name]) => !typedNames.includes(name)).map(([name, inputs]) => [name, inputs.length] as const))(
    "the modifier's %s is not one of the typed refusals", async (name, inputs) => {
      expect(Roles.refusalOf(await reverted(revertData(name, ...Array.from({ length: inputs }, () => word(1n)))))).toBeUndefined();
    },
  );

  test("another contract's error of the same name as one of the modifier's is not the modifier's", async () => {
    const foreign: AbiError = { type: "error", name: "NoMembership", inputs: [{ type: "uint256", name: "id" }] };
    const lock = [...Roles.refusals, { code: "X-1", name: "NoMembership", selector: selector("NoMembership(uint256)"), signature: "NoMembership(uint256)", abi: foreign }];
    const theirs = await fails(decodeRevert(hex(selector("NoMembership(uint256)"), word(7n)), tokenAddress, lock));
    expect(theirs).toMatchObject({ _tag: "ChainRefusal", name: "NoMembership", code: "X-1" });
    expect(Roles.refusalOf(theirs)).toBeUndefined();
  });

  test("a status the enum does not have, another contract's refusal and a fault are not the modifier's refusals", async () => {
    expect(Roles.refusalOf(await reverted(revertData("ConditionViolation", word(20n), info)))).toBeUndefined();
    const insufficient: AbiError = {
      type: "error", name: "InsufficientBalance",
      inputs: [{ type: "uint256", name: "available" }, { type: "uint256", name: "requested" }],
    };
    const lock = [...Roles.refusals, {
      code: "TOKEN-001", name: "InsufficientBalance", selector: selector("InsufficientBalance(uint256,uint256)"),
      signature: "InsufficientBalance(uint256,uint256)", abi: insufficient,
    }];
    const theirs = await fails(decodeRevert(hex(selector("InsufficientBalance(uint256,uint256)"), word(1n), word(2n)), tokenAddress, lock));
    expect(theirs).toMatchObject({ _tag: "ChainRefusal", name: "InsufficientBalance" });
    expect(Roles.refusalOf(theirs)).toBeUndefined();
    expect(Roles.refusalOf(await reverted("0xdeadbeef"))).toBeUndefined();
  });
});
