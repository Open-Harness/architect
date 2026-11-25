import { Blueprint } from "orthograph";
import { JobOffer } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Job Offer is Awaiting Response, Accepted or Rejected. Its `on_change` moves the applicant in the same call
// (`update_job_applicant`); here the applicant's own accept or reject is a second call until #972 lands.
// Cancelling and amending come later.
export const machine = Blueprint.machine(JobOffer, {
  states: ["awaiting", "accepted", "rejected"],
  moves: {
    create: { from: [], to: "awaiting", emits: Events.JobOfferMade },
    accept: { from: ["awaiting"], to: "accepted", emits: Events.JobOfferAccepted },
    reject: { from: ["awaiting"], to: "rejected", emits: Events.JobOfferRejected },
  },
  notFrom: { exit: 40 },
});
