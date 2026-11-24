import { Blueprint } from "orthograph";
import { JobApplicant } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Job Applicant is Open, Replied, Hold, Rejected or Accepted. Replied is an email's mark and comes with mail.
// Accepted and Rejected end it; HRMS sets them from the offer (`update_job_applicant`), which is a second call here
// until #972 lands. An applicant may be turned down from open or hold, with or without an offer.
export const machine = Blueprint.machine(JobApplicant, {
  states: ["open", "hold", "rejected", "accepted"],
  moves: {
    create: { from: [], to: "open", emits: Events.JobApplicantCreated },
    hold: { from: ["open"], to: "hold", emits: Events.JobApplicantHeld },
    reject: { from: ["open", "hold"], to: "rejected", emits: Events.JobApplicantRejected },
    accept: { from: ["open", "hold"], to: "accepted", emits: Events.JobApplicantAccepted },
  },
  notFrom: { exit: 40 },
});
