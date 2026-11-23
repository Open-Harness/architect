// The device prove stands in for (M1.29, K7 Q7): when a plugin runs operations on the device, the world gets a chain (Anvil
// as a process, always silent), a funded key for each host the journeys can name, and a folder of its own.
import { mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect, Redacted, type Scope } from "effect";
import { Names } from "orthograph/server";
import { Anvil } from "@orthograph/chain-evm";
import { TimersLive } from "@orthograph/language-effect";
import type { Model } from "@orthograph/compiler";
import type { DeviceHost } from "#modules/journeys/types.js";
import { WorldFailed, type ChainStand } from "#modules/world/types.js";

/** The hosts a wallet's key can live on (K7 F4, F5): a funded key for each, then one more account, the payee's. */
const HOSTS = ["node", "browser", "keystore", "world"] as const;

/**
 * What the device's chain declares for confirmation (M1.38): depth three, a block a second. A journey can't name its chain and
 * a plugin can't ship a starting world, so the one chain every device journey meets is the deep one: each send in a
 * journey waits for three blocks, which is what a real chain asks of it, and the wallet's depth-three story is the common case.
 */
const DEPTH = 3;
const BLOCK_SECONDS = 1;

/** Whether a mounted plugin runs operations on the device, so that its journeys need a device and a chain to run on. */
export const needsDevice = (model: Model) => Object.values(model.operations).some((op) => op.runs === "client" && op.from.kind !== "app");

/**
 * The world's chain, when the plugins need one: Anvil as a process of the world's scope. Without Foundry's `anvil` on the
 * path the world has none, and says so; the journeys that need a key then fail naming `world.chain`, not the world.
 */
export const standChain = (model: Model): Effect.Effect<{ readonly chain: ChainStand | undefined; readonly notes: ReadonlyArray<string> }, never, Scope.Scope> =>
  needsDevice(model)
    ? Anvil.start({ accounts: HOSTS.length + 1, blockTime: BLOCK_SECONDS }).pipe(
      Effect.provide(TimersLive),
      Effect.map((anvil) => ({ chain: { rpcUrl: anvil.rpcUrl, chainId: anvil.chainId, accounts: anvil.accounts } as ChainStand | undefined, notes: [] as ReadonlyArray<string> })),
      Effect.catch((failed) => Effect.succeed({ chain: undefined, notes: [`world chain: none, ${failed.message} (the plugins here run on a device and some journeys need a chain)`] })),
    )
    : Effect.succeed({ chain: undefined, notes: [] });

const account = (chainId: number, address: string) => `eip155:${chainId}:${address}`;

/** The device for a run: what its `world` entries are given, and what the journeys read of the world. */
export const deviceHost = (root: string, otlp: string | undefined, chain: ChainStand | undefined): Effect.Effect<DeviceHost, WorldFailed, Scope.Scope> =>
  Effect.gen(function* () {
    const directory = resolve(root, Names.folder, "prove-device");
    // Fresh each run, and gone when the world is: a keystore file made here never outlives it.
    yield* Effect.acquireRelease(
      Effect.sync(() => { rmSync(directory, { recursive: true, force: true }); mkdirSync(directory, { recursive: true, mode: 0o700 }); }),
      () => Effect.sync(() => rmSync(directory, { recursive: true, force: true })),
    ).pipe(Effect.mapError(() => new WorldFailed({ message: `${directory} could not be made` })));
    const kept = new Map<string, unknown>();
    const accounts = chain?.accounts ?? [];
    const keys = Object.fromEntries(HOSTS.flatMap((host, i) => (accounts[i] === undefined ? [] : [[host, accounts[i].privateKey] as const])));
    const given = chain === undefined || accounts.length < HOSTS.length + 1
      ? {}
      : {
        chain: {
          // A secret key for the hosts that hold them; for the browser, the account its provider holds.
          keys: Object.fromEntries(HOSTS.map((host, i) => [host, host === "browser" ? account(chain.chainId, accounts[i]!.address) : Redacted.value(accounts[i]!.privateKey)])),
          payee: account(chain.chainId, accounts[HOSTS.length]!.address),
        },
      };
    return {
      otlp,
      service: "prove-device",
      given,
      world: {
        chain: chain === undefined ? undefined : { rpcUrl: chain.rpcUrl, chainId: chain.chainId, keys, depth: DEPTH },
        directory: join(directory),
        remember: <A>(key: string, make: () => A) => {
          if (!kept.has(key)) kept.set(key, make());
          return kept.get(key) as A;
        },
      },
    };
  });
