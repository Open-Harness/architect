// Journey-author file (M1.28, refusals added after M1.29). The builder of @orthograph/wallets never edits it (AGENTS.md,
// "Journeys and checks come first"); see README.md beside it. One story for a signer the wallet does not have: every
// operation refuses it as `KeyLocked`, and nothing is made, signed or sent.
import { Blueprint, noEvents, refuses, type Allowed, type Journey } from "orthograph";
import { KeyLocked } from "../things/wallet/errors.js";
import create from "../things/wallet/verbs/create.js";
import importKey from "../things/wallet/verbs/import.js";
import keys from "../things/wallet/verbs/keys.js";
import send from "../things/wallet/verbs/send.js";
import sign from "../things/wallet/verbs/sign.js";

const holder: Allowed = Blueprint.anyone;

const journey: Journey<{ readonly holder: Allowed }> = Blueprint.journey("wallet refusals on no signer", {
  cast: { holder },
  steps: (s) => [
    s.step("create a key on a signer the wallet does not have is refused as locked", s.holder.run(create, { signer: "nowhere", label: "fresh" }), refuses(KeyLocked), noEvents()),
    s.step("import a key onto a signer the wallet does not have is refused as locked", s.holder.run(importKey, { signer: "nowhere", label: "funded", source: "not a key" }), refuses(KeyLocked), noEvents()),
    s.step("list the keys of a signer the wallet does not have is refused as locked", s.holder.run(keys, { signer: "nowhere" }), refuses(KeyLocked), noEvents()),
    s.step("sign on a signer the wallet does not have is refused as locked", s.holder.run(sign, { signer: "nowhere", label: "funded", message: "orthograph wallet journey" }), refuses(KeyLocked), noEvents()),
    s.step("send on a signer the wallet does not have is refused as locked", s.holder.run(send, { signer: "nowhere", label: "funded", to: s.world.chain.payee, value: 1_000n }), refuses(KeyLocked), noEvents()),
  ],
});

export default journey;
