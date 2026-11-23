import { Blueprint } from "orthograph";
import { Organization } from "./thing.js";
import * as Events from "./events.js";

export const machine = Blueprint.machine(Organization, {
  states: ["active"],
  moves: { create: { from: [], to: "active", emits: Events.OrganizationCreated } },
  notFrom: { exit: 20 },
});
