import { Blueprint } from "orthograph";
import { InterviewRound } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the round's record.
export default Blueprint.read(InterviewRound, {
  by: "id",
  fields: ["company", "roundName", "interviewers", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
