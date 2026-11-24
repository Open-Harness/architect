import { Blueprint } from "orthograph";
import { Report } from "./thing.ts";

export const ReportMade = Blueprint.event({ superagent: Report.fields.superagent, report: Report.fields.id, ticket: Report.fields.ticket });
