import { Blueprint, Schema } from "orthograph";
import { Policy } from "../thing.ts";

export default Blueprint.operation(Policy, {
  description: "Every saved version, newest first, each row its number, when, by whom, and the one it was made from.",
  payload: {
    superagent: Policy.fields.superagent,
  },
  answer: {
    entries: Blueprint.list(Blueprint.value(Schema.Struct({ revision: Schema.Number, at: Schema.Number, by: Schema.String, from: Schema.Number }))),
  },
  allowed: [Blueprint.signedIn],
});
