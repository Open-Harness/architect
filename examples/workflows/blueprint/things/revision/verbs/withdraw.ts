import { Blueprint } from "orthograph";
import { Revision } from "../thing.ts";

export default Blueprint.operation(Revision, {
  description: "Take the revision back: no proposal was opened for it in time.",
  payload: { revision: Revision.fields.id },
  answer: { withdrawn: Revision.fields.id },
  allowed: [Blueprint.anyone],
  idempotent: "request", // sent twice with one request, it withdraws once
});
