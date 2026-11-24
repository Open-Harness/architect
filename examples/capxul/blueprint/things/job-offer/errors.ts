import { Blueprint } from "orthograph";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// OfferAlreadyMade is the rule's, refused at commit, after OfferDesignationNotInCompany.
/** Capxul's own refusal: the job title offered belongs to another company. HRMS's designations are site-wide. */
export class OfferDesignationNotInCompany extends Blueprint.error({}, { exit: 41 }) {}
/** HRMS's `validate`: "Job Offer is already for Job Applicant", for any offer not cancelled, accepted and rejected ones too. */
export class OfferAlreadyMade extends Blueprint.error({}, { exit: 42 }) {}
