import { Blueprint } from "orthograph";
import { InterviewRound } from "./thing.ts";

export const InterviewRoundCreated = Blueprint.event({ interviewRound: InterviewRound.fields.id, company: InterviewRound.fields.company });
