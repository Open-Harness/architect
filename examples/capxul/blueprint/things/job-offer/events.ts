import { Blueprint } from "orthograph";
import { JobOffer } from "./thing.ts";

export const JobOfferMade = Blueprint.event({ jobOffer: JobOffer.fields.id, jobApplicant: JobOffer.fields.jobApplicant });
export const JobOfferAccepted = Blueprint.event({ jobOffer: JobOffer.fields.id, jobApplicant: JobOffer.fields.jobApplicant });
export const JobOfferRejected = Blueprint.event({ jobOffer: JobOffer.fields.id, jobApplicant: JobOffer.fields.jobApplicant });
