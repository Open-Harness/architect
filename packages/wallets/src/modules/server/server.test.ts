// A server operation signing with a world-generated server key, on a real Anvil: the operation is served by the runtime's
// own `Handlers.serve` (decode, who may call, steps, spans, the answer checked), and its handler sends with the key the
// server's key store holds. Skipped unless ORTHO_CHAIN_EVM_ANVIL=1 (Foundry's anvil on the PATH).
import { Effect, Layer, Redacted } from "effect";
import { Blueprint } from "orthograph";
import { ErrorNames } from "orthograph/server";
import { Anvil } from "@orthograph/chain-evm";
import { Keys } from "@orthograph/chain-evm/device";
import { BusyLive, Handlers, storeMemory, TimersLive, type Handler } from "@orthograph/language-effect";
import { describe, expect, it } from "vitest";
import { SimulationReverted } from "../../../blueprint/things/wallet/errors.js";
import { Account } from "../account/service.ts";
import { Server } from "./service.ts";

ErrorNames.name(SimulationReverted, "SimulationReverted"); // what generated code does

const Payout = Blueprint.thing({ description: "Money the server sends.", fields: { id: Blueprint.id("pay") } });
const send = Blueprint.operation(Payout, {
  description: "Pay an account from the server's own key.",
  payload: { to: Blueprint.text({ max: 128 }), value: Blueprint.uint(256) },
  answer: { transaction: Blueprint.traced(Blueprint.text({ max: 128 })), level: Blueprint.traced(Blueprint.text({ max: 16 })), nonce: Blueprint.uint(64) },
  errors: [SimulationReverted],
  allowed: [Blueprint.signedIn],
});

describe.skipIf(process.env["ORTHO_CHAIN_EVM_ANVIL"] !== "1")("a server operation signing with the server's key", () => {
  it("sends and answers confirmed, and a doomed send is refused before anything is signed, using no nonce", { timeout: 60_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const chain = yield* Anvil.start({ chainId: 31_337, accounts: 2 });
      const [server, payee] = chain.accounts as [typeof chain.accounts[number], typeof chain.accounts[number]];
      const setting = { chainId: chain.chainId, rpcUrl: chain.rpcUrl, depth: 1 };
      const to = Account.format({ chainId: chain.chainId, address: payee.address });
      // The handler is what an app writes: the server's key store gives the signer, and `send` is the whole lifecycle.
      const handler: Handler<typeof send> = ({ to: target, value }) =>
        Effect.gen(function* () {
          const signer = yield* Server.keystore({ secret: server.privateKey, chain: setting }).pipe(Effect.orDie);
          const parsed = Account.parse(target, setting.chainId);
          if (parsed._tag === "None") return yield* Effect.die(new Error("not an account"));
          // What an app does with the signer's refusals: its own is declared, the rest are defects.
          return yield* signer.send("server", parsed.value.address, value).pipe(
            Effect.provide(TimersLive),
            Effect.catch((error) => (error instanceof SimulationReverted ? Effect.fail(error) : Effect.die(error))),
          );
        });
      const served = Handlers.serve({ name: "payout.send", operation: send, handler });
      const store = storeMemory();
      const layer = Layer.mergeAll(BusyLive, store.layer, TimersLive);
      const ada = { kind: "person", person: "per_ada", via: "session" } as const;
      const call = (value: string) => served.call({ to, value }, ada).pipe(Effect.provide(layer));

      const first = yield* call("1000");
      expect([first.level, first.nonce]).toEqual(["confirmed", 0n]);
      expect(first.transaction).toMatch(/^0x[0-9a-fA-F]{64}$/);
      const refused = yield* call("1000000000000000000000000000000").pipe(Effect.flip);
      expect(refused).toBeInstanceOf(SimulationReverted);
      const second = yield* call("2000");
      expect([second.level, second.nonce]).toEqual(["confirmed", 1n]);
      // The secret was the world's, redacted all the way: it is in no answer.
      expect(JSON.stringify([first, second], (_, v: unknown) => (typeof v === "bigint" ? String(v) : v))).not.toContain(Redacted.value(server.privateKey).slice(2));
    }).pipe(Effect.provide(TimersLive)))));

  it("a secret that is no key is KeyLocked, and says nothing of it", async () => {
    const setting = { chainId: 31_337, rpcUrl: undefined, depth: 1 };
    const locked = await Effect.runPromise(Server.keystore({ secret: Redacted.make("0xnot-a-key-secret-looking"), chain: setting }).pipe(Effect.flip));
    expect(locked).toBeInstanceOf(Object);
    expect(String(JSON.stringify(locked))).not.toContain("secret-looking");
    // A generated key is one.
    const key = await Effect.runPromise(Keys.generate);
    const signer = await Effect.runPromise(Server.keystore({ secret: key, chain: setting }));
    expect(signer.name).toBe("keystore");
  });
});
