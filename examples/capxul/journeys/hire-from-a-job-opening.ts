// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone. Each step reaches the record
// the one before it made or read, so the story runs from the opening to the hire.
// HRMS moves the applicant with the offer in one call (`update_job_applicant`); here it is a second call until #972.
import { Blueprint, emits, expect, noEvents } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { JobOpeningClosed, JobOpeningCreated } from "../blueprint/things/job-opening/events.ts";
import { JobApplicantAccepted, JobApplicantCreated } from "../blueprint/things/job-applicant/events.ts";
import { InterviewCleared, InterviewScheduled } from "../blueprint/things/interview/events.ts";
import { InterviewFeedbackGiven } from "../blueprint/things/interview-feedback/events.ts";
import { JobOfferAccepted, JobOfferMade } from "../blueprint/things/job-offer/events.ts";
import { EmployeeHired } from "../blueprint/things/employee/events.ts";
import { machine as openings } from "../blueprint/things/job-opening/machine.ts";
import { machine as applicants } from "../blueprint/things/job-applicant/machine.ts";
import { machine as interviews } from "../blueprint/things/interview/machine.ts";
import { machine as offers } from "../blueprint/things/job-offer/machine.ts";
import openJob from "../blueprint/things/job-opening/verbs/create.ts";
import closeJob from "../blueprint/things/job-opening/verbs/close.ts";
import getOpening from "../blueprint/things/job-opening/verbs/get.ts";
import apply from "../blueprint/things/job-applicant/verbs/create.ts";
import acceptApplicant from "../blueprint/things/job-applicant/verbs/accept.ts";
import getApplicant from "../blueprint/things/job-applicant/verbs/get.ts";
import schedule from "../blueprint/things/interview/verbs/create.ts";
import clear from "../blueprint/things/interview/verbs/clear.ts";
import getInterview from "../blueprint/things/interview/verbs/get.ts";
import give from "../blueprint/things/interview-feedback/verbs/give.ts";
import getFeedback from "../blueprint/things/interview-feedback/verbs/get.ts";
import offer from "../blueprint/things/job-offer/verbs/create.ts";
import acceptOffer from "../blueprint/things/job-offer/verbs/accept.ts";
import hire from "../blueprint/things/employee/verbs/hire.ts";

