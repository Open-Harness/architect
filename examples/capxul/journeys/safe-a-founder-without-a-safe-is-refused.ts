// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// S1 of design/decisions/CX-safe.md (#1168): a company's Safe is owned by its founder's own Safe, so a company whose
// founder has none can't have one yet. Ada has a Safe; Bo, who runs Bo Ltd, has none (`ada has a safe`).
import { Blueprint, Via, emits, expect, noEvents, refuses } from "orthograph";
import { CompanySafeRecorded, PersonalSafeRecorded } from "../blueprint/things/safe/events.ts";
import { FounderHasNoSafe } from "../blueprint/things/safe/errors.ts";
import { machine } from "../blueprint/things/safe/machine.ts";
import record from "../blueprint/things/safe/verbs/record.ts";
import recordCompany from "../blueprint/things/safe/verbs/record-company.ts";
import get from "../blueprint/things/safe/verbs/get.ts";
import { addressProblem, localBootstrap } from "./support/safe-address.ts";

export default Blueprint.journey("safe: a founder without a safe is refused", {
  cast: { ada: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "ada has a safe",
  steps: (s) => [
    s.step(
      "Bo can't record Bo Ltd's Safe before he has one of his own",
      s.bo.run(recordCompany, { company: s.world.boCompany }),
      refuses(FounderHasNoSafe, { company: s.world.boCompany }),
      noEvents(),
    ),
    s.step(
      "nor can his agent",
      s.bo.via(Via.agent).run(recordCompany, { company: s.world.boCompany }),
      refuses(FounderHasNoSafe, { company: s.world.boCompany }),
      noEvents(),
    ),
    s.step(
      "Ada has a Safe, but Bo Ltd isn't hers to record one for",
      s.ada.run(recordCompany, { company: s.world.boCompany }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Bo records his own Safe from the command line",
      s.bo.via(Via.key).run(record, {}),
      emits(PersonalSafeRecorded, { safe: s.last.safe, person: s.bo.person, account: s.last.account }),
      machine.isIn(s.last.safe, "counterfactual"),
    ),
    s.step(
      "now Bo Ltd's Safe can be recorded",
      s.bo.run(recordCompany, { company: s.world.boCompany }),
      expect((a) => a.safe).toMatch(/^saf_[0-9a-z]+$/),
      emits(CompanySafeRecorded, { safe: s.last.safe, company: s.world.boCompany, account: s.last.account }),
      machine.isIn(s.last.safe, "counterfactual"),
    ),
    s.step(
      // Which Safe owns it is judged against Bo's own in safe-a-company-records-its-safe.ts; here, one owner that is a Safe.
      "it is Bo Ltd's, owned by one Safe, not the bootstrap key, at the factory's address for it",
      s.bo.run(get, { id: s.last.safe }),
      expect((a) => [a.kind, a.company, a.person ?? "none", a.threshold, a.owners, a.state]).toEqual(["company", s.world.boCompany, "none", 1n, [s.last.firstOwner], "counterfactual"]),
      expect((a) => a.firstOwner === localBootstrap).toBe(false),
      expect((a) => addressProblem(a)).toBe(""),
      noEvents(),
    ),
  ],
});
