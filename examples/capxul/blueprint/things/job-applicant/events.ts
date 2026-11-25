import { Blueprint } from "orthograph";
import { JobApplicant } from "./thing.ts";

export const JobApplicantCreated = Blueprint.event({
  jobApplicant: JobApplicant.fields.id,
  company: JobApplicant.fields.company,
  jobOpening: JobApplicant.fields.jobOpening,
});
export const JobApplicantHeld = Blueprint.event({ jobApplicant: JobApplicant.fields.id });
export const JobApplicantRejected = Blueprint.event({ jobApplicant: JobApplicant.fields.id });
export const JobApplicantAccepted = Blueprint.event({ jobApplicant: JobApplicant.fields.id });
