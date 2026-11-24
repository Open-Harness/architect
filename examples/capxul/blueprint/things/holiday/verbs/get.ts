import { Blueprint } from "orthograph";
import { Holiday } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the holiday's record. Its path starts from
// the holiday, so it walks to the list and then to the company (#768).
export default Blueprint.read(Holiday, {
  by: "id",
  fields: ["holidayList", "holidayDate", "description", "state"],
  allowed: [owner.of("holidayList.company")],
  budget: { p95: "50 millis" },
});
