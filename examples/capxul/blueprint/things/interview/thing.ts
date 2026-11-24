import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { JobApplicant } from "../job-applicant/thing.ts";
import { InterviewRound } from "../interview-round/thing.ts";
import { Day } from "../../values/employee.ts";
import { TimeOfDay } from "../../values/shift-type.ts";
import { Interviewers } from "../../values/recruitment.ts";

// HRMS's Interview (hrms/hr/doctype/interview): the applicant, the round, the day and its times, and the interviewers
// (its Interview Detail rows, which name Users; Capxul names employees). Its company is the applicant's, copied on
// create. Its summary, rating, resume link and reminders come later (`decisions/CX-recruitment.md`).
export const Interview = Blueprint.thing({
  description: "An applicant's interview at one round of hiring, on a day, between two times.",
  code: "IV",
  fields: {
    id: Blueprint.id("ivw"),
    company: Company.fields.id,
    jobApplicant: JobApplicant.fields.id,
    interviewRound: InterviewRound.fields.id,
    scheduledOn: Day,
    fromTime: TimeOfDay,
    toTime: TimeOfDay,
    interviewers: Interviewers,
  },
});
