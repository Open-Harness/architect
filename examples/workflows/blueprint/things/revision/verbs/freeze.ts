import { Blueprint } from "orthograph";
import { Revision } from "../thing.ts";
import { Digest } from "../../../values/words.ts";

export default Blueprint.operation(Revision, {
  description: "Freeze a draft into a revision and say what it hashes to.",
  payload: { revision: Revision.fields.id },
  answer: { digest: Digest },
  allowed: [Blueprint.anyone],
  idempotent: "request", // sent twice with one request, it freezes once
});
