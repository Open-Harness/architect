// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// S1 of design/decisions/CX-safe.md (#1168): a person records their own Safe, from the command line (`Via.key`, the
// CLI's way in) and through MCP (`Via.agent`, an agent's), and nothing goes to a chain. What its address must be is
// worked out in support/safe-address.ts from the pinned contracts, never from the answer; tests/safe-address.test.ts
// holds that formula to the canonical factory's own answers.
import { Blueprint, Via, emits, expect, has, noEvents, refuses, spans } from "orthograph";
import { PersonalSafeRecorded } from "../blueprint/things/safe/events.ts";
import { SafeAlreadyRecorded } from "../blueprint/things/safe/errors.ts";
import { machine } from "../blueprint/things/safe/machine.ts";
import record from "../blueprint/things/safe/verbs/record.ts";
import recordCompany from "../blueprint/things/safe/verbs/record-company.ts";
import get from "../blueprint/things/safe/verbs/get.ts";
import { addressProblem, localBootstrap } from "./support/safe-address.ts";

const ACCOUNT = /^eip155:31337:0x[0-9a-fA-F]{40}$/;

export default Blueprint.journey("safe: a person records their safe", {
  cast: { ada: Blueprint.signedIn, bo: Blueprint.signedIn, nobody: Blueprint.system },
  steps: (s) => [
    s.step(
      "the system can't record a Safe: it is nobody, so it has none",
      s.nobody.run(record, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["safe.record.refused"], absent: ["safe.record"] }),
    ),
    s.step(
      "Ada records her own Safe from the command line",
      s.ada.via(Via.key).run(record, {}, { request: "ada-safe" }),
      expect((a) => a.safe).toMatch(/^saf_[0-9a-z]+$/),
      expect((a) => a.account).toMatch(ACCOUNT),
      emits(PersonalSafeRecorded, { safe: s.last.safe, person: s.ada.person, account: s.last.account }),
      machine.isIn(s.last.safe, "counterfactual"),
      spans({ present: ["safe.record", "safe.record.insert"] }),
    ),
    s.step(
      "Bo can't read Ada's Safe",
      s.bo.run(get, { id: s.last.safe }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada reads it back: hers, owned by the bootstrap key alone, at the factory's address for her id",
      s.ada.run(get, { id: s.last.safe }),
      expect((a) => [a.kind, a.person, a.company ?? "none", a.firstOwner, a.owners, a.threshold, a.state]).toEqual([
        "personal",
        s.ada.person,
        "none",
        localBootstrap,
        [localBootstrap],
        1n,
        "counterfactual",
      ]),
      expect((a) => addressProblem(a)).toBe(""),
      noEvents(),
    ),
    s.step(
      "a second record, a new request, is refused: a person has one Safe",
      s.ada.via(Via.key).run(record, {}),
      refuses(SafeAlreadyRecorded, { saltNonce: s.last.saltNonce }),
      noEvents(),
    ),
    s.step(
      "Bo's agent records Bo's own Safe through MCP: his, not Ada's",
      s.bo.via(Via.agent).run(record, {}),
      expect((a) => a.safe).toMatch(/^saf_[0-9a-z]+$/),
      expect((a) => a.account).toMatch(ACCOUNT),
      emits(PersonalSafeRecorded, { safe: s.last.safe, person: s.bo.person, account: s.last.account }),
      machine.isIn(s.last.safe, "counterfactual"),
      spans({ present: ["safe.record", "safe.record.insert"] }),
    ),
    s.step(
      "Ada can't read Bo's",
      s.ada.run(get, { id: s.last.safe }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Bo's agent reads it back: Bo's, at the factory's address for his id, not Ada's",
      s.bo.via(Via.agent).run(get, { id: s.last.safe }),
      expect((a) => [a.kind, a.person, a.company ?? "none", a.firstOwner, a.owners, a.threshold, a.state]).toEqual([
        "personal",
        s.bo.person,
        "none",
        localBootstrap,
        [localBootstrap],
        1n,
        "counterfactual",
      ]),
      expect((a) => addressProblem(a)).toBe(""),
      noEvents(),
    ),
    s.step(
      "an agent's MCP tools hold the Safe's three operations",
      s.bo.via(Via.agent).tools(),
      has(record, recordCompany, get),
    ),
  ],
});
