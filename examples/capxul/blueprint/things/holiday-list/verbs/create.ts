import { Blueprint } from "orthograph";
import { HolidayList } from "../thing.ts";
import { machine } from "../machine.ts";
import { HolidayListEndsBeforeStart } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// HolidayListNameTaken belongs to the rule in ../invariants.ts, and the runtime refuses it. A new list holds no holidays.
export default Blueprint.operation(HolidayList, {
  description: "Start a company's list of days off, between two days.",
  payload: {
    company: HolidayList.fields.company,
    holidayListName: HolidayList.fields.holidayListName,
    fromDate: HolidayList.fields.fromDate,
    toDate: HolidayList.fields.toDate,
  },
  answer: { holidayList: HolidayList.fields.id },
  move: machine.moves.create,
  errors: [HolidayListEndsBeforeStart],
  allowed: [owner.of("company")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
