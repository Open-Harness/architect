import { Blueprint } from "orthograph";
import { Revision } from "../thing.ts";
import { Proposal } from "../../proposal/thing.ts";
import { Person } from "../../../values/words.ts";

/** An instant as text, `2026-12-01T09:00:00.000Z`: what the world's clock read when the revision was linked. */
const Instant = Blueprint.value(Blueprint.text({ max: 32 }));

export default Blueprint.operation(Revision, {
  description: "Link the revision to the proposal that was opened for it, and say when.",
  payload: { revision: Revision.fields.id, proposal: Proposal.fields.id, openedBy: Person },
  answer: { linkedAt: Instant, openedBy: Person },
  allowed: [Blueprint.anyone],
  idempotent: "request", // sent twice with one request, it links once
});
