import { Blueprint } from "orthograph";
import { Revision } from "../revision/thing.ts";
import { Digest } from "../../values/words.ts";

export const Proposal = Blueprint.thing({
  description: "A revision put to the owners' vote.",
  fields: { id: Blueprint.id("prp"), revision: Revision.fields.id, digest: Digest },
});
