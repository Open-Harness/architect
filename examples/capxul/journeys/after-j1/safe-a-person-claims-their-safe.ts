// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// S1 of design/decisions/CX-safe.md (#1168): a person claims their Safe with a key they prove they hold, which works out
// its address. Waits on J1 (README.md beside it). Every refusal first, while the Safe is unclaimed, then the claim.
import { Blueprint, Via, emits, expect, noEvents, refuses, spans } from "orthograph";
import { PersonalSafeClaimed } from "../../blueprint/things/personal-safe/events.ts";
import { SignerNotProven } from "../../blueprint/things/personal-safe/errors.ts";
import { machine } from "../../blueprint/things/personal-safe/machine.ts";
import claim from "../../blueprint/things/personal-safe/verbs/claim.ts";
import get from "../../blueprint/things/personal-safe/verbs/get.ts";
import { claimProblem } from "../support/safe-address.ts";
import { signing } from "../support/signing.ts";

const ACCOUNT = /^eip155:31337:0x[0-9a-fA-F]{40}$/;

export default Blueprint.journey("safe: a person claims their safe", {
  cast: { ada: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "ada and bo have opened their safes",
  steps: (s) => {
    const adaText = ["Capxul: claim Safe ", s.world.adaSafe, " for ", s.ada.person] as const;
    return [
      s.step("Bo signs Ada's claim text with his own key", signing(s.bo).signs(adaText)),
      s.step(
        "a claim naming Ada's key with Bo's proof is refused",
        s.ada.run(claim, { safe: s.world.adaSafe, signer: signing(s.ada).signer, proof: s.last.signature }),
        refuses(SignerNotProven, { signer: signing(s.ada).signer }),
        noEvents(),
        machine.isIn(s.world.adaSafe, "unclaimed"),
      ),
      s.step(
        "Bo can't claim Ada's Safe, even with a proof his own key made",
        s.bo.run(claim, { safe: s.world.adaSafe, signer: signing(s.bo).signer, proof: s.last.signature }),
        refuses(Blueprint.NotAllowed),
        noEvents(),
        machine.isIn(s.world.adaSafe, "unclaimed"),
        spans({ present: ["personal-safe.claim.refused"], absent: ["personal-safe.claim"] }),
      ),
      s.step("Ada signs the claim text for Bo's Safe, not hers", signing(s.ada).signs(["Capxul: claim Safe ", s.world.boSafe, " for ", s.ada.person])),
      s.step(
        "a proof of another Safe's text is refused",
        s.ada.run(claim, { safe: s.world.adaSafe, signer: s.last.signer, proof: s.last.signature }),
        refuses(SignerNotProven, { signer: s.last.signer }),
        noEvents(),
      ),
      s.step("Ada signs her claim text for another person's id", signing(s.ada).signs(["Capxul: claim Safe ", s.world.adaSafe, " for ", s.bo.person])),
      s.step(
        "a proof that names another person is refused",
        s.ada.run(claim, { safe: s.world.adaSafe, signer: s.last.signer, proof: s.last.signature }),
        refuses(SignerNotProven, { signer: s.last.signer }),
        noEvents(),
        machine.isIn(s.world.adaSafe, "unclaimed"),
      ),
      s.step(
        "Ada signs her own claim text with her key",
        signing(s.ada).signs(adaText),
        expect((a) => a.signer).toMatch(/^0x[0-9a-fA-F]{40}$/),
      ),
      s.step(
        "she claims her Safe with it, in her own session",
        s.ada.run(claim, { safe: s.world.adaSafe, signer: s.last.signer, proof: s.last.signature }),
        expect((a) => a.safe).toBe(s.world.adaSafe),
        expect((a) => a.account).toMatch(ACCOUNT),
        emits(PersonalSafeClaimed, { safe: s.world.adaSafe, person: s.ada.person, signer: signing(s.ada).signer, account: s.last.account }),
        machine.isIn(s.world.adaSafe, "claimed"),
        spans({ present: ["personal-safe.claim", "personal-safe.claim.update"] }),
      ),
      s.step(
        "her Safe now has her key as its one owner, at the factory's address for that owner and her salt nonce",
        s.ada.run(get, { id: s.world.adaSafe }),
        expect((a) => [a.person, a.signer, a.state]).toEqual([s.ada.person, signing(s.ada).signer, "claimed"]),
        expect((a) => claimProblem(a)).toBe(""),
        noEvents(),
      ),
      s.step("Ada signs her claim text again", signing(s.ada).signs(adaText)),
      s.step(
        "a second claim is refused: it is claimed",
        s.ada.via(Via.key).run(claim, { safe: s.world.adaSafe, signer: s.last.signer, proof: s.last.signature }),
        refuses(machine.notFrom, { state: "claimed" }),
        noEvents(),
      ),
      s.step(
        "Bo's own Safe is untouched: unclaimed, no address",
        s.bo.run(get, { id: s.world.boSafe }),
        expect((a) => [a.person, a.signer ?? "none", a.account ?? "none", a.state]).toEqual([s.bo.person, "none", "none", "unclaimed"]),
        noEvents(),
      ),
    ];
  },
});
