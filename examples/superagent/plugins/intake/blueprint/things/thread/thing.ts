import { Blueprint, Schema } from "orthograph";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";

export const Thread = Blueprint.thing({
  description: "An issue, a pull request or a Slack thread a superagent listens to. One eval runs on it at a time.",
  fields: {
    id: Blueprint.id("thr"),
    superagent: Superagent.fields.id,
    source: Blueprint.text({ max: 60 }),
    key: Blueprint.text({ max: 200 }),
    channel: Blueprint.value(Schema.Unknown),
  },
  code: "TH",
});
