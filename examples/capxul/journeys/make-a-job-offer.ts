// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
// HRMS moves the applicant in the same call as the offer (`update_job_applicant`). Until a handler can move a second
// thing (#972), the applicant's own accept or reject follows as a second call (`decisions/CX-recruitment.md`).
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { JobOfferAccepted, JobOfferMade, JobOfferRejected } from "../blueprint/things/job-offer/events.ts";
import { OfferAlreadyMade, OfferDesignationNotInCompany } from "../blueprint/things/job-offer/errors.ts";
import { machine as offers } from "../blueprint/things/job-offer/machine.ts";
import { JobApplicantAccepted, JobApplicantCreated, JobApplicantHeld, JobApplicantRejected } from "../blueprint/things/job-applicant/events.ts";
import { OfferNotAccepted } from "../blueprint/things/job-applicant/errors.ts";
import { machine as applicants } from "../blueprint/things/job-applicant/machine.ts";
import createDesignation from "../blueprint/things/designation/verbs/create.ts";
import offer from "../blueprint/things/job-offer/verbs/create.ts";
import acceptOffer from "../blueprint/things/job-offer/verbs/accept.ts";
import rejectOffer from "../blueprint/things/job-offer/verbs/reject.ts";
import getOffer from "../blueprint/things/job-offer/verbs/get.ts";
import apply from "../blueprint/things/job-applicant/verbs/create.ts";
import accept from "../blueprint/things/job-applicant/verbs/accept.ts";
import reject from "../blueprint/things/job-applicant/verbs/reject.ts";
import hold from "../blueprint/things/job-applicant/verbs/hold.ts";
import getApplicant from "../blueprint/things/job-applicant/verbs/get.ts";

