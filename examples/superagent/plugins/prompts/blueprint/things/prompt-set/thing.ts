import { Blueprint, Schema } from "orthograph";

export const PromptSet = Blueprint.thing({
  description: "What a team writes into its agents' prompts: sections, skills and overrides. One current version, every save kept.",
  fields: {
    id: Blueprint.id("pst"),
    superagent: Blueprint.id("sag"),
    revision: Blueprint.uint(32),
    sections: Blueprint.value(Schema.Unknown),
    skills: Blueprint.value(Schema.Unknown),
    overrides: Blueprint.value(Schema.Unknown),
  },
  code: "PR",
  versions: { key: "superagent" },
});
