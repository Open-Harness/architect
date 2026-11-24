import { Blueprint } from "orthograph";
import { HolidayList } from "./thing.ts";
import { HolidayListNameTaken } from "./errors.ts";

// ERPNext names a holiday list by its name, so a company has one list of each name.
export const oneNamePerCompany = Blueprint.invariant.unique([HolidayList.fields.company, HolidayList.fields.holidayListName], {
  refuse: HolidayListNameTaken,
});
