import { Blueprint } from "orthograph";
import { Proposal } from "../thing.ts";
import { Revision } from "../../revision/thing.ts";
import { Digest } from "../../../values/words.ts";

export default Blueprint.operation(Proposal, {
  description: "Put a frozen revision up for the owners' vote. The vote's opening is the event `ProposalOpened`, which comes later.",
  payload: { revision: Revision.fields.id, digest: Digest },
  answer: { proposal: Proposal.fields.id },
  allowed: [Blueprint.anyone],
  idempotent: "request", // sent twice with one request, it puts up one proposal
});
