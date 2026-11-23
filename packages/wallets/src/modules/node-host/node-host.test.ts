import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigProvider, Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { KeyLocked } from "../../../blueprint/things/wallet/errors.js";
import { Operations } from "../operations/service.ts";
import { NodeHost } from "./service.ts";

const homes: Array<string> = [];
afterAll(() => { for (const h of homes) rmSync(h, { recursive: true, force: true }); });

/** The five operations on the Node host, with the environment the test gives. */
const on = (env: Record<string, string>) => {
  const ops = Operations.on(NodeHost.signer);
  const provide = <A, E>(effect: Effect.Effect<A, E>) => effect.pipe(Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnvRecord(env))), Effect.runPromise);
  return { ops, provide };
};
const home = () => { const h = mkdtempSync(join(tmpdir(), "ortho-node-host-")); homes.push(h); return h; };
const account = /^eip155:31337:0x[0-9a-fA-F]{40}$/;

describe("NodeHost", () => {
  it("makes, lists and signs with keys in an encrypted keystore folder, as CAIP-10 accounts on the host's chain", async () => {
    const { ops, provide } = on({ ORTHO_WALLET_HOME: home(), ORTHO_WALLET_PASSPHRASE: "correct horse", ORTHO_WALLET_CHAIN: "eip155:31337" });
    const made = await provide(ops.create({ signer: "node", label: "demo" }));
    expect(made.account).toMatch(account);
    expect(await provide(ops.create({ signer: "node", label: "demo" }))).toEqual(made);
    expect((await provide(ops.keys({ signer: "node" }))).accounts).toBe(made.account);
    expect((await provide(ops.sign({ signer: "node", label: "demo", message: "hello" }))).signature).toMatch(/^0x[0-9a-fA-F]{130}$/);
  }, 30_000);

  it("is locked with no passphrase: it lists and signs nothing, and says KeyLocked", async () => {
    const dir = home();
    const unlocked = on({ ORTHO_WALLET_HOME: dir, ORTHO_WALLET_PASSPHRASE: "pw" });
    await unlocked.provide(unlocked.ops.create({ signer: "node", label: "demo" }));
    const locked = on({ ORTHO_WALLET_HOME: dir });
    expect((await locked.provide(locked.ops.keys({ signer: "node" }))).count).toBe(1n);
    expect(await locked.provide(Effect.flip(locked.ops.sign({ signer: "node", label: "demo", message: "x" })))).toBeInstanceOf(KeyLocked);
  }, 30_000);

  it("has no browser wallet, server key store or world here: each refuses as KeyLocked", async () => {
    const { ops, provide } = on({ ORTHO_WALLET_HOME: home() });
    for (const signer of ["browser", "keystore", "world"]) {
      expect(await provide(Effect.flip(ops.keys({ signer })))).toBeInstanceOf(KeyLocked);
      expect(await provide(Effect.flip(ops.create({ signer, label: "x" })))).toBeInstanceOf(KeyLocked);
    }
  });
});
