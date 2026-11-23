import { Blueprint } from "orthograph";
import { Handle } from "../thing.ts";

// S-19 (check 31): one call that writes two handles. No move and no check: the unique field on `name` is the store's to hold.
export default Blueprint.operation(Handle, {
  description: "Rename two handles in one call.",
  payload: { first: Handle.fields.id, second: Handle.fields.id, firstTo: Handle.fields.name, secondTo: Handle.fields.name },
  answer: {},
  allowed: [Blueprint.anyone],
  steps: { one: Blueprint.step.database(), two: Blueprint.step.database() },
});
