// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import create from "../things/employee-separation/verbs/create.ts";

/** From a second transfer: Ada has started Olga's separation, from her letter of 20 November 2026, beginning on 1 December 2026. It is pending. */
export default Blueprint.startingWorld("a separation", {
  from: "a second transfer",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(create, { company: s.world.company, employee: s.world.employee, resignationLetterDate: "2026-11-20", boardingBeginsOn: "2026-12-01" }),
  ],
  gives: (s) => ({ employeeSeparation: s.last.employeeSeparation }),
});
