// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// S1 of design/decisions/CX-safe.md (#1168): a company's Safe is owned by its founder's own Safe, so its address changes
// with the founder's Safe and its own id, and nothing else. Ada runs Acme Trading and Acme Logistics, Bo runs Bo Ltd,
// and both have recorded their own Safes (`ada and bo have safes`). Expected addresses come from support/safe-address.ts.
import { Blueprint, Via, emits, expect, noEvents, refuses, spans } from "orthograph";
import { CompanySafeRecorded } from "../blueprint/things/safe/events.ts";
import { SafeAlreadyRecorded } from "../blueprint/things/safe/errors.ts";
import { machine } from "../blueprint/things/safe/machine.ts";
import record from "../blueprint/things/safe/verbs/record.ts";
import recordCompany from "../blueprint/things/safe/verbs/record-company.ts";
import get from "../blueprint/things/safe/verbs/get.ts";
import { addressProblem, localBootstrap } from "./support/safe-address.ts";

const ACCOUNT = /^eip155:31337:0x[0-9a-fA-F]{40}$/;

export default Blueprint.journey("safe: a company records its safe", {
  cast: { ada: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "ada and bo have safes",
  steps: (s) => [
    s.step(
      "Ada's first request again is the same call: her one Safe, and nothing new",
      s.ada.run(record, {}, { request: "ada-safe" }),
      expect((a) => [a.safe, a.account]).toEqual([s.world.adaSafe, s.world.adaAccount]),
      noEvents(),
    ),
    s.step(
      "Ada's Safe holds the address she was given, the factory's for her id",
      s.ada.run(get, { id: s.world.adaSafe }),
      expect((a) => [a.kind, a.person, a.account, a.firstOwner, a.owners, a.threshold, a.state]).toEqual([
        "personal",
        s.ada.person,
        s.world.adaAccount,
        localBootstrap,
        [localBootstrap],
        1n,
        "counterfactual",
      ]),
      expect((a) => addressProblem(a)).toBe(""),
      noEvents(),
    ),
    s.step(
      "Bo can't record a Safe for Ada's company",
      s.bo.run(recordCompany, { company: s.world.company }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["safe.record-company.refused"], absent: ["safe.record-company"] }),
    ),
    s.step(
      "nor can Bo's agent",
      s.bo.via(Via.agent).run(recordCompany, { company: s.world.company }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada's agent records Acme Trading's Safe through MCP",
      s.ada.via(Via.agent).run(recordCompany, { company: s.world.company }, { request: "acme-trading-safe" }),
      expect((a) => a.safe).toMatch(/^saf_[0-9a-z]+$/),
      expect((a) => a.account).toMatch(ACCOUNT),
      emits(CompanySafeRecorded, { safe: s.last.safe, company: s.world.company, account: s.last.account }),
      machine.isIn(s.last.safe, "counterfactual"),
      spans({ present: ["safe.record-company", "safe.record-company.load", "safe.record-company.insert"] }),
    ),
    s.step(
      "Bo can't read Acme Trading's Safe",
      s.bo.run(get, { id: s.last.safe }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada reads it: Acme Trading's, owned by her own Safe alone, at the factory's address for that owner and the company's id",
      s.ada.run(get, { id: s.last.safe }),
      expect((a) => [a.kind, a.company, a.person ?? "none", a.firstOwner, a.owners, a.threshold, a.state]).toEqual([
        "company",
        s.world.company,
        "none",
        s.world.adaAccount,
        [s.world.adaAccount],
        1n,
        "counterfactual",
      ]),
      expect((a) => addressProblem(a)).toBe(""),
      noEvents(),
    ),
    s.step(
      "a second Safe for Acme Trading is refused",
      s.ada.run(recordCompany, { company: s.world.company }),
      refuses(SafeAlreadyRecorded, { saltNonce: s.last.saltNonce }),
      noEvents(),
    ),
    s.step(
      "Ada records Acme Logistics' Safe from the command line",
      s.ada.via(Via.key).run(recordCompany, { company: s.world.otherCompany }),
      expect((a) => a.account).toMatch(ACCOUNT),
      emits(CompanySafeRecorded, { safe: s.last.safe, company: s.world.otherCompany, account: s.last.account }),
      machine.isIn(s.last.safe, "counterfactual"),
    ),
    s.step(
      "Acme Logistics' Safe has the same owner, Ada's Safe, and an address of its own",
      s.ada.run(get, { id: s.last.safe }),
      expect((a) => [a.kind, a.company, a.person ?? "none", a.firstOwner, a.owners, a.threshold, a.state]).toEqual([
        "company",
        s.world.otherCompany,
        "none",
        s.world.adaAccount,
        [s.world.adaAccount],
        1n,
        "counterfactual",
      ]),
      expect((a) => addressProblem(a)).toBe(""),
      noEvents(),
    ),
    s.step(
      "Bo records Bo Ltd's Safe",
      s.bo.run(recordCompany, { company: s.world.boCompany }),
      expect((a) => a.account).toMatch(ACCOUNT),
      emits(CompanySafeRecorded, { safe: s.last.safe, company: s.world.boCompany, account: s.last.account }),
      machine.isIn(s.last.safe, "counterfactual"),
    ),
    s.step(
      "Bo Ltd's Safe is owned by Bo's own Safe, not Ada's, and its address follows",
      s.bo.run(get, { id: s.last.safe }),
      expect((a) => [a.kind, a.company, a.person ?? "none", a.firstOwner, a.owners, a.threshold, a.state]).toEqual([
        "company",
        s.world.boCompany,
        "none",
        s.world.boAccount,
        [s.world.boAccount],
        1n,
        "counterfactual",
      ]),
      expect((a) => addressProblem(a)).toBe(""),
      noEvents(),
    ),
    s.step(
      "Bo's own Safe holds the address he was given",
      s.bo.run(get, { id: s.world.boSafe }),
      expect((a) => [a.kind, a.person, a.account, a.firstOwner]).toEqual(["personal", s.bo.person, s.world.boAccount, localBootstrap]),
      expect((a) => addressProblem(a)).toBe(""),
      noEvents(),
    ),
  ],
});
