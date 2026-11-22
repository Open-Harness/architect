import { Blueprint } from "orthograph";
import { Digest } from "../../values/words.ts";

export const Revision = Blueprint.thing({
  description: "A draft frozen into a revision that is put to a vote.",
  fields: { id: Blueprint.id("rev"), digest: Digest },
});
