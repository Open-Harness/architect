import { Blueprint } from "orthograph";
import { Proposal } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../treasury/roles.ts";
import { Purpose } from "../../../values/money.ts";

export default Blueprint.operation(Proposal, {
  description: "Propose a budget for someone, and say what it is for.",
  payload: {
    treasury: Proposal.fields.treasury,
    holder: Proposal.fields.holder,
    limit: Proposal.fields.limit,
    purpose: Blueprint.sealed(Purpose), // new
  },
  answer: { proposal: Proposal.fields.id },
  move: machine.moves.propose,
  allowed: [owner.of("treasury")],
});
