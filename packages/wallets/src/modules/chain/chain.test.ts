import { ConfigProvider, Effect } from "effect";
import { TimersLive } from "@orthograph/language-effect/device";
import { describe, expect, it } from "vitest";
import { Chain } from "./service.ts";

const read = (env: Record<string, string>) => Chain.fromHost.pipe(Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnvRecord(env))), Effect.runPromise);

describe("Chain.fromHost", () => {
  it("is eip155:1 with no endpoint when the host says nothing", async () => {
    expect(await read({})).toEqual({ chainId: 1, rpcUrl: undefined, depth: undefined });
  });

  it("reads the CAIP-2 chain and the endpoint", async () => {
    expect(await read({ ORTHO_WALLET_CHAIN: "eip155:31337", ORTHO_WALLET_RPC_URL: "http://127.0.0.1:8545" })).toEqual({ chainId: 31337, rpcUrl: "http://127.0.0.1:8545", depth: 1 });
  });

  it("a chain that is not EIP-155 CAIP-2 is a defect naming the variable", async () => {
    await expect(read({ ORTHO_WALLET_CHAIN: "solana:mainnet" })).rejects.toThrow(/ORTHO_WALLET_CHAIN/);
  });

  it("a send with no endpoint is a defect naming the variable", async () => {
    await expect(Chain.port({ chainId: 1, rpcUrl: undefined, depth: 1 }).pipe(Effect.provide(TimersLive), Effect.runPromise)).rejects.toThrow(/ORTHO_WALLET_RPC_URL/);
  });

  it("takes the depth a host declares; the local chain is 1 without it, another chain has none", async () => {
    expect((await read({ ORTHO_WALLET_CHAIN: "eip155:11155111", ORTHO_WALLET_DEPTH: "3" })).depth).toBe(3);
    expect((await read({ ORTHO_WALLET_CHAIN: "eip155:31337", ORTHO_WALLET_DEPTH: "2" })).depth).toBe(2);
    expect((await read({ ORTHO_WALLET_CHAIN: "eip155:31337" })).depth).toBe(1);
    expect((await read({ ORTHO_WALLET_CHAIN: "eip155:1" })).depth).toBeUndefined();
  });

  it.each(["0", "-1", "1.5", "three"])("a depth of %j is a defect naming the variable", async (value) => {
    await expect(read({ ORTHO_WALLET_CHAIN: "eip155:31337", ORTHO_WALLET_DEPTH: value })).rejects.toThrow(/ORTHO_WALLET_DEPTH/);
  });
});
