import { Blueprint } from "orthograph";
import { Proposal } from "../thing.ts";
import { itsMain } from "../../superagent/roles.ts";

export default Blueprint.read(Proposal, {
  where: ["superagent"],
  only: { state: "waiting" },
  order: "oldest",
  page: 25,
  allowed: [Blueprint.signedIn, itsMain.of("superagent")],
});