export default Blueprint.journey("hire from a job opening", {
  // Ada runs Acme Trading, where Olga is an engineer and interviews at the round Technical. Pat is looking for work.
  // The world's clock stands at Tuesday 1 December 2026, nine in the morning UTC.
  cast: { ada: owner, olga: Blueprint.signedIn, pat: Blueprint.signedIn },
  starts: "a technical round",
  steps: (s) => [
    s.step(
      "Ada opens the engineering job for one person",
      s.ada.run(openJob, { designation: s.world.designation, jobTitle: "Backend Engineer", vacancies: 1n }),
      expect((a) => a.jobOpening).toMatch(/^jop_[0-9a-z]+$/),
      emits(JobOpeningCreated, { jobOpening: s.last.jobOpening, company: s.world.company, vacancies: 1n }),
      openings.isIn(s.last.jobOpening, "open"),
    ),
    s.step(
      "Pat applies for it",
      s.ada.run(apply, { jobOpening: s.last.jobOpening, applicantName: "Pat Mwangi", email: "pat@example.com" }),
      expect((a) => a.jobApplicant).toMatch(/^jap_[0-9a-z]+$/),
      emits(JobApplicantCreated, { jobApplicant: s.last.jobApplicant, company: s.world.company }),
      applicants.isIn(s.last.jobApplicant, "open"),
    ),
    s.step(
      "Ada schedules Pat's technical interview with Olga, this afternoon from two to three",
      s.ada.run(schedule, {
        jobApplicant: s.last.jobApplicant,
        interviewRound: s.world.interviewRound,
        scheduledOn: "2026-12-01",
        fromTime: "14:00",
        toTime: "15:00",
        interviewers: [s.world.employee],
      }),
      expect((a) => a.interview).toMatch(/^ivw_[0-9a-z]+$/),
      emits(InterviewScheduled, { interview: s.last.interview, interviewRound: s.world.interviewRound }),
      interviews.isIn(s.last.interview, "pending"),
    ),
    s.step(
      "Olga clears Pat the same day",
      s.olga.run(give, { interview: s.last.interview, interviewer: s.world.employee, result: "Cleared" }),
      expect((a) => a.interviewFeedback).toMatch(/^ifb_[0-9a-z]+$/),
      emits(InterviewFeedbackGiven, { interviewFeedback: s.last.interviewFeedback, interviewer: s.world.employee, result: "Cleared" }),
    ),
    s.step(
      "Ada reads Olga's feedback",
      s.ada.run(getFeedback, { id: s.last.interviewFeedback }),
      expect((a) => [a.company, a.interviewer, a.result, a.state]).toEqual([s.world.company, s.world.employee, "Cleared", "given"]),
      noEvents(),
    ),
    s.step(
      "and marks the interview it was on cleared",
      s.ada.run(clear, { interview: s.last.interview }),
      expect((a) => a.interview).toMatch(/^ivw_[0-9a-z]+$/),
      emits(InterviewCleared, { interview: s.last.interview }),
      interviews.isIn(s.last.interview, "cleared"),
    ),
    s.step(
      "the interview reads back cleared, Pat's, at the technical round",
      s.ada.run(getInterview, { id: s.last.interview }),
      expect((a) => [a.company, a.interviewRound, a.scheduledOn, a.fromTime, a.toTime, a.interviewers, a.state]).toEqual([
        s.world.company,
        s.world.interviewRound,
        "2026-12-01",
        "14:00",
        "15:00",
        [s.world.employee],
        "cleared",
      ]),
      noEvents(),
    ),
    s.step(
      "Ada offers its applicant the job of engineer",
      s.ada.run(offer, { jobApplicant: s.last.jobApplicant, designation: s.world.designation, offerDate: "2026-12-01" }),
      expect((a) => a.jobOffer).toMatch(/^jof_[0-9a-z]+$/),
      emits(JobOfferMade, { jobOffer: s.last.jobOffer }),
      offers.isIn(s.last.jobOffer, "awaiting"),
    ),
    s.step(
      "Pat accepts the offer",
      s.ada.run(acceptOffer, { jobOffer: s.last.jobOffer }),
      expect((a) => [a.jobOffer, a.jobApplicant].map((x) => /^j(of|ap)_[0-9a-z]+$/.test(x))).toEqual([true, true]),
      emits(JobOfferAccepted, { jobOffer: s.last.jobOffer, jobApplicant: s.last.jobApplicant }),
      offers.isIn(s.last.jobOffer, "accepted"),
    ),
    s.step(
      "Ada accepts Pat, the offer's applicant",
      s.ada.run(acceptApplicant, { jobApplicant: s.last.jobApplicant }),
      expect((a) => a.jobApplicant).toMatch(/^jap_[0-9a-z]+$/),
      emits(JobApplicantAccepted, { jobApplicant: s.last.jobApplicant }),
      applicants.isIn(s.last.jobApplicant, "accepted"),
    ),
    s.step(
      "Pat reads back accepted, for the opening",
      s.ada.run(getApplicant, { id: s.last.jobApplicant }),
      expect((a) => [a.company, a.applicantName, a.email, a.state]).toEqual([s.world.company, "Pat Mwangi", "pat@example.com", "accepted"]),
      noEvents(),
    ),
    s.step(
      "Ada closes the opening Pat applied for, now it is filled",
      s.ada.run(closeJob, { jobOpening: s.last.jobOpening }),
      expect((a) => a.jobOpening).toMatch(/^jop_[0-9a-z]+$/),
      emits(JobOpeningClosed, { jobOpening: s.last.jobOpening }),
      openings.isIn(s.last.jobOpening, "closed"),
    ),
    s.step(
      "it reads back closed",
      s.ada.run(getOpening, { id: s.last.jobOpening }),
      expect((a) => [a.company, a.designation, a.jobTitle, a.vacancies, a.state]).toEqual([
        s.world.company,
        s.world.designation,
        "Backend Engineer",
        1n,
        "closed",
      ]),
      noEvents(),
    ),
    s.step(
      "Ada hires Pat, joining on 4 January 2027",
      s.ada.run(hire, {
        company: s.world.company,
        person: s.pat.person,
        firstName: "Pat Mwangi",
        gender: "Non-Conforming",
        dateOfBirth: "1997-05-21",
        dateOfJoining: "2027-01-04",
        department: s.world.department,
        designation: s.world.designation,
      }),
      expect((a) => a.employee).toMatch(/^emp_[0-9a-z]+$/),
      emits(EmployeeHired, { employee: s.last.employee, company: s.world.company, person: s.pat.person }),
    ),
  ],
});
