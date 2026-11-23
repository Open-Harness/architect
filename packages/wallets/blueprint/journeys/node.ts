// Journey-author file (M1.28). The builder of @orthograph/wallets (M1.29) never edits it (AGENTS.md, "Journeys and
// checks come first"); see README.md beside it. One story for the node signer: make a key, bring one in, list, sign,
// send and see it confirmed, and be refused before anything is sent when the simulation reverts.
import { Blueprint, expect, noEvents, refuses, type Allowed, type Journey } from "orthograph";
import { SimulationReverted } from "../things/wallet/errors.js";
import create from "../things/wallet/verbs/create.js";
import importKey from "../things/wallet/verbs/import.js";
import keys from "../things/wallet/verbs/keys.js";
import send from "../things/wallet/verbs/send.js";
import sign from "../things/wallet/verbs/sign.js";

const holder: Allowed = Blueprint.anyone;
/** A CAIP-10 account on an EIP-155 chain. */
const account = /^eip155:[0-9]+:0x[0-9a-fA-F]{40}$/;

const journey: Journey<{ readonly holder: Allowed }> = Blueprint.journey("wallet on the node signer", {
  cast: { holder },
  steps: (s) => [
    s.step("create a key on the node signer", s.holder.run(create, { signer: "node", label: "fresh" }), expect((a) => a.account).toMatch(account), noEvents()),
    s.step("the node signer lists the key it made", s.holder.run(keys, { signer: "node" }), expect((a) => a.count).toBe(1n), noEvents()),
    s.step("import the world's funded key onto the node signer", s.holder.run(importKey, { signer: "node", label: "funded", source: s.world.chain.keys.node }), expect((a) => a.account).toMatch(account), noEvents()),
    s.step("the node signer lists both keys", s.holder.run(keys, { signer: "node" }), expect((a) => a.count).toBe(2n), noEvents()),
    s.step("sign a message with the imported key", s.holder.run(sign, { signer: "node", label: "funded", message: "orthograph wallet journey" }), expect((a) => a.signature).toMatch(/^0x[0-9a-fA-F]{130}$/), noEvents()),
    s.step(
      "send on the chain and see it confirmed",
      s.holder.run(send, { signer: "node", label: "funded", to: s.world.chain.payee, value: 1_000n }),
      expect((a) => a.level).toBe("confirmed"),
      expect((a) => a.nonce).toBe(0n),
      expect((a) => a.transaction).toMatch(/^0x[0-9a-fA-F]{64}$/),
      noEvents(),
    ),
    s.step(
      "a send whose simulation reverts is refused before anything is sent",
      s.holder.run(send, { signer: "node", label: "funded", to: s.world.chain.payee, value: 1_000_000_000_000_000_000_000_000_000_000n }),
      refuses(SimulationReverted),
      noEvents(),
    ),
    s.step(
      "the refused send used no nonce: the next send is the second",
      s.holder.run(send, { signer: "node", label: "funded", to: s.world.chain.payee, value: 2_000n }),
      expect((a) => a.level).toBe("confirmed"),
      expect((a) => a.nonce).toBe(1n),
      noEvents(),
    ),
  ],
});

export default journey;
