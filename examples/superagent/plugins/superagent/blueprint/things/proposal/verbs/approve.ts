import { Blueprint, Via } from "orthograph";
import { Proposal } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Proposal, {
  description: "Apply a proposal. Only a signed-in person, through a session: text that reached a model is never an approval.",
  payload: {
    proposal: Proposal.fields.id,
  },
  answer: {},
  move: machine.moves.approve,
  allowed: [Blueprint.signedIn.via(Via.session)],
});
