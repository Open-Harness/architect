// Journey-author file (M1.28, refusals added after M1.29). The builder of @orthograph/wallets never edits it (AGENTS.md,
// "Journeys and checks come first"); see README.md beside it. One story for the browser signer's refusals: what it cannot
// do, it refuses by name and leaves no trace. It makes no key, so it runs before or after the signer's other journey.
import { Blueprint, noEvents, refuses, type Allowed, type Journey } from "orthograph";
import { KeyLocked, NoSuchKey } from "../things/wallet/errors.js";
import importKey from "../things/wallet/verbs/import.js";
import send from "../things/wallet/verbs/send.js";
import sign from "../things/wallet/verbs/sign.js";

const holder: Allowed = Blueprint.anyone;

const journey: Journey<{ readonly holder: Allowed }> = Blueprint.journey("wallet refusals on the browser signer", {
  cast: { holder },
  steps: (s) => [
    s.step("import something that is no account onto the browser signer is refused as locked", s.holder.run(importKey, { signer: "browser", label: "nonsense", source: "not an account" }), refuses(KeyLocked), noEvents()),
    s.step("sign with a label the browser signer does not hold is refused as no such key", s.holder.run(sign, { signer: "browser", label: "nobody", message: "orthograph wallet journey" }), refuses(NoSuchKey), noEvents()),
    s.step("send from a label the browser signer does not hold is refused as no such key", s.holder.run(send, { signer: "browser", label: "nobody", to: s.world.chain.payee, value: 1_000n }), refuses(NoSuchKey), noEvents()),
  ],
});

export default journey;
