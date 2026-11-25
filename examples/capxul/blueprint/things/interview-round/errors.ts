import { Blueprint } from "orthograph";
import { Name } from "../../values/company.ts";

// Refusals that depend on data. The machine's own refusal is generated and never written here.
// When several apply, `interview-round.create` refuses RoundInterviewerNotInCompany if any interviewer works for another
// company, then RoundInterviewerHasLeft if any has left, wherever each stands in the list; RoundNameTaken is the rule's,
// refused at commit.
/** HRMS's `round_name` is unique (`autoname: field:round_name`); in Capxul, within a company. */
export class RoundNameTaken extends Blueprint.error({ roundName: Name }, { exit: 41 }) {}
/** Capxul's own rule: an interviewer is an employee of the round's company. HRMS's interviewers are any User. */
export class RoundInterviewerNotInCompany extends Blueprint.error({}, { exit: 42 }) {}
/** Capxul's own rule, as CX-expense-leavers has it: a leaver starts no new record, so isn't put on a new round. */
export class RoundInterviewerHasLeft extends Blueprint.error({}, { exit: 43 }) {}
