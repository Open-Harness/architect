import { Blueprint, Schema } from "orthograph";
import { Superagent } from "./thing.ts";
import { healthOf } from "../../../src/modules/health/service.ts";

/** One problem a watched record shows: its kind, id and name, and how many times in a row it failed. Names and counts only, never a trigger's text. */
const Problem = Blueprint.value(Schema.Struct({ kind: Schema.String, id: Schema.String, name: Schema.String, failures: Schema.Number }));

/** What is wrong with a superagent: every problem the app declares that points at it. */
export const Health = Blueprint.derive(Superagent, {
  looks: { watched: Blueprint.problems() },
  adds: { problems: Blueprint.list(Problem), more: Blueprint.bool() },
  is: healthOf,
});
