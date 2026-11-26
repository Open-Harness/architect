import { Blueprint } from "orthograph";
import { JobOpening } from "../thing.ts";
import { machine } from "../machine.ts";
import { OpeningWithoutVacancies } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// The opening's company is its job title's, which the handler copies.
export default Blueprint.operation(JobOpening, {
  description: "Open a job under one of a company's job titles, for some number of people.",
  payload: {
    designation: JobOpening.fields.designation,
    jobTitle: JobOpening.fields.jobTitle,
    vacancies: JobOpening.fields.vacancies,
  },
  answer: { jobOpening: JobOpening.fields.id },
  move: machine.moves.create,
  errors: [OpeningWithoutVacancies],
  allowed: [owner.of("designation.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
