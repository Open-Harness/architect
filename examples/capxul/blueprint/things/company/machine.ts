import { Blueprint } from "orthograph";
import { Company } from "./thing.ts";
import * as Events from "./events.ts";

// ERPNext's Company has no lifecycle: once made, it is the company.
export const machine = Blueprint.machine(Company, {
  states: ["active"],
  moves: {
    create: { from: [], to: "active", emits: Events.CompanyCreated },
  },
  notFrom: { exit: 40 },
});
