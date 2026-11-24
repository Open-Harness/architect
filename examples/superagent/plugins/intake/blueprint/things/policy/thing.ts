import { Blueprint, Schema } from "orthograph";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";

export const Policy = Blueprint.thing({
  description: "A superagent's rules: who may ask, how, and what it may accept. One current version, every save kept.",
  fields: {
    id: Blueprint.id("pol"),
    superagent: Superagent.fields.id,
    revision: Blueprint.uint(32),
    mode: Blueprint.oneOf(["off", "observe", "auto"]),
    allowed: Blueprint.list(Blueprint.text({ max: 200 })),
    bots: Blueprint.list(Blueprint.text({ max: 200 })),
    admission: Blueprint.value(Schema.Unknown),
    rules: Blueprint.value(Schema.Unknown),
  },
  code: "PO",
  versions: { key: "superagent" },
});
