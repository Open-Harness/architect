import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Name } from "../../values/company.ts";
import { Interviewers } from "../../values/recruitment.ts";

// HRMS's Interview Round (hrms/hr/doctype/interview_round): its name and the interviewers it expects. HRMS names a round
// across a site (`autoname: field:round_name`); Capxul's companies are separate organisations (K42, call 10), so each
// keeps its own. Its designation, interview type, expected skill set and rating come later (`decisions/CX-recruitment.md`).
export const InterviewRound = Blueprint.thing({
  description: "A stage of a company's hiring, and the employees who usually interview at it.",
  code: "IR",
  fields: { id: Blueprint.id("irn"), company: Company.fields.id, roundName: Name, interviewers: Interviewers },
});
