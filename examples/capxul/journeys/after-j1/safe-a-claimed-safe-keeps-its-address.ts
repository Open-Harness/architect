// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// S1 of design/decisions/CX-safe.md (#1168): what a claim answered is what was kept. `both have claimed their safes`
// claimed Ada's by her key (the command line) and Bo's by his agent (MCP), so each read-back holds that way's answer to
// the record and to the address support/safe-address.ts works out. Waits on J1 (README.md beside it).
import { Blueprint, Via, expect, noEvents, refuses } from "orthograph";
import { machine } from "../../blueprint/things/personal-safe/machine.ts";
import claim from "../../blueprint/things/personal-safe/verbs/claim.ts";
import get from "../../blueprint/things/personal-safe/verbs/get.ts";
import { claimProblem } from "../support/safe-address.ts";
import { signing } from "../support/signing.ts";

export default Blueprint.journey("safe: a claimed safe keeps its address", {
  cast: { ada: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "both have claimed their safes",
  steps: (s) => [
    s.step(
      "Ada's Safe holds the account her key was answered, her signer its one owner",
      s.ada.run(get, { id: s.world.adaSafe }),
      expect((a) => [a.person, a.signer, a.account, a.state]).toEqual([s.ada.person, signing(s.ada).signer, s.world.adaAccount, "claimed"]),
      expect((a) => claimProblem(a)).toBe(""),
      noEvents(),
    ),
    s.step(
      "Bo's holds the account his agent was answered, his signer its one owner",
      s.bo.via(Via.agent).run(get, { id: s.world.boSafe }),
      expect((a) => [a.person, a.signer, a.account, a.state]).toEqual([s.bo.person, signing(s.bo).signer, s.world.boAccount, "claimed"]),
      expect((a) => claimProblem(a)).toBe(""),
      noEvents(),
    ),
    s.step("Ada signs her claim text again", signing(s.ada).signs(["Capxul: claim Safe ", s.world.adaSafe, " for ", s.ada.person])),
    s.step(
      "her first claim's request again is the same call: the account she was answered, and nothing new",
      s.ada.via(Via.key).run(claim, { safe: s.world.adaSafe, signer: s.last.signer, proof: s.last.signature }, { request: "ada-claim" }),
      expect((a) => [a.safe, a.account]).toEqual([s.world.adaSafe, s.world.adaAccount]),
      noEvents(),
    ),
    s.step(
      "a new claim, through her agent, is refused: it is claimed",
      s.ada.via(Via.agent).run(claim, { safe: s.world.adaSafe, signer: signing(s.ada).signer, proof: s.last.signature }),
      refuses(machine.notFrom, { state: "claimed" }),
      noEvents(),
    ),
  ],
});
