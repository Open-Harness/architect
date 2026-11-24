import { Blueprint } from "orthograph";
import { InterviewFeedback } from "../thing.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the feedback's record.
export default Blueprint.read(InterviewFeedback, {
  by: "id",
  fields: ["company", "interview", "interviewer", "result", "state"],
  allowed: [self.of("interviewer"), owner.of("company")],
  budget: { p95: "50 millis" },
});
