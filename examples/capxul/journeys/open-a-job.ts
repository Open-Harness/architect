// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// `s.last` is the answer of the latest call that succeeded; a refused call leaves it alone.
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/company/roles.ts";
import { JobOpeningClosed, JobOpeningCreated } from "../blueprint/things/job-opening/events.ts";
import { OpeningWithoutVacancies } from "../blueprint/things/job-opening/errors.ts";
import { machine as openings } from "../blueprint/things/job-opening/machine.ts";
import { OpeningClosed } from "../blueprint/things/job-applicant/errors.ts";
import { JobApplicantCreated } from "../blueprint/things/job-applicant/events.ts";
import { machine as applicants } from "../blueprint/things/job-applicant/machine.ts";
import create from "../blueprint/things/job-opening/verbs/create.ts";
import close from "../blueprint/things/job-opening/verbs/close.ts";
import get from "../blueprint/things/job-opening/verbs/get.ts";
import apply from "../blueprint/things/job-applicant/verbs/create.ts";
import readApplicant from "../blueprint/things/job-applicant/verbs/get.ts";

export default Blueprint.journey("open a job", {
  // Ada runs Acme Trading and has opened Backend Engineer for two, where Pat has applied; Olga works there; Bo runs
  // nothing here.
  cast: { ada: owner, olga: Blueprint.signedIn, bo: Blueprint.signedIn },
  starts: "a job applicant",
  steps: (s) => [
    s.step(
      "Bo can't open a job under Ada's job title",
      s.bo.run(create, { designation: s.world.designation, jobTitle: "Data Analyst", vacancies: 1n }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["job-opening.create", "job-opening.create.insert"] }),
    ),
    s.step(
      "nor can Olga, who works there",
      s.olga.run(create, { designation: s.world.designation, jobTitle: "Data Analyst", vacancies: 1n }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Ada can't open a job for nobody",
      s.ada.run(create, { designation: s.world.designation, jobTitle: "Data Analyst", vacancies: 0n }),
      refuses(OpeningWithoutVacancies),
      noEvents(),
      spans({ absent: ["job-opening.create.insert"] }),
    ),
    s.step(
      "Ada opens data analyst, in lower case, for one person",
      s.ada.run(create, { designation: s.world.designation, jobTitle: "data analyst", vacancies: 1n }),
      expect((a) => a.jobOpening).toMatch(/^jop_[0-9a-z]+$/),
      emits(JobOpeningCreated, { jobOpening: s.last.jobOpening, company: s.world.company, vacancies: 1n }),
      openings.isIn(s.last.jobOpening, "open"),
      spans({ present: ["job-opening.create", "job-opening.create.load", "job-opening.create.insert"] }),
    ),
    s.step(
      "Bo can't read it",
      s.bo.run(get, { id: s.last.jobOpening }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
    ),
    s.step(
      "Sam applies for it, with the same email as Pat's: an email may apply again",
      s.ada.run(apply, { jobOpening: s.last.jobOpening, applicantName: "Sam Otieno", email: "pat@example.com" }),
      expect((a) => a.jobApplicant).toMatch(/^jap_[0-9a-z]+$/),
      emits(JobApplicantCreated, { jobApplicant: s.last.jobApplicant, company: s.world.company }),
      applicants.isIn(s.last.jobApplicant, "open"),
    ),
    s.step(
      "Sam reads back in Acme Trading, the opening's company",
      s.ada.run(readApplicant, { id: s.last.jobApplicant }),
      expect((a) => [a.company, a.applicantName, a.email, a.state]).toEqual([s.world.company, "Sam Otieno", "pat@example.com", "open"]),
      noEvents(),
    ),
    s.step(
      "the opening Sam applied for reads back in Acme Trading, the job title's company, as Ada typed it",
      s.ada.run(get, { id: s.last.jobOpening }),
      expect((a) => [a.company, a.designation, a.jobTitle, a.vacancies, a.state]).toEqual([
        s.world.company,
        s.world.designation,
        "data analyst",
        1n,
        "open",
      ]),
      noEvents(),
    ),
    s.step(
      "Backend Engineer reads back for two",
      s.ada.run(get, { id: s.world.jobOpening }),
      expect((a) => [a.jobTitle, a.vacancies, a.state]).toEqual(["Backend Engineer", 2n, "open"]),
      noEvents(),
    ),
    s.step(
      "Olga can't close it",
      s.olga.run(close, { jobOpening: s.world.jobOpening }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["job-opening.close", "job-opening.close.update"] }),
    ),
    s.step(
      "Ada closes it, though it hasn't filled",
      s.ada.run(close, { jobOpening: s.world.jobOpening }),
      expect((a) => a.jobOpening).toBe(s.world.jobOpening),
      emits(JobOpeningClosed, { jobOpening: s.world.jobOpening }),
      openings.isIn(s.world.jobOpening, "closed"),
      spans({ present: ["job-opening.close", "job-opening.close.update"] }),
    ),
    s.step(
      "it reads back closed",
      s.ada.run(get, { id: s.world.jobOpening }),
      expect((a) => [a.company, a.jobTitle, a.vacancies, a.state]).toEqual([s.world.company, "Backend Engineer", 2n, "closed"]),
      noEvents(),
    ),
    s.step(
      "it can't be closed again",
      s.ada.run(close, { jobOpening: s.world.jobOpening }),
      refuses(openings.notFrom, { state: "closed" }),
      noEvents(),
    ),
    s.step(
      "nobody new may apply for it",
      s.ada.run(apply, { jobOpening: s.world.jobOpening, applicantName: "Lee Wanjiru", email: "lee@example.com" }),
      refuses(OpeningClosed),
      noEvents(),
      spans({ absent: ["job-applicant.create.insert"] }),
    ),
    s.step(
      "Pat, who applied before it closed, is still open",
      s.ada.run(readApplicant, { id: s.world.jobApplicant }),
      expect((a) => [a.company, a.jobOpening, a.applicantName, a.email, a.state]).toEqual([
        s.world.company,
        s.world.jobOpening,
        "Pat Mwangi",
        "pat@example.com",
        "open",
      ]),
      noEvents(),
    ),
  ],
});
