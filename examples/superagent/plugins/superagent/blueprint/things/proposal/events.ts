import { Blueprint } from "orthograph";
import { Proposal } from "./thing.ts";

export const ProposalRecorded = Blueprint.event({ proposal: Proposal.fields.id, superagent: Proposal.fields.superagent });
export const ProposalApproved = Blueprint.event({ proposal: Proposal.fields.id });
export const ProposalRejected = Blueprint.event({ proposal: Proposal.fields.id });
