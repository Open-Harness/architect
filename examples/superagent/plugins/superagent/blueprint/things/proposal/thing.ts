import { Blueprint, Schema } from "orthograph";
import { Superagent } from "../superagent/thing.ts";

export const Proposal = Blueprint.thing({
  description: "What a main agent would change in a superagent's configuration, and why, waiting for a person.",
  fields: {
    id: Blueprint.id("prp"),
    superagent: Superagent.fields.id,
    operation: Blueprint.text({ max: 80 }),
    changes: Blueprint.value(Schema.Unknown),
    why: Blueprint.text({ max: 2000 }),
  },
  code: "PP",
});
