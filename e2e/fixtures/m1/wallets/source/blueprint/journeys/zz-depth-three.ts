// Journey-author file (M1.38). The builder of @orthograph/wallets never edits it (AGENTS.md, "Journeys and checks come
// first"); see README.md beside it. One story for a send on a chain whose depth is three (K7 F2): the world's funded key
// is brought in under a label of its own, the send is confirmed (it answers only once three blocks count) and says so as
// a `wallet.send.level` span, and a send the chain would revert is still refused before anything is sent. The file's name
// sorts last on purpose: it shares the world signer with `world.ts`, whose counts and nonces it must not disturb (README).
import { Blueprint, expect, noEvents, refuses, spans, type Allowed, type Journey } from "orthograph";
import { SimulationReverted } from "../things/wallet/errors.js";
import importKey from "../things/wallet/verbs/import.js";
import send from "../things/wallet/verbs/send.js";

const holder: Allowed = Blueprint.anyone;
/** A CAIP-10 account on an EIP-155 chain. */
const account = /^eip155:[0-9]+:0x[0-9a-fA-F]{40}$/;

const journey: Journey<{ readonly holder: Allowed }> = Blueprint.journey("wallet at depth three on the world signer", {
  cast: { holder },
  steps: (s) => [
    s.step("import the world's funded key at depth three", s.holder.run(importKey, { signer: "world", label: "deep", source: s.world.chain.keys.world }), expect((a) => a.account).toMatch(account), noEvents()),
    s.step(
      "send at depth three and see it confirmed after the third block",
      s.holder.run(send, { signer: "world", label: "deep", to: s.world.chain.payee, value: 1_000n }),
      expect((a) => a.level).toBe("confirmed"),
      expect((a) => a.transaction).toMatch(/^0x[0-9a-fA-F]{64}$/),
      spans({ present: ["wallet.send.level"] }),
      noEvents(),
    ),
    s.step(
      "a send whose simulation reverts is refused at depth three before anything is sent",
      s.holder.run(send, { signer: "world", label: "deep", to: s.world.chain.payee, value: 1_000_000_000_000_000_000_000_000_000_000n }),
      refuses(SimulationReverted),
      noEvents(),
    ),
  ],
});

export default journey;
