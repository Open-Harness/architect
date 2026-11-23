import { Blueprint } from "orthograph";
import { Profile } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Profile, {
  description: "Make a handle's page.",
  payload: { handle: Profile.fields.handle },
  answer: { profile: Profile.fields.id },
  move: machine.moves.make,
  allowed: [Blueprint.anyone],
  steps: { save: Blueprint.step.database() },
});
