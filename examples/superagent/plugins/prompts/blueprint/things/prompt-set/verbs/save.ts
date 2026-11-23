import { Blueprint } from "orthograph";
import { PromptSet } from "../thing.ts";
import { StaleRevision } from "@orthograph/superagent/blueprint/things/superagent/errors.ts";

export default Blueprint.operation(PromptSet, {
  description: "Save a new version of the prompts. A save made from an older version is refused, with the current one.",
  payload: {
    superagent: PromptSet.fields.superagent,
    base: Blueprint.uint(32),
    sections: PromptSet.fields.sections,
    skills: PromptSet.fields.skills,
    overrides: PromptSet.fields.overrides,
  },
  answer: {
    revision: PromptSet.fields.revision,
  },
  errors: [StaleRevision],
  allowed: [Blueprint.signedIn],
});
