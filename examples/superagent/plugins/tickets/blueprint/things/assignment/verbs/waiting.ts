import { Blueprint } from "orthograph";
import { Assignment } from "../thing.ts";

export default Blueprint.read(Assignment, {
  where: ["superagent"],
  only: { state: "pending" },
  order: "oldest",
  page: 255,
  allowed: [Blueprint.system],
});
