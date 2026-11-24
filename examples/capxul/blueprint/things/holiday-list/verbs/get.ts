import { Blueprint } from "orthograph";
import { HolidayList } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the list's record.
export default Blueprint.read(HolidayList, {
  by: "id",
  fields: ["company", "holidayListName", "fromDate", "toDate", "totalHolidays", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
