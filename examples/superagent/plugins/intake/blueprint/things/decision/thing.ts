import { Blueprint, Schema } from "orthograph";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";

export const Decision = Blueprint.thing({
  description: "What the main agent decided for an eval: each item accepted, attached, stopped or ignored.",
  fields: {
    id: Blueprint.id("dec"),
    superagent: Superagent.fields.id,
    eval: Blueprint.id("evl"),
    items: Blueprint.value(Schema.Unknown),
  },
  code: "DE",
});
