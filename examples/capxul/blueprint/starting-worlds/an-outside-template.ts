// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { BigDecimal } from "effect";
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/appraisal-template/verbs/create.ts";

/** From a started manual cycle: Ada has made the template Drivers in Acme Logistics, all Safety, rated on Punctuality. */
export default Blueprint.startingWorld("an outside template", {
  from: "a started manual cycle",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(create, {
      company: s.world.otherCompany,
      title: "Drivers",
      kras: [{ kra: s.world.outsideKra, weightage: BigDecimal.fromStringUnsafe("100") }],
      criteria: [{ criteria: s.world.outsideCriteria, weightage: BigDecimal.fromStringUnsafe("100") }],
    }),
  ],
  gives: (s) => ({ outsideTemplate: s.last.appraisalTemplate }),
});
