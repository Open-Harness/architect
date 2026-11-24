import { Blueprint } from "orthograph";
import { JobOpening } from "./thing.ts";

export const JobOpeningCreated = Blueprint.event({
  jobOpening: JobOpening.fields.id,
  company: JobOpening.fields.company,
  vacancies: JobOpening.fields.vacancies,
});
export const JobOpeningClosed = Blueprint.event({ jobOpening: JobOpening.fields.id });
