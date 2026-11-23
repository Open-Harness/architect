// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { CompanyCreated } from "../blueprint/things/company/events.ts";
import { CompanyAbbrTaken, CompanyNameTaken } from "../blueprint/things/company/errors.ts";
import { machine } from "../blueprint/things/company/machine.ts";
import create from "../blueprint/things/company/verbs/create.ts";
import get from "../blueprint/things/company/verbs/get.ts";

export default Blueprint.journey("companies are kept apart", {
  // Ada runs Acme Trading (AT); Bo is signed in and runs nothing yet.
  cast: { ada: owner, bo: Blueprint.signedIn },
  starts: "a company",
  steps: (s) => [
    s.step(
      "Ada can't give a second company of hers the same name",
      s.ada.run(create, { companyName: "Acme Trading", abbr: "AT2", country: "Kenya", defaultCurrency: "USD" }),
      refuses(CompanyNameTaken, { companyName: "Acme Trading" }),
      noEvents(),
    ),
    s.step(
      "nor the same abbreviation",
      s.ada.run(create, { companyName: "Acme Holdings", abbr: "AT", country: "Kenya", defaultCurrency: "USD" }),
      refuses(CompanyAbbrTaken, { abbr: "AT" }),
      noEvents(),
    ),
    s.step(
      "Bo may use both for his own company, because her names don't bind him",
      s.bo.run(create, { companyName: "Acme Trading", abbr: "AT", country: "Uganda", defaultCurrency: "UGX" }),
      expect((a) => a.company).toMatch(/^com_[0-9a-z]+$/),
      emits(CompanyCreated, { company: s.last.company, owner: s.bo.person }),
      machine.isIn(s.last.company, "active"),
    ),
    s.step(
      "Bo still can't read Ada's",
      s.bo.run(get, { id: s.world.company }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada's company is untouched and still hers",
      s.ada.run(get, { id: s.world.company }),
      expect((a) => [a.companyName, a.abbr, a.country, a.defaultCurrency, a.owner, a.state]).toEqual([
        "Acme Trading",
        "AT",
        "Kenya",
        "USD",
        s.ada.person,
        "active",
      ]),
      noEvents(),
    ),
  ],
});
