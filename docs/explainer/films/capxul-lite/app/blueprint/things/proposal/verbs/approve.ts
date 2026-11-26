import { Blueprint } from "orthograph";
import { Proposal } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../treasury/roles.ts";

// Each owner approves once. The contract counts.
export default Blueprint.operation(Proposal, {
  description: "Agree to a proposal, as one of the treasury's owners.",
  payload: { proposal: Proposal.fields.id },
  move: machine.moves.approve,
  allowed: [owner.of("treasury")],
});
