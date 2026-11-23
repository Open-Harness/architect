import { Blueprint } from "orthograph";
import { Profile } from "../thing.ts";
import { ProfileNotFound } from "../errors.ts";

export default Blueprint.operation(Profile, {
  description: "Find a handle's page, through the rule that makes it one.",
  payload: { handle: Profile.fields.handle },
  answer: { profile: Profile.fields.id },
  errors: [ProfileNotFound],
  allowed: [Blueprint.anyone],
  steps: { look: Blueprint.step.database() },
});
