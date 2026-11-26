import { Blueprint } from "orthograph";
import { Proposal } from "./thing.ts";

export const ProposalOpened = Blueprint.event({ proposal: Proposal.fields.id, treasury: Proposal.fields.treasury });
export const ProposalApproved = Blueprint.event({ proposal: Proposal.fields.id });
export const ProposalPassed = Blueprint.event({
  proposal: Proposal.fields.id,
  treasury: Proposal.fields.treasury,
  holder: Proposal.fields.holder,
  limit: Proposal.fields.limit,
});
export const ProposalExpired = Blueprint.event({ proposal: Proposal.fields.id });
