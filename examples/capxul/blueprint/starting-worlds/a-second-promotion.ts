// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/employee-promotion/verbs/create.ts";

/** From a transfer: Ada has drafted Cy's promotion from Engineer to Lead Engineer, from Tuesday 1 December 2026, the world's today. It is still a draft. */
export default Blueprint.startingWorld("a second promotion", {
  from: "a transfer",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(create, { company: s.world.company, employee: s.world.secondEmployee, promotionDate: "2026-12-01", newDesignation: s.world.otherDesignation }),
  ],
  gives: (s) => ({ secondPromotion: s.last.employeePromotion }),
});
