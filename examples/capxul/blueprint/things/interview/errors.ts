import { Blueprint } from "orthograph";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `interview.create` refuses ApplicantRejected, then RoundNotInCompany, then InterviewEndsBeforeStart,
// then InterviewerNotInCompany if any interviewer works for another company, then InterviewerHasLeft if any has left
// (wherever each stands in the list); InterviewAlreadyScheduled is the rule's, refused at commit.
/** Capxul's own rule (`decisions/CX-recruitment.md`): an applicant already turned down is interviewed no more. */
export class ApplicantRejected extends Blueprint.error({}, { exit: 41 }) {}
/** Capxul's own rule: the round belongs to the applicant's company. HRMS's rounds are site-wide. */
export class RoundNotInCompany extends Blueprint.error({}, { exit: 42 }) {}
/** Capxul's own rule: an interview's to-time is after its from-time. HRMS doesn't check its times. */
export class InterviewEndsBeforeStart extends Blueprint.error({}, { exit: 43 }) {}
/** Capxul's own rule: an interviewer is an employee of the interview's company. HRMS's interviewers are any User. */
export class InterviewerNotInCompany extends Blueprint.error({}, { exit: 44 }) {}
/** Capxul's own rule, as CX-expense-leavers has it: a leaver isn't put on a new interview. */
export class InterviewerHasLeft extends Blueprint.error({}, { exit: 45 }) {}
/** HRMS's `validate_duplicate_interview`: an applicant appears once for a round. */
export class InterviewAlreadyScheduled extends Blueprint.error({}, { exit: 46 }) {}
