import { Blueprint } from "orthograph";
import { Department } from "./thing.ts";
import * as Events from "./events.ts";

// A department is made and kept. ERPNext's `disabled` comes with a later slice.
export const machine = Blueprint.machine(Department, {
  states: ["active"],
  moves: {
    create: { from: [], to: "active", emits: Events.DepartmentCreated },
  },
  notFrom: { exit: 40 },
});
