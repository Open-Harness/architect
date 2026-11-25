// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/employee-promotion/verbs/create.ts";

/** From a second department: Ada has drafted Olga's promotion from Engineer to Lead Engineer, from Monday 7 December 2026. It is still a draft. */
export default Blueprint.startingWorld("a promotion", {
  from: "a second department",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(create, { company: s.world.company, employee: s.world.employee, promotionDate: "2026-12-07", newDesignation: s.world.otherDesignation }),
  ],
  gives: (s) => ({ employeePromotion: s.last.employeePromotion }),
});
