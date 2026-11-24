import { Blueprint, Via } from "orthograph";
import { Proposal } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Proposal, {
  description: "Turn a proposal down.",
  payload: {
    proposal: Proposal.fields.id,
  },
  answer: {},
  move: machine.moves.reject,
  allowed: [Blueprint.signedIn.via(Via.session)],
});
