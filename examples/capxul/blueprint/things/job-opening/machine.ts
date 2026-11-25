import { Blueprint } from "orthograph";
import { JobOpening } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Job Opening is Open or Closed. Capxul's company owner closes it; it never closes by itself when it fills, nor
// on its closing day (`close_expired_job_openings` waits on the closing day, an optional field). Reopening comes later.
export const machine = Blueprint.machine(JobOpening, {
  states: ["open", "closed"],
  moves: {
    create: { from: [], to: "open", emits: Events.JobOpeningCreated },
    close: { from: ["open"], to: "closed", emits: Events.JobOpeningClosed },
  },
  notFrom: { exit: 40 },
});
