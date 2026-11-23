import { Blueprint } from "orthograph";
import { Proposal } from "../thing.ts";
import { machine } from "../machine.ts";
import { itsMain } from "../../superagent/roles.ts";

export default Blueprint.operation(Proposal, {
  description: "Record what a main agent would change, and why: nothing changes until a person approves it.",
  payload: { superagent: Proposal.fields.superagent, operation: Proposal.fields.operation, changes: Proposal.fields.changes, why: Proposal.fields.why },
  answer: { proposal: Proposal.fields.id },
  move: machine.moves.propose,
  allowed: [itsMain.of("superagent")],
});
