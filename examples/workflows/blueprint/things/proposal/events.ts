import { Blueprint } from "orthograph";
import { Proposal } from "./thing.ts";
import { Digest, Person } from "../../values/words.ts";

/**
 * The vote was opened. It arrives from outside the app (the follower, for a chain; `/events/emit` in the check), never
 * from `proposal.open`, so a workflow's `await` has something to wait for.
 */
export const ProposalOpened = Blueprint.event({ proposal: Proposal.fields.id, digest: Digest, openedBy: Person });
