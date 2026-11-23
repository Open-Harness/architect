// The browser signer over a stand-in EIP-1193 provider that holds two real keys: what a page with `window.ethereum` does,
// without a browser. (A real extension is not proved here: ledger PRF-12.)
import { Effect, Redacted } from "effect";
import { Keys, type Key } from "@orthograph/chain-evm/device";
import { afterEach, describe, expect, it } from "vitest";
import { KeyLocked, NoSuchKey } from "../../../blueprint/things/wallet/errors.js";
import { Operations } from "../operations/service.ts";
import { BrowserHost } from "./service.ts";

const page = globalThis as Record<string, unknown>;
afterEach(() => { delete page["ethereum"]; delete page["ORTHOGRAPH_WALLET"]; delete page["localStorage"]; });

const key = () => Effect.runPromise(Effect.flatMap(Keys.generate, Keys.fromSecret));
const text = (hex: string) => new TextDecoder().decode(Uint8Array.from(hex.slice(2).match(/../g) ?? [], (b) => parseInt(b, 16)));

/** A wallet that holds `keys`, signs with them, and declines `declined` requests as EIP-1193 says (code 4001). */
const wallet = (keys: ReadonlyArray<Key>, declined: ReadonlyArray<string> = []) => ({
  request: ({ method, params = [] }: { method: string; params?: ReadonlyArray<unknown> }) => {
    if (declined.includes(method)) return Promise.reject({ code: 4001, message: "User rejected the request" });
    switch (method) {
      case "eth_accounts":
      case "eth_requestAccounts": return Promise.resolve(keys.map((k) => k.address));
      case "personal_sign": return Effect.runPromise(keys.find((k) => k.address === params[1])!.signMessage(text(params[0] as string)));
      default: return Promise.reject({ code: -32601, message: `${method} is not here` });
    }
  },
});
const ops = Operations.on(BrowserHost.signer);
const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect);

describe("BrowserHost", () => {
  it("takes the next account its wallet offers for create, binds an account it holds for import, and signs with the wallet", async () => {
    const [fresh, funded] = [await key(), await key()];
    page["ethereum"] = wallet([fresh, funded]);
    page["ORTHOGRAPH_WALLET"] = { ORTHO_WALLET_CHAIN: "eip155:31337" };
    const made = await run(ops.create({ signer: "browser", label: "fresh" }));
    expect(made.account).toBe(`eip155:31337:${fresh.address}`);
    expect((await run(ops.create({ signer: "browser", label: "fresh" }))).account, "create is the same for a label it has").toBe(made.account);
    expect((await run(ops.keys({ signer: "browser" }))).count).toBe(1n);
    const imported = await run(ops.import({ signer: "browser", label: "funded", source: `eip155:31337:${funded.address}` }));
    expect(imported.account).toBe(`eip155:31337:${funded.address}`);
    expect((await run(ops.keys({ signer: "browser" }))).count).toBe(2n);
    const signed = await run(ops.sign({ signer: "browser", label: "funded", message: "orthograph wallet journey" }));
    expect(signed.signature).toBe(await Effect.runPromise(funded.signMessage("orthograph wallet journey")));
  });

  it("refuses an account the wallet does not hold, a label for another account, a label it has not, and a wallet that says no", async () => {
    const [fresh, funded, stranger] = [await key(), await key(), await key()];
    page["ethereum"] = wallet([fresh, funded]);
    await run(ops.import({ signer: "browser", label: "funded", source: `eip155:1:${funded.address}` }));
    expect(await run(Effect.flip(ops.import({ signer: "browser", label: "x", source: `eip155:1:${stranger.address}` })))).toBeInstanceOf(KeyLocked);
    expect(await run(Effect.flip(ops.import({ signer: "browser", label: "funded", source: `eip155:1:${fresh.address}` })))).toBeInstanceOf(KeyLocked);
    expect(await run(Effect.flip(ops.import({ signer: "browser", label: "y", source: Redacted.value(await Effect.runPromise(Keys.generate)) })))).toBeInstanceOf(KeyLocked);
    expect(await run(Effect.flip(ops.sign({ signer: "browser", label: "nobody", message: "x" })))).toBeInstanceOf(NoSuchKey);
    page["ethereum"] = wallet([fresh, funded], ["personal_sign"]);
    expect(await run(Effect.flip(ops.sign({ signer: "browser", label: "funded", message: "x" })))).toBeInstanceOf(KeyLocked);
  });

  it("keeps its labels in the page's storage when it has some", async () => {
    const [fresh] = [await key()];
    const stored = new Map<string, string>();
    page["localStorage"] = { getItem: (k: string) => stored.get(k) ?? null, setItem: (k: string, v: string) => { stored.set(k, v); } };
    page["ethereum"] = wallet([fresh]);
    await run(ops.create({ signer: "browser", label: "kept" }));
    expect(JSON.parse([...stored.values()][0]!)).toEqual({ kept: fresh.address });
  });

  it("has no wallet without window.ethereum, and no node, keystore or world signer: each refuses as KeyLocked", async () => {
    for (const signer of ["browser", "node", "keystore", "world"]) expect(await run(Effect.flip(ops.keys({ signer })))).toBeInstanceOf(KeyLocked);
  });
});
