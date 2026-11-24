import { Blueprint, Schema } from "orthograph";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";

export const PromptSet = Blueprint.thing({
  description: "What a team writes into its agents' prompts: sections, skills and overrides. One current version, every save kept.",
  fields: {
    id: Blueprint.id("pst"),
    superagent: Superagent.fields.id,
    revision: Blueprint.uint(32),
    sections: Blueprint.value(Schema.Unknown),
    skills: Blueprint.value(Schema.Unknown),
    overrides: Blueprint.value(Schema.Unknown),
  },
  code: "PR",
  versions: { key: "superagent" },
});
