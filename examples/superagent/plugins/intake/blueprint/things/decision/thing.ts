import { Blueprint, Schema } from "orthograph";

export const Decision = Blueprint.thing({
  description: "What the main agent decided for an eval: each item accepted, attached, stopped or ignored.",
  fields: {
    id: Blueprint.id("dec"),
    superagent: Blueprint.id("sag"),
    eval: Blueprint.id("evl"),
    items: Blueprint.value(Schema.Unknown),
  },
  code: "DE",
});
