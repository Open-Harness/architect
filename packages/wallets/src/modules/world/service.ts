import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { Effect, Option, Redacted } from "effect";
import { DeviceWorld } from "@orthograph/language-effect/device";
import { Keys, type Address, type Hex, type Key } from "@orthograph/chain-evm/device";
import { Chain } from "../chain/service.ts";
import { Keyfile } from "../keyfile/service.ts";
import { Keystore } from "../keystore/service.ts";
import { Signers } from "../signer/service.ts";
import type { Eip1193, Signer, SignerName } from "../signer/types.ts";
import type { ChainSetting } from "../chain/types.ts";
import { testProvider } from "./internal/provider.ts";
import type { WorldHostApi } from "./types.ts";

type Store = Map<string, { readonly secret: Redacted.Redacted<Hex>; readonly address: Address }>;

/** The browser's provider is made once per world, by an effect: `remember` keeps the cell it fills. */
interface Cell { provider: Eip1193 | undefined }

export const WorldHost: WorldHostApi = {
  signer: (name: SignerName) =>
    Effect.gen(function* () {
      const world = yield* DeviceWorld;
      const chainId = world.chain?.chainId ?? 1;
      const chain: ChainSetting = { chainId, rpcUrl: world.chain?.rpcUrl, depth: Chain.depthOf(chainId, world.chain?.depth) };
      switch (name) {
        case "node": {
          // What the world locks its keystore folder with is its own, made once and never shown.
          const passphrase = world.remember("passphrase", () => Redacted.make(randomBytes(24).toString("hex")));
          return Signers.keyed(name, chain, Keyfile.keyring({ directory: join(world.directory, "node"), passphrase: Option.some(passphrase), cost: Keystore.cost.light }));
        }
        case "keystore":
          return Signers.keyed(name, chain, Signers.memory(world.remember<Store>("keystore", () => new Map())));
        case "world":
          return Signers.keyed(name, chain, Signers.memory(world.remember<Store>("world", () => new Map())));
        case "browser": {
          const cell = world.remember<Cell>("browser", () => ({ provider: undefined }));
          if (cell.provider === undefined) {
            const funded = world.chain?.keys["browser"];
            const keys: Array<Key> = [yield* Effect.flatMap(Keys.generate, Keys.fromSecret).pipe(Effect.orDie)];
            if (funded !== undefined) keys.push(yield* Keys.fromSecret(funded).pipe(Effect.orDie));
            cell.provider = testProvider(chain, keys);
          }
          return Signers.provided(name, chain, cell.provider, Signers.labelsInMemory(world.remember("browser-labels", () => new Map<string, string>())));
        }
      }
    }) satisfies Effect.Effect<Signer, never, DeviceWorld>,
};
