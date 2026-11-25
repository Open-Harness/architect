import { Blueprint } from "orthograph";
import { FiscalYear } from "./thing.ts";
import * as Events from "./events.ts";

// A fiscal year is set up and kept. Disabling one, and closing it (Period Closing Voucher), come with closing the books.
export const machine = Blueprint.machine(FiscalYear, {
  states: ["active"],
  moves: { create: { from: [], to: "active", emits: Events.FiscalYearCreated } },
  notFrom: { exit: 40 },
});
