import { Blueprint } from "orthograph";
import { InterviewRound } from "./thing.ts";
import { RoundNameTaken } from "./errors.ts";

// HRMS names a round by its name, so a company has one of each.
export const oneNamePerCompany = Blueprint.invariant.unique([InterviewRound.fields.company, InterviewRound.fields.roundName], {
  refuse: RoundNameTaken,
});
