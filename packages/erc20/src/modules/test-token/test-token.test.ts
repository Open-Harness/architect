// The test token (#1162): deployed into a world's Anvil, an ERC-20 with 6 decimals, like USDC, whose whole supply is the
// deployer's, minted with the standard Transfer from the zero address. Read by the check itself (`testing.ts`). Gated as
// chain-evm's Anvil checks are: ORTHO_CHAIN_EVM_ANVIL=1, which CI sets. Written by the checks author.
import { Effect } from "effect";
import type { Address } from "@orthograph/chain-evm";
import { describe, expect, it } from "vitest";
import { Erc20, TestToken } from "../../main.ts";
import { anvilOn, inWorld, standard } from "./testing.ts";

const anvil = it.skipIf(!anvilOn);
const ZERO: Address = "0x0000000000000000000000000000000000000000";

describe("the test token in a world", () => {
  anvil("deploys with 6 decimals and the whole supply its deployer's, for any supply and deployer", () =>
    inWorld((w) => Effect.gen(function* () {
      const port = yield* w.port();
      const cases = [{ deployer: w.alice, supply: 1_000_000_000_000n }, { deployer: w.bob, supply: 7n }];
      const addresses = new Set<string>();
      for (const { deployer, supply } of cases) {
        const from = (yield* w.head) + 1n;
        const address = yield* TestToken.deploy(port, deployer.signer, { supply });
        addresses.add(address.toLowerCase());
        expect(yield* w.call(address, standard.decimals, [])).toEqual([6]);
        expect(yield* w.call(address, standard.totalSupply, [])).toEqual([supply]);
        for (const key of [w.alice, w.bob, w.carol]) {
          expect(yield* w.call(address, standard.balanceOf, [key.address])).toEqual([key === deployer ? supply : 0n]);
        }
        expect(yield* w.transfers(address, from)).toEqual([{ from: ZERO, to: deployer.address, value: supply }]);
        expect(yield* Erc20.at(port, address).decimals()).toBe(TestToken.decimals);
      }
      expect(addresses.size).toBe(cases.length);
    })), 60_000);
});
