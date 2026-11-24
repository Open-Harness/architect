import { Blueprint } from "orthograph";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
/** HRMS's `before_insert`: "Cannot create a Job Applicant against a closed Job Opening". */
export class OpeningClosed extends Blueprint.error({}, { exit: 41 }) {}
/**
 * The applicant's offer isn't accepted, or there's none. HRMS's `update_job_applicant` moves the applicant when its
 * offer is accepted; until a handler can move a second thing (#972) the applicant's own move follows as a second call,
 * and refuses without an accepted offer (`decisions/CX-recruitment.md`). This is stricter than HRMS, which can also mark an
 * applicant Accepted from a cleared interview (`update_job_applicant_status`).
 */
export class OfferNotAccepted extends Blueprint.error({}, { exit: 42 }) {}
