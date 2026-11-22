// What the Anvil checks of the runtime modules share (written by the checks author, ST2.02). The ERC-20 ABI and the stand-in's
// bytecode are `erc20`'s own files, read as data: this package never imports `@orthograph/erc20` (that one imports this).
import { readFileSync } from "node:fs";
import { Effect, Scope } from "effect";
import type { Address, Key } from "@orthograph/chain-evm";
import { Contract, ContractChain } from "../src/main.ts";
import type { AbiErrorItem, AbiEventItem, AbiFunctionItem, AbiItem, ErrorBinding } from "../src/main.ts";
import { deployByHand, startWorld, type TestWorld } from "../src/testing.ts";

export const anvilOn = process.env["ORTHO_CHAIN_EVM_ANVIL"] === "1";

const read = (path: string): unknown => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
/** `erc20/abi.json`: the ERC-20 standard's functions and events and OpenZeppelin 5's ERC-6093 errors. */
export const erc20Abi = read("../../erc20/abi.json") as ReadonlyArray<AbiItem>;
export const tokenBytecode = (read("../../erc20/stand-in/bytecode.json") as { bytecode: `0x${string}` }).bytecode;
/** A contract that disagrees with `erc20Abi` in four planted ways: see fixtures/Broken.sol. */
export const brokenBytecode = (read("./fixtures/broken.json") as { bytecode: `0x${string}` }).bytecode;

export const fn = (name: string): AbiFunctionItem => {
  const item = erc20Abi.find((i): i is AbiFunctionItem => i.type === "function" && i.name === name);
  if (item === undefined) throw new Error(`erc20 abi has no function ${name}`);
  return item;
};
export const ev = (name: string): AbiEventItem => {
  const item = erc20Abi.find((i): i is AbiEventItem => i.type === "event" && i.name === name);
  if (item === undefined) throw new Error(`erc20 abi has no event ${name}`);
  return item;
};
/** The six ERC-6093 errors as bindings whose "class" is a plain tagged object, so these checks stand without `erc20`'s classes. */
export const bindings: ReadonlyArray<ErrorBinding<{ readonly _tag: string }>> = erc20Abi
  .filter((i): i is AbiErrorItem => i.type === "error")
  .map((item) => ({ code: `erc20.${item.name}`, item, make: (fields) => ({ _tag: item.name, ...fields }) }));

export interface Deployed {
  readonly world: TestWorld;
  readonly deployer: Key;
  readonly other: Key;
  readonly address: Address;
  /** The contract's chain, signed by the deployer (a write needs one) or, with `signer: false`, by no one. */
  readonly chain: (signer?: boolean) => Effect.Effect<typeof ContractChain.Service>;
}

/** A world with `bytecode` deployed by the first funded key, and a port that decodes the ERC-6093 errors at that address. */
export const deployedWorld = (bytecode: `0x${string}`, refusals = true): Effect.Effect<Deployed, unknown, Scope.Scope> =>
  Effect.gen(function* () {
    const world = yield* startWorld;
    const [deployer, other] = world.keys;
    if (deployer === undefined || other === undefined) return yield* Effect.die("the world made fewer than two keys");
    const address = yield* deployByHand(yield* world.port(), deployer, bytecode);
    const port = yield* world.port(refusals ? yield* Contract.refusals(bindings, address) : []);
    return {
      world, deployer, other, address,
      chain: (signer = true) => Effect.succeed({ port, address, ...(signer ? { signer: deployer.signer } : {}) }),
    };
  });

/** Run an effect against the deployed contract's chain (the deployer signs), in a world that is gone when it ends. */
export const onChain = <A, E>(
  bytecode: `0x${string}`, body: (d: Deployed) => Effect.Effect<A, E, ContractChain>, options: { readonly signer?: boolean; readonly refusals?: boolean } = {},
) => Effect.runPromise(Effect.scoped(Effect.gen(function* () {
  const deployed = yield* deployedWorld(bytecode, options.refusals ?? true);
  return yield* body(deployed).pipe(Effect.provideService(ContractChain, yield* deployed.chain(options.signer ?? true)));
})));
