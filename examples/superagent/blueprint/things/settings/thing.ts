import { Blueprint, Schema } from "orthograph";

/** The app's own settings: the variables every executor's environment may carry, and the commands it may never run. One current version, every save kept. */
export const Settings = Blueprint.thing({
  description: "The app's settings: execution variables and blocked commands. One current version, every save kept.",
  fields: {
    id: Blueprint.id("set"),
    revision: Blueprint.uint(32),
    variables: Blueprint.value(Schema.Unknown),
    blocked: Blueprint.value(Schema.Unknown),
  },
  versions: { key: "id" },
  code: "SE",
});
