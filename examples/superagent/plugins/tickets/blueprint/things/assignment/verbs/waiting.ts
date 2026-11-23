import { Blueprint } from "orthograph";
import { Assignment } from "../thing.ts";

export default Blueprint.read(Assignment, {
  where: ["superagent"],
  only: { state: "pending" },
  order: "oldest",
  first: { why: "person" },   // the line's order (GOAL17-executor-slots, section 2): a person's message, then the rest, each oldest first
  page: 255,
  allowed: [Blueprint.system],
});