export default Blueprint.journey("make a job offer", {
  // Pat applied for Backend Engineer at Acme Trading; Ada runs Acme Trading and Acme Logistics; Bo drives for Acme
  // Logistics; Olga is an engineer at Acme Trading, which has the job titles Engineer and Lead Engineer.
  cast: { ada: owner, bo: Blueprint.signedIn, olga: Blueprint.signedIn },
  starts: "a second job title",
  steps: (s) => [
    s.step(
      "Ada can't accept Pat before any offer",
      s.ada.run(accept, { jobApplicant: s.world.jobApplicant }),
      refuses(OfferNotAccepted),
      noEvents(),
      spans({ absent: ["job-applicant.accept.update"] }),
    ),
    s.step(
      "Bo can't put Pat on hold",
      s.bo.run(hold, { jobApplicant: s.world.jobApplicant }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada puts Pat on hold while she decides",
      s.ada.run(hold, { jobApplicant: s.world.jobApplicant }),
      expect((a) => a.jobApplicant).toBe(s.world.jobApplicant),
      emits(JobApplicantHeld, { jobApplicant: s.world.jobApplicant }),
      applicants.isIn(s.world.jobApplicant, "hold"),
      spans({ present: ["job-applicant.hold", "job-applicant.hold.update"] }),
    ),
    s.step(
      "Bo can't offer Pat a job",
      s.bo.run(offer, { jobApplicant: s.world.jobApplicant, designation: s.world.designation, offerDate: "2026-12-01" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["job-offer.create", "job-offer.create.insert"] }),
    ),
    s.step(
      "nor can Olga",
      s.olga.run(offer, { jobApplicant: s.world.jobApplicant, designation: s.world.designation, offerDate: "2026-12-01" }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada adds a dispatcher's job title to Acme Logistics",
      s.ada.run(createDesignation, { company: s.world.otherCompany, designationName: "Dispatcher" }),
      expect((a) => a.designation).toMatch(/^dsg_[0-9a-z]+$/),
    ),
    s.step(
      "she can't offer it to Pat, who applied to Acme Trading, though she runs both",
      s.ada.run(offer, { jobApplicant: s.world.jobApplicant, designation: s.last.designation, offerDate: "2026-12-01" }),
      refuses(OfferDesignationNotInCompany),
      noEvents(),
      spans({ absent: ["job-offer.create.insert"] }),
    ),
    s.step(
      "Ada offers Pat the job of engineer",
      s.ada.run(offer, { jobApplicant: s.world.jobApplicant, designation: s.world.designation, offerDate: "2026-12-01" }),
      expect((a) => a.jobOffer).toMatch(/^jof_[0-9a-z]+$/),
      emits(JobOfferMade, { jobOffer: s.last.jobOffer, jobApplicant: s.world.jobApplicant }),
      offers.isIn(s.last.jobOffer, "awaiting"),
      spans({ present: ["job-offer.create", "job-offer.create.load", "job-offer.create.insert"] }),
    ),
    s.step(
      "Bo can't read it",
      s.bo.run(getOffer, { id: s.last.jobOffer }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada can't make Pat a second offer while the first awaits",
      s.ada.run(offer, { jobApplicant: s.world.jobApplicant, designation: s.world.designation, offerDate: "2026-12-02" }),
      refuses(OfferAlreadyMade),
      noEvents(),
    ),
    s.step(
      "nor accept Pat while the offer awaits",
      s.ada.run(accept, { jobApplicant: s.world.jobApplicant }),
      refuses(OfferNotAccepted),
      noEvents(),
    ),
    s.step(
      "Bo can't record Pat's answer",
      s.bo.run(acceptOffer, { jobOffer: s.last.jobOffer }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["job-offer.accept", "job-offer.accept.update"] }),
    ),
    s.step(
      "Pat, on hold, accepts the offer",
      s.ada.run(acceptOffer, { jobOffer: s.last.jobOffer }),
      expect((a) => a.jobApplicant).toBe(s.world.jobApplicant),
      emits(JobOfferAccepted, { jobOffer: s.last.jobOffer, jobApplicant: s.world.jobApplicant }),
      offers.isIn(s.last.jobOffer, "accepted"),
      spans({ present: ["job-offer.accept", "job-offer.accept.update"] }),
    ),
    s.step(
      "it can't then be rejected",
      s.ada.run(rejectOffer, { jobOffer: s.last.jobOffer }),
      refuses(offers.notFrom, { state: "accepted" }),
      noEvents(),
    ),
    s.step(
      "nor accepted again",
      s.ada.run(acceptOffer, { jobOffer: s.last.jobOffer }),
      refuses(offers.notFrom, { state: "accepted" }),
      noEvents(),
    ),
    s.step(
      "the offer reads back in Acme Trading, accepted",
      s.ada.run(getOffer, { id: s.last.jobOffer }),
      expect((a) => [a.company, a.jobApplicant, a.designation, a.offerDate, a.state]).toEqual([
        s.world.company,
        s.world.jobApplicant,
        s.world.designation,
        "2026-12-01",
        "accepted",
      ]),
      noEvents(),
    ),
    s.step(
      "Ada can't make Pat another offer now one is accepted",
      s.ada.run(offer, { jobApplicant: s.world.jobApplicant, designation: s.world.designation, offerDate: "2026-12-04" }),
      refuses(OfferAlreadyMade),
      noEvents(),
    ),
    s.step(
      "Bo can't accept Pat",
      s.bo.run(accept, { jobApplicant: s.world.jobApplicant }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada accepts Pat, from hold, now the offer is accepted",
      s.ada.run(accept, { jobApplicant: s.world.jobApplicant }),
      expect((a) => a.jobApplicant).toBe(s.world.jobApplicant),
      emits(JobApplicantAccepted, { jobApplicant: s.world.jobApplicant }),
      applicants.isIn(s.world.jobApplicant, "accepted"),
      spans({ present: ["job-applicant.accept", "job-applicant.accept.load", "job-applicant.accept.update"] }),
    ),
    s.step(
      "Pat reads back accepted",
      s.ada.run(getApplicant, { id: s.world.jobApplicant }),
      expect((a) => [a.company, a.jobOpening, a.applicantName, a.email, a.state]).toEqual([
        s.world.company,
        s.world.jobOpening,
        "Pat Mwangi",
        "pat@example.com",
        "accepted",
      ]),
      noEvents(),
    ),
    s.step(
      "an accepted applicant can't be turned down",
      s.ada.run(reject, { jobApplicant: s.world.jobApplicant }),
      refuses(applicants.notFrom, { state: "accepted" }),
      noEvents(),
    ),
    s.step(
      "nor put on hold",
      s.ada.run(hold, { jobApplicant: s.world.jobApplicant }),
      refuses(applicants.notFrom, { state: "accepted" }),
      noEvents(),
    ),
    s.step(
      "Sam applies for the same job",
      s.ada.run(apply, { jobOpening: s.world.jobOpening, applicantName: "Sam Otieno", email: "sam@example.com" }),
      expect((a) => a.jobApplicant).toMatch(/^jap_[0-9a-z]+$/),
      emits(JobApplicantCreated, { jobApplicant: s.last.jobApplicant, company: s.world.company, jobOpening: s.world.jobOpening }),
    ),
    s.step(
      "Bo can't turn Sam down",
      s.bo.run(reject, { jobApplicant: s.last.jobApplicant }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["job-applicant.reject", "job-applicant.reject.update"] }),
    ),
    s.step(
      "Sam, with no offer, can't be accepted while Pat's is",
      s.ada.run(accept, { jobApplicant: s.last.jobApplicant }),
      refuses(OfferNotAccepted),
      noEvents(),
    ),
    s.step(
      "Ada puts Sam on hold",
      s.ada.run(hold, { jobApplicant: s.last.jobApplicant }),
      expect((a) => a.jobApplicant).toMatch(/^jap_[0-9a-z]+$/),
      emits(JobApplicantHeld, { jobApplicant: s.last.jobApplicant }),
      applicants.isIn(s.last.jobApplicant, "hold"),
    ),
    s.step(
      "and offers Sam Lead Engineer, another of Acme Trading's job titles",
      s.ada.run(offer, { jobApplicant: s.last.jobApplicant, designation: s.world.otherDesignation, offerDate: "2026-12-02" }),
      expect((a) => a.jobOffer).toMatch(/^jof_[0-9a-z]+$/),
      emits(JobOfferMade, { jobOffer: s.last.jobOffer }),
      offers.isIn(s.last.jobOffer, "awaiting"),
    ),
    s.step(
      "Bo can't record Sam's answer",
      s.bo.run(rejectOffer, { jobOffer: s.last.jobOffer }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["job-offer.reject", "job-offer.reject.update"] }),
    ),
    s.step(
      "Sam rejects the offer, which names Sam",
      s.ada.run(rejectOffer, { jobOffer: s.last.jobOffer }),
      // Its answer names Sam: the steps after it accept, turn down and read whoever it names.
      expect((a) => [a.jobOffer, a.jobApplicant].map((x) => /^j(of|ap)_[0-9a-z]+$/.test(x))).toEqual([true, true]),
      emits(JobOfferRejected, { jobOffer: s.last.jobOffer, jobApplicant: s.last.jobApplicant }),
      offers.isIn(s.last.jobOffer, "rejected"),
    ),
    s.step(
      "it can't then be accepted",
      s.ada.run(acceptOffer, { jobOffer: s.last.jobOffer }),
      refuses(offers.notFrom, { state: "rejected" }),
      noEvents(),
    ),
    s.step(
      "Sam's offer reads back in Acme Trading, Lead Engineer, rejected",
      s.ada.run(getOffer, { id: s.last.jobOffer }),
      expect((a) => [a.company, a.designation, a.offerDate, a.state]).toEqual([s.world.company, s.world.otherDesignation, "2026-12-02", "rejected"]),
      noEvents(),
    ),
    s.step(
      "Ada can't accept Sam on a rejected offer",
      s.ada.run(accept, { jobApplicant: s.last.jobApplicant }),
      refuses(OfferNotAccepted),
      noEvents(),
    ),
    s.step(
      "nor make Sam a second offer: HRMS keeps one per applicant, rejected or not",
      s.ada.run(offer, { jobApplicant: s.last.jobApplicant, designation: s.world.designation, offerDate: "2026-12-03" }),
      refuses(OfferAlreadyMade),
      noEvents(),
    ),
    s.step(
      "Ada turns Sam down, from hold",
      s.ada.run(reject, { jobApplicant: s.last.jobApplicant }),
      expect((a) => a.jobApplicant).toMatch(/^jap_[0-9a-z]+$/),
      emits(JobApplicantRejected, { jobApplicant: s.last.jobApplicant }),
      applicants.isIn(s.last.jobApplicant, "rejected"),
    ),
    s.step(
      "a rejected applicant can't be accepted",
      s.ada.run(accept, { jobApplicant: s.last.jobApplicant }),
      refuses(applicants.notFrom, { state: "rejected" }),
      noEvents(),
    ),
    s.step(
      "nor turned down again",
      s.ada.run(reject, { jobApplicant: s.last.jobApplicant }),
      refuses(applicants.notFrom, { state: "rejected" }),
      noEvents(),
    ),
    s.step(
      "Sam reads back rejected",
      s.ada.run(getApplicant, { id: s.last.jobApplicant }),
      expect((a) => [a.company, a.applicantName, a.email, a.state]).toEqual([s.world.company, "Sam Otieno", "sam@example.com", "rejected"]),
      noEvents(),
    ),
  ],
});
