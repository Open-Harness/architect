// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { CompanyCreated } from "../blueprint/things/company/events.ts";
import { machine } from "../blueprint/things/company/machine.ts";
import create from "../blueprint/things/company/verbs/create.ts";
import get from "../blueprint/things/company/verbs/get.ts";

export default Blueprint.journey("set up a company", {
  cast: { ada: Blueprint.signedIn, bo: Blueprint.signedIn },
  steps: (s) => [
    s.step(
      "Ada sets up a company and runs it",
      s.ada.run(create, { companyName: "Acme Trading", abbr: "AT", country: "Kenya", defaultCurrency: "USD" }, { request: "acme" }),
      emits(CompanyCreated, { company: s.last.company, owner: s.ada.person }),
      machine.isIn(s.last.company, "active"),
      spans({ present: ["company.create", "company.create.insert"] }),
    ),
    s.step(
      "Bo can't read a company he doesn't run",
      s.bo.run(get, { id: s.last.company }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "reading it back shows what she typed, with her as its owner",
      s.ada.run(get, { id: s.last.company }),
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
