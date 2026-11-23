import { Blueprint, Schema } from "orthograph";

export const Source = Blueprint.thing({
  description: "One connection of a superagent to an outside service, with the place it has read to.",
  fields: {
    id: Blueprint.id("src"),
    superagent: Blueprint.id("sag"),
    name: Blueprint.text({ max: 60 }),
    kind: Blueprint.text({ max: 40 }),
    config: Blueprint.value(Schema.Unknown),
    position: Blueprint.text({ max: 500 }),
    failures: Blueprint.uint(32),
    failAfter: Blueprint.uint(32),
  },
  code: "SO",
});
